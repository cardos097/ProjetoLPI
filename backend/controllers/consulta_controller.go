package controllers

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// consultaMu protege o bloco verificar-disponibilidade + criar/remarcar consulta
// contra race conditions entre pedidos concorrentes.
var consultaMu sync.Mutex

type CreateConsultaRequest struct {
	UtenteID      uint   `json:"utente_id"`
	TerapeutaID   uint   `json:"terapeuta_id"`
	SalaID        uint   `json:"sala_id"`
	AreaClinicaID uint   `json:"area_clinica_id"`
	DataInicio    string `json:"data_inicio"`
	DataFim       string `json:"data_fim"`
}

type RemarcarConsultaRequest struct {
	DataInicio string `json:"data_inicio"`
	DataFim    string `json:"data_fim"`
}

type UpdateConsultaRequest struct {
	TerapeutaID   *uint   `json:"terapeuta_id"`
	SalaID        *uint   `json:"sala_id"`
	AreaClinicaID *uint   `json:"area_clinica_id"`
	DataInicio    *string `json:"data_inicio"`
	DataFim       *string `json:"data_fim"`
}

type ConsultaDetailResponse struct {
	ID              uint   `json:"id"`
	UtenteID        uint   `json:"utente_id"`
	TerapeutaID     uint   `json:"terapeuta_id"`
	SalaID          uint   `json:"sala_id"`
	AreaClinicaID   uint   `json:"area_clinica_id"`
	DataInicio      string `json:"data_inicio"`
	DataFim         string `json:"data_fim"`
	Estado          string `json:"estado"`
	CreatedBy       uint   `json:"created_by"`
	UtenteNome      string `json:"utente_nome"`
	TerapeutaNome   string `json:"terapeuta_nome"`
	SalaNome        string `json:"sala_nome"`
	AreaClinicaNome string `json:"area_clinica_nome"`
}

func parseDateTime(value string) (time.Time, error) {
	layouts := []string{"2006-01-02 15:04:05", "2006-01-02 15:04"}

	for _, layout := range layouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed, nil
		}
	}

	return time.Time{}, errors.New("formato de data inválido")
}

func parseHourMinuteOnDate(baseDate time.Time, hhmm string) (time.Time, error) {
	parsed, err := time.Parse("15:04", hhmm)
	if err != nil {
		return time.Time{}, err
	}

	return time.Date(
		baseDate.Year(),
		baseDate.Month(),
		baseDate.Day(),
		parsed.Hour(),
		parsed.Minute(),
		0,
		0,
		time.UTC,
	), nil
}

