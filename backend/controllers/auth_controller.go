package controllers

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"clinica-backend/config"
	"clinica-backend/models"
	"clinica-backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=3"`
}

type RegisterRequest struct {
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=6"`
	ConfirmPassword string `json:"confirm_password" binding:"required"`
	NomeCompleto    string `json:"nome_completo" binding:"required"`
}

type GoogleLoginRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

type LoginResponse struct {
	Token         string `json:"token"`
	UserID        uint   `json:"user_id"`
	Role          string `json:"role"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	Tipo          string `json:"tipo,omitempty"`
	AreaClinicaID *uint  `json:"area_clinica_id,omitempty"`
}

type RegisterResponse struct {
	Message string `json:"message"`
	UserID  uint   `json:"user_id"`
	Token   string `json:"token"`
	Role    string `json:"role"`
}

func getTipoTerapeutaFromEmail(email string) (string, string) {
	email = strings.ToLower(strings.TrimSpace(email))

	if !strings.HasSuffix(email, "@ufp.edu.pt") {
		return "professor", ""
	}

	parts := strings.Split(email, "@")
	if len(parts) == 0 {
		return "professor", ""
	}

	username := parts[0]

	if _, err := strconv.Atoi(username); err == nil {
		return "aluno", username
	}

	return "professor", ""
}

func Login(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email e password são obrigatórios"})
		return
	}

	var user models.User

	err := config.DB.Where("email = ?", req.Email).First(&user).Error
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email ou password inválidos"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email ou password inválidos"})
		return
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador inativo"})
		return
	}

	now := time.Now()
	config.DB.Model(&user).Update("last_login_at", now)

	var tipo string
	var areaClinicaID *uint
	if user.Role == "terapeuta" {
		var terapeuta models.Terapeuta
		if err := config.DB.Where("user_id = ?", user.ID).First(&terapeuta).Error; err != nil {
			log.Printf("Erro ao buscar terapeuta no login normal: %v", err)
		} else {
			tipo = terapeuta.Tipo
			areaClinicaID = terapeuta.AreaClinicaID
		}
	}

	token, err := utils.GenerateAppJWT(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
		return
	}

	response := LoginResponse{
		Token:         token,
		UserID:        user.ID,
		Role:          user.Role,
		Name:          user.Nome,
		Email:         user.Email,
		Tipo:          tipo,
		AreaClinicaID: areaClinicaID,
	}

	c.JSON(http.StatusOK, response)
}

// GoogleLogin autentica o utilizador através do Google OAuth
// Requer um id_token válido do Google
// Valida que o email termina em @ufp.edu.pt
func GoogleLogin(c *gin.Context) {
	var req GoogleLoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID token obrigatório"})
		return
	}

	claims, err := utils.VerifyGoogleToken(context.Background(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token Google inválido"})
		return
	}

	if !claims.EmailVerified {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email não verificado no Google"})
		return
	}

	role := "utente"
	if utils.ValidateUFPEmail(claims.Email) {
		role = "terapeuta"
	}

	var user models.User

	result := config.DB.Where("google_sub = ?", claims.Sub).First(&user)
	if result.Error != nil {
		user = models.User{
			Email:     claims.Email,
			Nome:      claims.Name,
			GoogleSub: &claims.Sub,
			Role:      role,
			Active:    true,
		}

		if err := config.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar utilizador"})
			return
		}

		if role == "utente" {
			utente := models.Utente{
				UserID: user.ID,
			}

			if err := config.DB.Create(&utente).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar perfil de utente"})
				return
			}

			processo := models.ProcessoClinico{
				UtenteID: user.ID,
				Ativo:    true,
			}

			if err := config.DB.Create(&processo).Error; err != nil {
			}
		} else if role == "terapeuta" {
			tipoTerapeuta, numeroMecanografico := getTipoTerapeutaFromEmail(claims.Email)

			terapeuta := models.Terapeuta{
				UserID:        user.ID,
				Tipo:          tipoTerapeuta,
				AreaClinicaID: nil,
			}

			if numeroMecanografico != "" {
				terapeuta.NumeroMecanografico = &numeroMecanografico
			}

			if err := config.DB.Create(&terapeuta).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar perfil de terapeuta"})
				return
			}
		}
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador inativo"})
		return
	}

	now := time.Now()
	config.DB.Model(&user).Update("last_login_at", now)

	var tipo string
	var areaClinicaID *uint
	if user.Role == "terapeuta" {
		var terapeuta models.Terapeuta
		if err := config.DB.Where("user_id = ?", user.ID).First(&terapeuta).Error; err != nil {
			log.Printf("Erro ao buscar terapeuta: %v", err)
		} else {
			log.Printf("Terapeuta encontrado: user_id=%d, tipo=%s, area_clinica_id=%v", terapeuta.UserID, terapeuta.Tipo, terapeuta.AreaClinicaID)
			tipo = terapeuta.Tipo
			areaClinicaID = terapeuta.AreaClinicaID
		}
	}

	token, err := utils.GenerateAppJWT(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
		return
	}

	response := LoginResponse{
		Token:         token,
		UserID:        user.ID,
		Role:          user.Role,
		Name:          user.Nome,
		Email:         user.Email,
		Tipo:          tipo,
		AreaClinicaID: areaClinicaID,
	}

	c.JSON(http.StatusOK, response)
}

// Register cria uma nova conta de utilizador
func Register(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados obrigatórios: email, password, confirm_password, nome_completo"})
		return
	}

	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "As palavras-passe não coincidem"})
		return
	}

	var existingUser models.User
	result := config.DB.Where("email = ?", req.Email).First(&existingUser)
	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email já registado"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao processar password"})
		return
	}

	newUser := models.User{
		Email:        req.Email,
		Nome:         req.NomeCompleto,
		PasswordHash: string(hashedPassword),
		Role:         "utente",
		Active:       true,
	}

	if err := config.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar utilizador"})
		return
	}

	utente := models.Utente{
		UserID: newUser.ID,
	}

	if err := config.DB.Create(&utente).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar perfil de utente"})
		return
	}

	processo := models.ProcessoClinico{
		UtenteID: newUser.ID,
		Ativo:    true,
	}

	if err := config.DB.Create(&processo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar processo clínico"})
		return
	}

	token, err := utils.GenerateAppJWT(newUser.ID, newUser.Email, newUser.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
		return
	}

	response := RegisterResponse{
		Message: "Conta criada com sucesso",
		UserID:  newUser.ID,
		Token:   token,
		Role:    newUser.Role,
	}

	c.JSON(http.StatusCreated, response)
}
