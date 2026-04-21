package controllers

import (
	"bytes"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

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

func GetConsultas(c *gin.Context) {
	var consultas []models.Consulta

	err := config.DB.
		Preload("Utente").
		Preload("Terapeuta").
		Preload("Sala").
		Preload("AreaClinica").
		Find(&consultas).Error

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

	err := config.DB.
		Preload("Utente").
		Preload("Terapeuta").
		Preload("Sala").
		Preload("AreaClinica").
		First(&consulta, id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Consulta não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	c.JSON(http.StatusCreated, consulta)
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

	consulta.DataInicio = dataInicio
	consulta.DataFim = dataFim
	consulta.Estado = "agendada"

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

		consulta.DataInicio = dataInicio
		consulta.DataFim = dataFim
	}

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
