package controllers

import (
	"net/http"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UtenteResponse struct {
	ID             uint   `json:"id"`
	Nome           string `json:"nome"`
	Email          string `json:"email"`
	NumeroProcesso string `json:"numero_processo"`
	Telefone       string `json:"telefone"`
	Morada         string `json:"morada"`
}

type UtenteDetailResponse struct {
	ID             uint    `json:"id"`
	Nome           string  `json:"nome"`
	Email          string  `json:"email"`
	NumeroProcesso string  `json:"numero_processo"`
	Telefone       string  `json:"telefone"`
	Morada         string  `json:"morada"`
	DataNascimento *string `json:"data_nascimento"`
}

type UtenteConsultaResponse struct {
	ID            uint   `json:"id"`
	TerapeutaNome string `json:"terapeuta_nome"`
	SalaNome      string `json:"sala_nome"`
	AreaClinica   string `json:"area_clinica"`
	Estado        string `json:"estado"`
	DataInicio    string `json:"data_inicio"`
	DataFim       string `json:"data_fim"`
}

type RegistoClinicoResponse struct {
	ID          uint   `json:"id"`
	ConsultaID  *uint  `json:"consulta_id"`
	AreaClinica string `json:"area_clinica"`
	Conteudo    string `json:"conteudo"`
	CriadoPor   string `json:"criado_por"`
	DataCriacao string `json:"data_criacao"`
}

func GetUtentes(c *gin.Context) {
	var utentes []models.Utente

	err := config.DB.Preload("User").Find(&utentes).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var response []UtenteResponse

	for _, utente := range utentes {
		numeroProcesso := ""
		telefone := ""
		morada := ""

		if utente.NumeroProcesso != nil {
			numeroProcesso = *utente.NumeroProcesso
		}
		if utente.Telefone != nil {
			telefone = *utente.Telefone
		}
		if utente.Morada != nil {
			morada = *utente.Morada
		}

		response = append(response, UtenteResponse{
			ID:             utente.User.ID,
			Nome:           utente.User.Nome,
			Email:          utente.User.Email,
			NumeroProcesso: numeroProcesso,
			Telefone:       telefone,
			Morada:         morada,
		})
	}

	c.JSON(http.StatusOK, response)
}

func GetUtenteByID(c *gin.Context) {
	id := c.Param("id")

	var utente models.Utente

	err := config.DB.
		Preload("User").
		Where("user_id = ?", id).
		First(&utente).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	numeroProcesso := ""
	telefone := ""
	morada := ""
	var dataNascimento *string

	if utente.NumeroProcesso != nil {
		numeroProcesso = *utente.NumeroProcesso
	}
	if utente.Telefone != nil {
		telefone = *utente.Telefone
	}
	if utente.Morada != nil {
		morada = *utente.Morada
	}
	if utente.DataNascimento != nil {
		formatted := utente.DataNascimento.Format("2006-01-02")
		dataNascimento = &formatted
	}

	response := UtenteDetailResponse{
		ID:             utente.User.ID,
		Nome:           utente.User.Nome,
		Email:          utente.User.Email,
		NumeroProcesso: numeroProcesso,
		Telefone:       telefone,
		Morada:         morada,
		DataNascimento: dataNascimento,
	}

	c.JSON(http.StatusOK, response)
}

func GetConsultasByUtenteID(c *gin.Context) {
	id := c.Param("id")

	var consultas []models.Consulta

	err := config.DB.
		Preload("Terapeuta").
		Preload("Sala").
		Preload("AreaClinica").
		Where("utente_id = ?", id).
		Order("data_inicio DESC").
		Find(&consultas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var response []UtenteConsultaResponse

	for _, consulta := range consultas {
		response = append(response, UtenteConsultaResponse{
			ID:            consulta.ID,
			TerapeutaNome: consulta.Terapeuta.Nome,
			SalaNome:      consulta.Sala.Nome,
			AreaClinica:   consulta.AreaClinica.Nome,
			Estado:        consulta.Estado,
			DataInicio:    consulta.DataInicio.Format("2006-01-02 15:04:05"),
			DataFim:       consulta.DataFim.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, response)
}

func GetRegistosClinicosByUtenteID(c *gin.Context) {
	id := c.Param("id")

	var processo models.ProcessoClinico

	err := config.DB.Where("utente_id = ?", id).First(&processo).Error
	if err != nil {
		c.JSON(http.StatusOK, []RegistoClinicoResponse{})
		return
	}

	var registos []models.RegistoClinico

	err = config.DB.
		Preload("AreaClinica").
		Preload("CriadoPor").
		Where("processo_id = ?", processo.ID).
		Order("created_at DESC").
		Find(&registos).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var response []RegistoClinicoResponse

	for _, r := range registos {
		response = append(response, RegistoClinicoResponse{
			ID:          r.ID,
			ConsultaID:  r.ConsultaID,
			AreaClinica: r.AreaClinica.Nome,
			Conteudo:    r.Conteudo,
			CriadoPor:   r.CriadoPor.Nome,
			DataCriacao: r.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, response)
}
