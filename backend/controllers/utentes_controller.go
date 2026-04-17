package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

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



type CreateUtenteRequest struct {
	Nome           string `json:"nome" binding:"required"`
	Email          string `json:"email" binding:"required,email"`
	NumeroProcesso string `json:"numero_processo"`
	Telefone       string `json:"telefone"`
	Morada         string `json:"morada"`
	DataNascimento string `json:"data_nascimento"` // "2000-01-15"
	Password       string `json:"password" binding:"required,min=6"`
}

type UpdateUtenteRequest struct {
	Nome           string `json:"nome"`
	Email          string `json:"email"`
	NumeroProcesso string `json:"numero_processo"`
	Telefone       string `json:"telefone"`
	Morada         string `json:"morada"`
	DataNascimento string `json:"data_nascimento"` // "2000-01-15"
}

func CreateUtente(c *gin.Context) {
	var req CreateUtenteRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	// Criar User
	user := models.User{
		Nome:         req.Nome,
		Email:        req.Email,
		PasswordHash: req.Password,
		Role:         "utente",
		Active:       true,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email já existe"})
		return
	}

	// Criar Utente
	var dataNascimento *time.Time
	if req.DataNascimento != "" {
		parsed, err := time.Parse("2006-01-02", req.DataNascimento)
		if err == nil {
			dataNascimento = &parsed
		}
	}

	numeroProcesso := ""
	if req.NumeroProcesso != "" {
		numeroProcesso = req.NumeroProcesso
	}

	telefone := ""
	if req.Telefone != "" {
		telefone = req.Telefone
	}

	morada := ""
	if req.Morada != "" {
		morada = req.Morada
	}

	utente := models.Utente{
		UserID:         user.ID,
		DataNascimento: dataNascimento,
		NumeroProcesso: &numeroProcesso,
		Telefone:       &telefone,
		Morada:         &morada,
	}

	if err := config.DB.Create(&utente).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Criar ProcessoClinico
	processo := models.ProcessoClinico{
		UtenteID: user.ID,
	}
	config.DB.Create(&processo)

	response := UtenteDetailResponse{
		ID:             user.ID,
		Nome:           user.Nome,
		Email:          user.Email,
		NumeroProcesso: numeroProcesso,
		Telefone:       telefone,
		Morada:         morada,
	}

	c.JSON(http.StatusCreated, response)
}

func UpdateUtente(c *gin.Context) {
	id := c.Param("id")

	var req UpdateUtenteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	// Atualizar User
	user := models.User{}
	if err := config.DB.Where("id = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
		return
	}

	if req.Nome != "" {
		user.Nome = req.Nome
	}
	if req.Email != "" {
		user.Email = req.Email
	}

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email já existe"})
		return
	}

	// Atualizar Utente
	utente := models.Utente{}
	if err := config.DB.Where("user_id = ?", id).First(&utente).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
		return
	}

	if req.NumeroProcesso != "" {
		utente.NumeroProcesso = &req.NumeroProcesso
	}
	if req.Telefone != "" {
		utente.Telefone = &req.Telefone
	}
	if req.Morada != "" {
		utente.Morada = &req.Morada
	}
	if req.DataNascimento != "" {
		parsed, err := time.Parse("2006-01-02", req.DataNascimento)
		if err == nil {
			utente.DataNascimento = &parsed
		}
	}

	if err := config.DB.Save(&utente).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := UtenteDetailResponse{
		ID:    user.ID,
		Nome:  user.Nome,
		Email: user.Email,
	}
	if utente.NumeroProcesso != nil {
		response.NumeroProcesso = *utente.NumeroProcesso
	}
	if utente.Telefone != nil {
		response.Telefone = *utente.Telefone
	}
	if utente.Morada != nil {
		response.Morada = *utente.Morada
	}
	if utente.DataNascimento != nil {
		response.DataNascimento = &[]string{utente.DataNascimento.Format("2006-01-02")}[0]
	}

	c.JSON(http.StatusOK, response)
}

func DeleteUtente(c *gin.Context) {
	id := c.Param("id")

	// Eliminar Utente
	if err := config.DB.Where("user_id = ?", id).Delete(&models.Utente{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Eliminar User
	if err := config.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Utente eliminado com sucesso"})
}

func UploadAvatar(c *gin.Context) {
	id := c.Param("id")

	// Validar que o utente existe
	utente := models.Utente{}
	if err := config.DB.Where("user_id = ?", id).First(&utente).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
		return
	}

	// Fazer upload do ficheiro
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro não fornecido"})
		return
	}

	// Validar tipo de ficheiro (apenas imagens)
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}

	contentType := file.Header.Get("Content-Type")
	if contentType == "" || !allowedTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Apenas imagens (JPEG, PNG, GIF, WebP) são permitidas"})
		return
	}

	// Validar tamanho (máximo 5MB)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro muito grande (máximo 5MB)"})
		return
	}

	// Criar diretório de uploads se não existir
	uploadsDir := "uploads/avatars"
	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar diretório"})
		return
	}

	// Gerar nome único para o ficheiro
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("avatar_%d_%d%s", utente.UserID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	// Salvar ficheiro
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar ficheiro: " + err.Error()})
		return
	}

	// Atualizar URL de foto no banco de dados
	fotoURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	if err := config.DB.Model(&utente).Update("foto_url", fotoURL).Error; err != nil {
		// Deletar ficheiro se falhar a atualizar BD
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar dados: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Avatar enviado com sucesso",
		"foto_url": fotoURL,
	})
}
