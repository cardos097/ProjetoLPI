package controllers

import (
	"context"
	"net/http"
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
	Token  string `json:"token"`
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Tipo   string `json:"tipo,omitempty"`
}

type RegisterResponse struct {
	Message string `json:"message"`
	UserID  uint   `json:"user_id"`
	Token   string `json:"token"`
	Role    string `json:"role"`
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

	// Comparar password com bcrypt
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email ou password inválidos"})
		return
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador inativo"})
		return
	}

	// Atualizar last_login_at
	now := time.Now()
	config.DB.Model(&user).Update("last_login_at", now)

	// Se for terapeuta, carregar tipo
	var tipo string
	if user.Role == "terapeuta" {
		var terapeuta models.Terapeuta
		config.DB.Where("user_id = ?", user.ID).First(&terapeuta)
		tipo = terapeuta.Tipo
	}

	// Gerar token JWT próprio da aplicação
	token, err := utils.GenerateAppJWT(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
		return
	}

	response := LoginResponse{
		Token:  token,
		UserID: user.ID,
		Role:   user.Role,
		Name:   user.Nome,
		Email:  user.Email,
		Tipo:   tipo,
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

	// Validar token contra Google's JWKS (go-oidc faz isso automaticamente)
	claims, err := utils.VerifyGoogleToken(context.Background(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token Google inválido"})
		return
	}

	// Validar que o email é verificado
	if !claims.EmailVerified {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email não verificado no Google"})
		return
	}

	// Determinar role baseado no domínio do email
	role := "utente" // Role padrão para emails externos
	if utils.ValidateUFPEmail(claims.Email) {
		role = "terapeuta" // Role padrão para @ufp.edu.pt
	}

	// Procurar ou criar utilizador
	var user models.User

	result := config.DB.Where("google_sub = ?", claims.Sub).First(&user)
	if result.Error != nil {
		// Utilizador não existe, criar novo
		user = models.User{
			Email:     claims.Email,
			Nome:      claims.Name,
			GoogleSub: &claims.Sub,
			Role:      role, // Role baseado no domínio
			Active:    true,
		}

		if err := config.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar utilizador"})
			return
		}

		// Se for utente, criar entrada correspondente em utentes
		if role == "utente" {
			utente := models.Utente{
				UserID: user.ID,
			}

			if err := config.DB.Create(&utente).Error; err != nil {
				// Log o erro mas não falha o login
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar perfil de utente"})
				return
			}

			// Criar ProcessoClinico para o novo utente
			processo := models.ProcessoClinico{
				UtenteID: user.ID,
				Ativo:    true,
			}

			if err := config.DB.Create(&processo).Error; err != nil {
				// Log o erro mas não falha o login
			}
		}
	}

	// Validar que o utilizador está ativo
	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador inativo"})
		return
	}

	// Atualizar last_login_at
	now := time.Now()
	config.DB.Model(&user).Update("last_login_at", now)

	// Se for terapeuta, carregar tipo
	var tipo string
	if user.Role == "terapeuta" {
		var terapeuta models.Terapeuta
		config.DB.Where("user_id = ?", user.ID).First(&terapeuta)
		tipo = terapeuta.Tipo
	}

	// Gerar token JWT próprio da aplicação
	token, err := utils.GenerateAppJWT(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar token"})
		return
	}

	response := LoginResponse{
		Token:  token,
		UserID: user.ID,
		Role:   user.Role,
		Name:   user.Nome,
		Email:  user.Email,
		Tipo:   tipo,
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

	// Validar se as passwords coincidem
	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "As palavras-passe não coincidem"})
		return
	}

	// Validar se o email já existe
	var existingUser models.User
	result := config.DB.Where("email = ?", req.Email).First(&existingUser)
	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email já registado"})
		return
	}

	// Hash da password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao processar password"})
		return
	}

	// Criar novo utilizador com role "utente"
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

	// Criar entrada de utente
	utente := models.Utente{
		UserID: newUser.ID,
	}

	if err := config.DB.Create(&utente).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar perfil de utente"})
		return
	}

	// Criar ProcessoClinico para o novo utente
	processo := models.ProcessoClinico{
		UtenteID: newUser.ID,
		Ativo:    true,
	}

	if err := config.DB.Create(&processo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar processo clínico"})
		return
	}

	// Gerar token JWT
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