func getRandomAvailableSalaID(areaClinicaID uint, dataInicio time.Time, dataFim time.Time) (uint, error) {
	var salas []models.Sala

	err := config.DB.
		Table("salas").
		Joins("JOIN sala_area_clinica sac ON sac.sala_id = salas.id").
		Where("salas.ativa = ?", true).
		Where("sac.area_clinica_id = ?", areaClinicaID).
		Where("NOT EXISTS (SELECT 1 FROM consultas c WHERE c.sala_id = salas.id AND c.estado = 'agendada' AND c.data_inicio < ? AND c.data_fim > ?)", dataFim, dataInicio).
		Find(&salas).Error

	if err != nil {
		return 0, err
	}

	if len(salas) == 0 {
		return 0, errors.New("não existem salas disponíveis para este horário")
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	selected := salas[rng.Intn(len(salas))]

	return selected.ID, nil
}

func GetConsultas(c *gin.Context) {
	var consultas []models.Consulta

	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	query := config.DB.
		Preload("Utente").
		Preload("Terapeuta").
		Preload("Sala").
		Preload("AreaClinica").
		Preload("Documentos")

	switch userRole {
	case "terapeuta":
		var terapeuta models.Terapeuta
		if config.DB.Where("user_id = ? AND tipo = 'aluno'", userID).First(&terapeuta).Error == nil && terapeuta.SupervisorID != nil {
			query = query.Where("terapeuta_id = ? OR terapeuta_id = ?", userID, *terapeuta.SupervisorID)
		} else {
			query = query.Where("terapeuta_id = ?", userID)
		}
	case "utente":
		query = query.Where("utente_id = ?", userID)
	}

	err = query.Find(&consultas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Converter para DTO
	var result []models.ConsultaDTO
	for _, consulta := range consultas {
		result = append(result, *consulta.ConvertToDTO())
	}

	c.JSON(http.StatusOK, result)
}

func GetConsultaByID(c *gin.Context) {
	id := c.Param("id")

	var consulta models.Consulta

	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	err = config.DB.
		Preload("Utente").
		Preload("Terapeuta").
		Preload("Sala").
		Preload("AreaClinica").
		Preload("Documentos").
		First(&consulta, id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if userRole == "terapeuta" && consulta.TerapeutaID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a esta consulta"})
		return
	}

	if userRole == "utente" && consulta.UtenteID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a esta consulta"})
		return
	}

	c.JSON(http.StatusOK, ConsultaDetailResponse{
		ID:              consulta.ID,
		UtenteID:        consulta.UtenteID,
		TerapeutaID:     consulta.TerapeutaID,
		SalaID:          consulta.SalaID,
		AreaClinicaID:   consulta.AreaClinicaID,
		DataInicio:      consulta.DataInicio.Format("2006-01-02 15:04:05"),
		DataFim:         consulta.DataFim.Format("2006-01-02 15:04:05"),
		Estado:          consulta.Estado,
		CreatedBy:       consulta.CreatedBy,
		UtenteNome:      consulta.Utente.Nome,
		TerapeutaNome:   consulta.Terapeuta.Nome,
		SalaNome:        consulta.Sala.Nome,
		AreaClinicaNome: consulta.AreaClinica.Nome,
	})
}

type DisponibilidadeResponse struct {
	SalasIndisponiveis      []uint `json:"salas_indisponiveis"`
	TerapeutasIndisponiveis []uint `json:"terapeutas_indisponiveis"`
}

func CheckDisponibilidade(c *gin.Context) {
	dataInicio := c.Query("data_inicio")
	dataFim := c.Query("data_fim")

	if dataInicio == "" || dataFim == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data_inicio e data_fim são obrigatórios"})
		return
	}

	// Parse das datas
	inicio, err := parseDateTime(dataInicio)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data_inicio inválida"})
		return
	}

	fim, err := parseDateTime(dataFim)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data_fim inválida"})
		return
	}

	// Buscar consultas que sobrepõem o horário (não canceladas)
	var consultas []models.Consulta
	config.DB.Where(
		"(data_inicio < ? AND data_fim > ?) AND estado != ?",
		fim, inicio, "cancelada",
	).Find(&consultas)

	// Extrair IDs de salas e terapeutas indisponíveis
	salasMap := make(map[uint]bool)
	terapeutasMap := make(map[uint]bool)

	for _, consulta := range consultas {
		salasMap[consulta.SalaID] = true
		terapeutasMap[consulta.TerapeutaID] = true
	}

	// Converter para slices
	var salasIndisponiveis []uint
	var terapeutasIndisponiveis []uint

	for salaID := range salasMap {
		salasIndisponiveis = append(salasIndisponiveis, salaID)
	}

	for terapeutaID := range terapeutasMap {
		terapeutasIndisponiveis = append(terapeutasIndisponiveis, terapeutaID)
	}

	c.JSON(http.StatusOK, DisponibilidadeResponse{
		SalasIndisponiveis:      salasIndisponiveis,
		TerapeutasIndisponiveis: terapeutasIndisponiveis,
	})
}

