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
	"golang.org/x/crypto/bcrypt"
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
	ID                       uint    `json:"id"`
	Nome                     string  `json:"nome"`
	Email                    string  `json:"email"`
	NumeroProcesso           string  `json:"numero_processo"`
	Telefone                 string  `json:"telefone"`
	Morada                   string  `json:"morada"`
	DataNascimento           *string `json:"data_nascimento"`
	FotoURL                  *string `json:"foto_url"`
	TerapeutaResponsavelID   *uint   `json:"terapeuta_responsavel_id"`
	TerapeutaResponsavelNome string  `json:"terapeuta_responsavel_nome"`
	TerapeutaID              *uint   `json:"terapeuta_id"`
	TerapeutaNome            string  `json:"terapeuta_nome"`
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
		Preload("Terapeuta").
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
		FotoURL:        utente.FotoURL,
		TerapeutaID:    utente.TerapeutaID,
	}

	if utente.Terapeuta != nil {
		response.TerapeutaNome = utente.Terapeuta.Nome
	}

	var processo models.ProcessoClinico
	if err := config.DB.Preload("TerapeutaResponsavel").Where("utente_id = ?", id).First(&processo).Error; err == nil {
		response.TerapeutaResponsavelID = processo.TerapeutaResponsavelID
		if processo.TerapeutaResponsavel != nil {
			response.TerapeutaResponsavelNome = processo.TerapeutaResponsavel.Nome
		}
	}

	c.JSON(http.StatusOK, response)
}

func GetConsultasByUtenteID(c *gin.Context) {
	id := c.Param("id")

	if roleValue, exists := c.Get("userRole"); exists {
		if userRole, ok := roleValue.(string); ok && userRole == "utente" {
			authenticatedID, err := getAuthenticatedUserID(c)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
				return
			}

			if fmt.Sprintf("%d", authenticatedID) != id {
				c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder às consultas deste utente"})
				return
			}
		}
	}

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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao processar password"})
		return
	}

	// Criar User
	user := models.User{
		Nome:         req.Nome,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
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
	if err := config.DB.Create(&processo).Error; err != nil {
		fmt.Printf("[ERROR] Ao criar ProcessoClinico para utente %d: %v\n", user.ID, err)
	} else {
		fmt.Printf("[DEBUG] ProcessoClinico criado para utente %d\n", user.ID)
	}

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

	// Verificar/Criar Utente se não existir
	utente := models.Utente{}
	err := config.DB.Where("user_id = ?", id).First(&utente).Error

	if err != nil && err.Error() == "record not found" {
		// Se não existe, criar novo registo utente
		utente = models.Utente{
			UserID: user.ID,
		}
		if err := config.DB.Create(&utente).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar perfil de utente"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar utente"})
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
	response.FotoURL = utente.FotoURL

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

	// Validar que o utilizador existe
	user := models.User{}
	if err := config.DB.Where("id = ?", id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilizador não encontrado"})
		return
	}

	// Verificar/Criar Utente se não existir
	utente := models.Utente{}
	err := config.DB.Where("user_id = ?", id).First(&utente).Error
	if err != nil && err.Error() == "record not found" {
		// Se não existe, criar novo registo utente
		utente = models.Utente{
			UserID: user.ID,
		}
		if err := config.DB.Create(&utente).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar perfil de utente"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar utente"})
		return
	}

	// Fazer upload do ficheiro
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro não fornecido"})
		return
	}

	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
	}

	contentType := file.Header.Get("Content-Type")
	if contentType == "" || !allowedTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Apenas imagens (JPEG, PNG) são permitidas"})
		return
	}

	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ficheiro muito grande (máximo 5MB)"})
		return
	}

	uploadsDir := "uploads/avatars"
	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar diretório"})
		return
	}

	ext := ".jpeg"
	if contentType == "image/png" {
		ext = ".png"
	}
	filename := fmt.Sprintf("avatar_%d_%d%s", utente.UserID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadsDir, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar ficheiro: " + err.Error()})
		return
	}

	fotoURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	if err := config.DB.Model(&utente).Update("foto_url", fotoURL).Error; err != nil {
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao guardar dados: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Avatar enviado com sucesso",
		"foto_url": fotoURL,
	})
}

type UpdateTerapeutaUtenteRequest struct {
	TerapeutaID *uint `json:"terapeuta_id"`
}

func UpdateTerapeutaUtente(c *gin.Context) {
	utenteID := c.Param("id")

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

	// Verificar permissões: admin, administrativo, ou o terapeuta ligado
	if userRole != "admin" && userRole != "administrativo" {
		if userRole == "terapeuta" {
			// Um terapeuta só pode alterar o seu próprio utente
			var utente models.Utente
			if err := config.DB.Where("user_id = ?", utenteID).First(&utente).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
				return
			}

			if utente.TerapeutaID != nil && *utente.TerapeutaID != userID {
				c.JSON(http.StatusForbidden, gin.H{"error": "Só pode alterar utentes do seu responsabilidade"})
				return
			}
		} else {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para alterar o terapeuta"})
			return
		}
	}

	var req UpdateTerapeutaUtenteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	// Verificar se o utente existe
	var utente models.Utente
	if err := config.DB.Where("user_id = ?", utenteID).First(&utente).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utente não encontrado"})
		return
	}

	// Se está a atribuir um novo terapeuta, verificar se é um terapeuta válido
	if req.TerapeutaID != nil {
		var terapeuta models.Terapeuta
		if err := config.DB.Preload("User").Where("user_id = ?", *req.TerapeutaID).First(&terapeuta).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Terapeuta não encontrado"})
			return
		}

		if !terapeuta.User.Active {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Terapeuta inativo"})
			return
		}
	}

	// Atualizar o terapeuta do utente
	if err := config.DB.Model(&utente).Update("terapeuta_id", req.TerapeutaID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar terapeuta"})
		return
	}

	// Recarregar o utente com o terapeuta atualizado
	if err := config.DB.Preload("User").Preload("Terapeuta").Where("user_id = ?", utenteID).First(&utente).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := UtenteDetailResponse{
		ID:    utente.User.ID,
		Nome:  utente.User.Nome,
		Email: utente.User.Email,
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
		formatted := utente.DataNascimento.Format("2006-01-02")
		response.DataNascimento = &formatted
	}

	response.FotoURL = utente.FotoURL
	response.TerapeutaID = utente.TerapeutaID
	if utente.Terapeuta != nil {
		response.TerapeutaNome = utente.Terapeuta.Nome
	}

	c.JSON(http.StatusOK, response)
}
