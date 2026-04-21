package controllers

import (
	"errors"
	"math/rand"
	"net/http"
	"strconv"
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
		Preload("AreaClinica")

	switch userRole {
	case "terapeuta":
		query = query.Where("terapeuta_id = ?", userID)
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

func CreateConsulta(c *gin.Context) {
	var req CreateConsultaRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

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