func CreateConsulta(c *gin.Context) {
	var req CreateConsultaRequest

	// Ler o body e fazer log
	bodyBytes, _ := io.ReadAll(c.Request.Body)
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ Erro ao fazer bind JSON: %v", err)
		log.Printf("📋 Body recebido: %s", string(bodyBytes))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	log.Printf("✅ Consulta recebida: %+v", req)

	createdBy, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	// Utentes só podem criar consultas para si próprios.
	if userRole == "utente" {
		req.UtenteID = createdBy
	}

	if req.UtenteID == 0 || req.TerapeutaID == 0 || req.AreaClinicaID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados obrigatórios em falta"})
		return
	}

	dataInicio, err := parseDateTime(req.DataInicio)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de início inválida. Use YYYY-MM-DD HH:MM[:SS]"})
		return
	}

	dataFim, err := parseDateTime(req.DataFim)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de fim inválida. Use YYYY-MM-DD HH:MM[:SS]"})
		return
	}

	if !dataFim.After(dataInicio) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A data de fim deve ser posterior à data de início"})
		return
	}

	if !dataInicio.After(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível marcar consultas no passado"})
		return
	}

	consultaMu.Lock()
	defer consultaMu.Unlock()

	if userRole == "utente" {
		randomSalaID, err := getRandomAvailableSalaID(req.AreaClinicaID, dataInicio, dataFim)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		req.SalaID = randomSalaID
	}

	if req.SalaID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sala obrigatória"})
		return
	}

	consulta := models.Consulta{
		UtenteID:      req.UtenteID,
		TerapeutaID:   req.TerapeutaID,
		SalaID:        req.SalaID,
		AreaClinicaID: req.AreaClinicaID,
		DataInicio:    dataInicio,
		DataFim:       dataFim,
		Estado:        "agendada",
		CreatedBy:     createdBy,
	}

	err = config.DB.Create(&consulta).Error
	if err != nil {
		msg := strings.ToLower(err.Error())

		if strings.Contains(msg, "no_overlap") {
			c.JSON(http.StatusConflict, gin.H{"error": "Horário já ocupado"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ligarTerapeutaResponsavel(req.UtenteID, req.TerapeutaID)

	c.JSON(http.StatusCreated, consulta)
}

// ligarTerapeutaResponsavel define o terapeuta responsável no processo clínico
// do utente na sua primeira consulta. Se o terapeuta for um aluno, liga ao
// professor supervisor. Não substitui uma ligação já existente.
// Também liga o utente ao terapeuta na tabela utentes.
func ligarTerapeutaResponsavel(utenteID, terapeutaID uint) {
	log.Printf("[DEBUG] ligarTerapeutaResponsavel: utenteID=%d, terapeutaID=%d", utenteID, terapeutaID)

	var processo models.ProcessoClinico
	if err := config.DB.Where("utente_id = ?", utenteID).First(&processo).Error; err != nil {
		log.Printf("[DEBUG] Erro ao buscar processo: %v", err)
		return
	}

	if processo.TerapeutaResponsavelID != nil {
		log.Printf("[DEBUG] Terapeuta responsável já atribuído: %d", *processo.TerapeutaResponsavelID)
		return
	}

	responsavelID := terapeutaID

	var terapeuta models.Terapeuta
	if err := config.DB.Where("user_id = ?", terapeutaID).First(&terapeuta).Error; err == nil {
		if terapeuta.Tipo == "aluno" && terapeuta.SupervisorID != nil {
			responsavelID = *terapeuta.SupervisorID
			log.Printf("[DEBUG] Terapeuta é aluno, usando supervisor: %d", responsavelID)
		}
	}

	config.DB.Model(&processo).Update("terapeuta_responsavel_id", responsavelID)
	log.Printf("[DEBUG] Atualizado processo com terapeuta_responsavel_id: %d", responsavelID)

	// Também ligar o utente ao terapeuta na tabela utentes (se for a primeira ligação)
	var utente models.Utente
	if err := config.DB.Where("user_id = ?", utenteID).First(&utente).Error; err == nil {
		log.Printf("[DEBUG] Utente encontrado. TerapeutaID atual: %v", utente.TerapeutaID)
		if utente.TerapeutaID == nil {
			result := config.DB.Model(&utente).Update("terapeuta_id", terapeutaID)
			log.Printf("[DEBUG] Atualizado utente com terapeuta_id: %d (affected rows: %d)", terapeutaID, result.RowsAffected)
		} else {
			log.Printf("[DEBUG] Utente já tem terapeuta atribuído: %d", *utente.TerapeutaID)
		}
	} else {
		log.Printf("[DEBUG] Erro ao buscar utente: %v", err)
	}
}

func CancelConsulta(c *gin.Context) {
	id := c.Param("id")

	var consulta models.Consulta
	err := config.DB.First(&consulta, id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if consulta.Estado == "cancelada" {
		c.JSON(http.StatusConflict, gin.H{"error": "Consulta já está cancelada"})
		return
	}

	consulta.Estado = "cancelada"

	if err := config.DB.Save(&consulta).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Consulta cancelada com sucesso"})
}

func RemarcarConsulta(c *gin.Context) {
	id := c.Param("id")
	var req RemarcarConsultaRequest
	var consulta models.Consulta

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	if err := config.DB.First(&consulta, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	dataInicio, err := parseDateTime(req.DataInicio)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de início inválida. Use YYYY-MM-DD HH:MM[:SS]"})
		return
	}

	dataFim, err := parseDateTime(req.DataFim)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data de fim inválida. Use YYYY-MM-DD HH:MM[:SS]"})
		return
	}

	if !dataFim.After(dataInicio) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A data de fim deve ser posterior à data de início"})
		return
	}

	if !dataInicio.After(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível remarcar consultas para o passado"})
		return
	}

	consulta.DataInicio = dataInicio
	consulta.DataFim = dataFim
	consulta.Estado = "agendada"

	consultaMu.Lock()
	defer consultaMu.Unlock()

	if err := config.DB.Save(&consulta).Error; err != nil {
		msg := strings.ToLower(err.Error())

		if strings.Contains(msg, "no_overlap") {
			c.JSON(http.StatusConflict, gin.H{"error": "Horário já ocupado"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Consulta remarcada com sucesso", "consulta": consulta})
}

func UpdateConsulta(c *gin.Context) {
	id := c.Param("id")
	var req UpdateConsultaRequest
	var consulta models.Consulta

	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	roleValue, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	if err := config.DB.First(&consulta, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if consulta.Estado == "cancelada" {
		c.JSON(http.StatusConflict, gin.H{"error": "Não é possível atualizar uma consulta cancelada"})
		return
	}

	// Verificar permissões: admin/administrativo podem editar tudo, terapeuta só pode editar sala
	isTerapeuta := userRole == "terapeuta"
	isAdmin := userRole == "admin" || userRole == "administrativo"

	if !isAdmin && !isTerapeuta {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para atualizar consultas"})
		return
	}

	// Se é terapeuta, verificar que é o responsável pela consulta
	if isTerapeuta && consulta.TerapeutaID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Você só pode editar suas próprias consultas"})
		return
	}

	// Se é terapeuta, só permitir editar sala
	if isTerapeuta {
		if req.TerapeutaID != nil || req.AreaClinicaID != nil || req.DataInicio != nil || req.DataFim != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Terapeutas só podem alterar a sala da consulta"})
			return
		}
	}

	if req.TerapeutaID != nil {
		consulta.TerapeutaID = *req.TerapeutaID
	}
	if req.SalaID != nil {
		consulta.SalaID = *req.SalaID
	}
	if req.AreaClinicaID != nil {
		consulta.AreaClinicaID = *req.AreaClinicaID
	}

	if req.DataInicio != nil || req.DataFim != nil {
		dataInicio := consulta.DataInicio
		dataFim := consulta.DataFim

		if req.DataInicio != nil {
			parsed, err := parseDateTime(*req.DataInicio)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data de início inválida. Use YYYY-MM-DD HH:MM[:SS]"})
				return
			}
			dataInicio = parsed
		}

		if req.DataFim != nil {
			parsed, err := parseDateTime(*req.DataFim)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data de fim inválida. Use YYYY-MM-DD HH:MM[:SS]"})
				return
			}
			dataFim = parsed
		}

		if !dataFim.After(dataInicio) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "A data de fim deve ser posterior à data de início"})
			return
		}

		if !dataInicio.After(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível atualizar consultas para o passado"})
			return
		}

		consulta.DataInicio = dataInicio
		consulta.DataFim = dataFim
	}

	consultaMu.Lock()
	defer consultaMu.Unlock()

	if err := config.DB.Save(&consulta).Error; err != nil {
		msg := strings.ToLower(err.Error())

		if strings.Contains(msg, "no_overlap") {
			c.JSON(http.StatusConflict, gin.H{"error": "Horário já ocupado"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, consulta)
}

func GetHorariosDisponiveis(c *gin.Context) {
	terapeutaIDParam := c.Param("terapeuta_id")
	terapeutaID, err := strconv.Atoi(terapeutaIDParam)
	if err != nil || terapeutaID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Terapeuta inválido"})
		return
	}

	data := c.Query("data")
	if data == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data é obrigatória (YYYY-MM-DD)"})
		return
	}

	selectedDate, err := time.Parse("2006-01-02", data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida. Use YYYY-MM-DD"})
		return
	}

	duracao := 60
	if duracaoParam := c.Query("duracao"); duracaoParam != "" {
		parsedDuracao, convErr := strconv.Atoi(duracaoParam)
		if convErr != nil || parsedDuracao <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Duração inválida"})
			return
		}
		duracao = parsedDuracao
	}

	areaClinicaID := 0
	if areaParam := c.Query("area_clinica_id"); areaParam != "" {
		parsedArea, convErr := strconv.Atoi(areaParam)
		if convErr != nil || parsedArea <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Área clínica inválida"})
			return
		}
		areaClinicaID = parsedArea
	}

	salaID := 0
	if salaParam := c.Query("sala_id"); salaParam != "" {
		parsedSala, convErr := strconv.Atoi(salaParam)
		if convErr != nil || parsedSala <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Sala inválida"})
			return
		}
		salaID = parsedSala
	}

	dayStart := time.Date(selectedDate.Year(), selectedDate.Month(), selectedDate.Day(), 0, 0, 0, 0, time.UTC)
	dayEnd := dayStart.Add(24 * time.Hour)

	var consultas []models.Consulta
	err = config.DB.
		Where("terapeuta_id = ?", terapeutaID).
		Where("estado <> ?", "cancelada").
		Where("data_inicio < ? AND data_fim > ?", dayEnd, dayStart).
		Find(&consultas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	workStart, _ := parseHourMinuteOnDate(selectedDate, "09:00")
	workEnd, _ := parseHourMinuteOnDate(selectedDate, "18:00")

	hasAvailableSala := func(slotStart time.Time, slotEnd time.Time) (bool, error) {
		if salaID > 0 {
			var count int64
			err := config.DB.
				Table("consultas").
				Where("sala_id = ?", salaID).
				Where("estado = ?", "agendada").
				Where("data_inicio < ? AND data_fim > ?", slotEnd, slotStart).
				Count(&count).Error
			if err != nil {
				return false, err
			}
			return count == 0, nil
		}

		if areaClinicaID <= 0 {
			return true, nil
		}

		var count int64
		err := config.DB.
			Table("salas").
			Joins("JOIN sala_area_clinica sac ON sac.sala_id = salas.id").
			Where("salas.ativa = ?", true).
			Where("sac.area_clinica_id = ?", areaClinicaID).
			Where("NOT EXISTS (SELECT 1 FROM consultas c WHERE c.sala_id = salas.id AND c.estado = 'agendada' AND c.data_inicio < ? AND c.data_fim > ?)", slotEnd, slotStart).
			Count(&count).Error
		if err != nil {
			return false, err
		}

		return count > 0, nil
	}

	var available []string
	for slotStart := workStart; slotStart.Before(workEnd); slotStart = slotStart.Add(1 * time.Hour) {
		slotEnd := slotStart.Add(time.Duration(duracao) * time.Minute)
		if slotEnd.After(workEnd) {
			continue
		}

		overlapped := false
		for _, consulta := range consultas {
			if slotStart.Before(consulta.DataFim) && slotEnd.After(consulta.DataInicio) {
				overlapped = true
				break
			}
		}

		if !overlapped {
			roomAvailable, roomErr := hasAvailableSala(slotStart, slotEnd)
			if roomErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": roomErr.Error()})
				return
			}
			if roomAvailable {
				available = append(available, slotStart.Format("15:04"))
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"terapeuta_id":         terapeutaID,
		"data":                 data,
		"duracao":              duracao,
		"horarios_disponiveis": available,
	})
}

