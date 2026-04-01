package controllers

import (
	"clinica-backend/config"
	"clinica-backend/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type CreateAssiduidadeRequest struct {
	UtenteID   uint   `json:"utente_id"`
	Data       string `json:"data"`
	Estado     string `json:"estado"`
	Observacao string `json:"observacao"`
	CreatedBy  uint   `json:"created_by"`
}

func GetAssiduidade(c *gin.Context) {
	var registos []models.Assiduidade

	if err := config.DB.Order("id DESC").Find(&registos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, registos)
}

func CreateAssiduidade(c *gin.Context) {
	var req CreateAssiduidadeRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	data, err := time.Parse("2006-01-02", req.Data)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida. Use o formato YYYY-MM-DD"})
		return
	}

	reg := models.Assiduidade{
		UtenteID:   req.UtenteID,
		Data:       data,
		Estado:     req.Estado,
		Observacao: req.Observacao,
		CreatedBy:  req.CreatedBy,
	}

	if err := config.DB.Create(&reg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, reg)
}
