package controllers

import (
	"net/http"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=3"`
}

type LoginResponse struct {
	Token  string `json:"token"`
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
	Name   string `json:"name"`
	Email  string `json:"email"`
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

	// Comparar password (temporariamente em texto plano para testes)
	if user.PasswordHash != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email ou password inválidos"})
		return
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador inativo"})
		return
	}

	// Gerar token JWT (usando um mock por enquanto)
	token := "mock-jwt-token-" + user.Email

	response := LoginResponse{
		Token:  token,
		UserID: user.ID,
		Role:   user.Role,
		Name:   user.Nome,
		Email:  user.Email,
	}

	c.JSON(http.StatusOK, response)
}