type UpdateEstadoConsultaRequest struct {
	Estado string `json:"estado" binding:"required"`
}

func UpdateEstadoConsulta(c *gin.Context) {
	consultaID := c.Param("id")
	log.Printf("[UpdateEstadoConsulta] Iniciando atualização de consulta ID: %s", consultaID)

	userID, err := getAuthenticatedUserID(c)
	if err != nil {
		log.Printf("[UpdateEstadoConsulta] Erro ao obter userID: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[UpdateEstadoConsulta] UserID obtido: %d", userID)

	roleValue, exists := c.Get("userRole")
	if !exists {
		log.Printf("[UpdateEstadoConsulta] Role não encontrada no contexto")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role não encontrada no contexto"})
		return
	}

	userRole, ok := roleValue.(string)
	if !ok || userRole == "" {
		log.Printf("[UpdateEstadoConsulta] Role inválida no contexto: %v", roleValue)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role inválida no contexto"})
		return
	}
	log.Printf("[UpdateEstadoConsulta] UserRole obtido: %s", userRole)

	var req UpdateEstadoConsultaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[UpdateEstadoConsulta] Erro ao fazer bind do request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Estado é obrigatório"})
		return
	}
	log.Printf("[UpdateEstadoConsulta] Novo estado solicitado: %s", req.Estado)

	// Validar estado
	estadosValidos := map[string]bool{
		"realizada":            true,
		"cancelada":            true,
		"faltou_injustificada": true,
		"faltou_justificada":   true,
	}

	if !estadosValidos[req.Estado] {
		log.Printf("[UpdateEstadoConsulta] Estado inválido: %s", req.Estado)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Estado inválido. Valores permitidos: realizada, cancelada, faltou_injustificada, faltou_justificada"})
		return
	}
	log.Printf("[UpdateEstadoConsulta] Estado validado com sucesso")

	var consulta models.Consulta
	if err := config.DB.First(&consulta, consultaID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("[UpdateEstadoConsulta] Consulta não encontrada: %s", consultaID)
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}
		log.Printf("[UpdateEstadoConsulta] Erro ao buscar consulta: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[UpdateEstadoConsulta] Consulta encontrada. ID: %d, TerapeutaID: %d, Estado atual: %s", consulta.ID, consulta.TerapeutaID, consulta.Estado)

	// Verificar permissões: admin, administrativo ou o terapeuta da consulta
	if userRole != "admin" && userRole != "administrativo" {
		if userRole == "terapeuta" {
			if consulta.TerapeutaID != userID {
				log.Printf("[UpdateEstadoConsulta] Permissão negada: terapeuta %d não é responsável pela consulta (terapeuta_id: %d)", userID, consulta.TerapeutaID)
				c.JSON(http.StatusForbidden, gin.H{"error": "Você só pode atualizar o estado das suas próprias consultas"})
				return
			}
			log.Printf("[UpdateEstadoConsulta] Permissão de terapeuta validada")
		} else {
			log.Printf("[UpdateEstadoConsulta] Permissão negada: role %s não tem permissão", userRole)
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para atualizar o estado da consulta"})
			return
		}
	} else {
		log.Printf("[UpdateEstadoConsulta] Permissão concedida: role %s", userRole)
	}

	// Não permitir atualizar se já está cancelada
	if consulta.Estado == "cancelada" && req.Estado != "cancelada" {
		log.Printf("[UpdateEstadoConsulta] Erro: tentativa de atualizar consulta cancelada")
		c.JSON(http.StatusConflict, gin.H{"error": "Não é possível atualizar uma consulta já cancelada"})
		return
	}

	// Atualizar estado
	consulta.Estado = req.Estado
	log.Printf("[UpdateEstadoConsulta] Atualizando estado de %s para %s", consulta.Estado, req.Estado)

	if err := config.DB.Save(&consulta).Error; err != nil {
		log.Printf("[UpdateEstadoConsulta] Erro ao guardar consulta: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[UpdateEstadoConsulta] Consulta atualizada com sucesso! ID: %d, novo estado: %s", consulta.ID, consulta.Estado)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Estado da consulta atualizado com sucesso",
		"consulta_id":  consulta.ID,
		"novo_estado":  consulta.Estado,
		"utente_id":    consulta.UtenteID,
		"terapeuta_id": consulta.TerapeutaID,
		"data_inicio":  consulta.DataInicio.Format("2006-01-02 15:04:05"),
		"data_fim":     consulta.DataFim.Format("2006-01-02 15:04:05"),
	})
}

