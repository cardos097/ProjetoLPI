package controllers

import (
	"errors"
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

	c.JSON(http.StatusOK, consultas)
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

	c.JSON(http.StatusOK, consulta)
}

func CreateConsulta(c *gin.Context) {
	var req CreateConsultaRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	userIDValue, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilizador autenticado não encontrado"})
		return
	}

	createdBy, ok := userIDValue.(uint)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Utilizador autenticado inválido"})
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
