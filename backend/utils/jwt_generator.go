package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// AppJWTClaims são os claims do JWT próprio da aplicação
type AppJWTClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

var jwtSecret string

// SetJWTSecret configura a chave secreta para JWT
func SetJWTSecret(secret string) {
	jwtSecret = secret
}

// GenerateAppJWT gera um JWT da aplicação para o utilizador
func GenerateAppJWT(userID uint, email, role string) (string, error) {
	if jwtSecret == "" {
		return "", fmt.Errorf("JWT secret não foi configurado")
	}

	claims := &AppJWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "clinica-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", fmt.Errorf("falha ao gerar JWT: %w", err)
	}

	return tokenString, nil
}