// UploadPdfConsulta uploads a PDF document to a consultation
func UploadPdfConsulta(c *gin.Context) {
	consultaIDStr := c.Param("id")
	consultaID, err := strconv.ParseUint(consultaIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID da consulta inválido"})
		return
	}

	// Verificar se a consulta existe
	var consulta models.Consulta
	if err := config.DB.First(&consulta, consultaID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
		return
	}

	// Obter ficheiro do formulário
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro não fornecido"})
		return
	}

	// Validar que é PDF
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Apenas ficheiros PDF são permitidos"})
		return
	}

	// Validar Content-Type
	if file.Header.Get("Content-Type") != "application/pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de ficheiro inválido: apenas application/pdf é permitido"})
		return
	}

	// Validar tamanho (máximo 50MB)
	const maxSize = 50 * 1024 * 1024
	if file.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro demasiado grande (máximo 50MB)"})
		return
	}

	// Gerar nome único para o ficheiro
	timestamp := time.Now().Unix()
	randNum := rand.Intn(10000)
	uniqueFilename := fmt.Sprintf("%d-%d-%s", consultaID, timestamp, file.Filename)
	newFilename := fmt.Sprintf("%d_%s", randNum, uniqueFilename)

	// Guardar ficheiro na pasta uploads
	uploadPath := fmt.Sprintf("./uploads/%s", newFilename)
	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		log.Printf("Erro ao guardar ficheiro: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar ficheiro"})
		return
	}

	// Obter user ID do contexto
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User não identificado"})
		return
	}

	// Guardar informações do documento na BD
	documento := models.DocumentoConsulta{
		ConsultaID:  uint(consultaID),
		ArquivoURL:  fmt.Sprintf("/uploads/%s", newFilename),
		NomeArquivo: file.Filename,
		UploadedBy:  userID.(uint),
		CreatedAt:   time.Now(),
	}

	if err := config.DB.Create(&documento).Error; err != nil {
		log.Printf("Erro ao guardar documento na BD: %v", err)
		// Remover o ficheiro se não conseguir guardar na BD
		_, _ = os.Stat(uploadPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao registar documento"})
		return
	}

	log.Printf("PDF carregado com sucesso: %s para consulta %d", newFilename, consultaID)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Ficheiro carregado com sucesso",
		"documento_id": documento.ID,
		"consulta_id":  consultaID,
		"arquivo_url":  documento.ArquivoURL,
		"nome_arquivo": documento.NomeArquivo,
		"created_at":   documento.CreatedAt.Format("2006-01-02 15:04:05"),
	})
}
