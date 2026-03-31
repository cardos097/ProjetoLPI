package controllers

import (
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
	CreatedBy     uint   `json:"created_by"`
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

func CreateConsulta(c *gin.Context) {
	var req CreateConsultaRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	dataInicio, _ := time.Parse("2006-01-02 15:04:05", req.DataInicio)
	dataFim, _ := time.Parse("2006-01-02 15:04:05", req.DataFim)

	consulta := models.Consulta{
		UtenteID:      req.UtenteID,
		TerapeutaID:   req.TerapeutaID,
		SalaID:        req.SalaID,
		AreaClinicaID: req.AreaClinicaID,
		DataInicio:    dataInicio,
		DataFim:       dataFim,
		Estado:        "agendada",
		CreatedBy:     req.CreatedBy,
	}

	err := config.DB.Create(&consulta).Error
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
	}

	consulta.Estado = "cancelada"
	config.DB.Save(&consulta)

	c.JSON(http.StatusOK, gin.H{"message": "Cancelada"})
}
