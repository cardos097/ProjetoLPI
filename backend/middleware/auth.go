package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"clinica-backend/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Tentar obter token do header Authorization
		authHeader := c.GetHeader("Authorization")
		var userID uint
		var userRole string

		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			// Extrair token do header
			token := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := utils.ValidateAppJWT(token)
			if err == nil && claims != nil {
				userID = claims.UserID
				userRole = claims.Role
			}
		}

		// Se não conseguir do JWT, tentar headers customizados (fallback)
		if userID == 0 {
			userIDHeader := c.GetHeader("X-User-ID")
			userRole = c.GetHeader("X-User-Role")

			if userIDHeader == "" || userRole == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Utilizador não autenticado",
				})
				c.Abort()
				return
			}

			userIDInt, err := strconv.Atoi(userIDHeader)
			if err != nil || userIDInt <= 0 {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "X-User-ID inválido",
				})
				c.Abort()
				return
			}
			userID = uint(userIDInt)
		}

		c.Set("user_id", userID)
		c.Set("userRole", userRole)

		c.Next()
	}
}
