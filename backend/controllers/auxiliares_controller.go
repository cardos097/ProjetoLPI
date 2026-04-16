package controllers

import (
	"net/http"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type TerapeutaListItem struct {
	UserID              uint    `json:"user_id"`
	Nome                string  `json:"nome"`
	Email               string  `json:"email"`
	Tipo                string  `json:"tipo"`
	AreaClinicaID       uint    `json:"area_clinica_id"`
	AreaClinicaNome     string  `json:"area_clinica_nome"`
	NumeroMecanografico *string `json:"numero_mecanografico"`
}

func GetSalas(c *gin.Context) {
	var salas []models.Sala

	if err := config.DB.
		Preload("AreasClinicas").
		Where("ativa = ?", true).
		Order("nome ASC").
		Find(&salas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, salas)
}

func GetAreasClinicas(c *gin.Context) {
	var areas []models.AreaClinica

	if err := config.DB.Where("ativa = ?", true).Order("nome ASC").Find(&areas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, areas)
}

func GetTerapeutas(c *gin.Context) {
	var terapeutas []models.Terapeuta

	err := config.DB.
		Preload("User").
		Preload("AreaClinica").
		Joins("JOIN users ON users.id = terapeutas.user_id").
		Where("users.active = ?", true).
		Order("users.nome ASC").
		Find(&terapeutas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]TerapeutaListItem, 0, len(terapeutas))
	for _, t := range terapeutas {
		response = append(response, TerapeutaListItem{
			UserID:              t.UserID,
			Nome:                t.User.Nome,
			Email:               t.User.Email,
			Tipo:                t.Tipo,
			AreaClinicaID:       t.AreaClinicaID,
			AreaClinicaNome:     t.AreaClinica.Nome,
			NumeroMecanografico: t.NumeroMecanografico,
		})
	}

	c.JSON(http.StatusOK, response)
}
