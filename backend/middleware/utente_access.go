package middleware

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func OwnUtenteOrStaffMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleValue, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Role não encontrada no contexto"})
			c.Abort()
			return
		}

		userRole, ok := roleValue.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Role inválida no contexto"})
			c.Abort()
			return
		}

		// staff pode passar
		if userRole == "admin" || userRole == "administrativo" || userRole == "terapeuta" {
			c.Next()
			return
		}

		// utente só pode ver o próprio id
		if userRole == "utente" {
			userIDValue, exists := c.Get("userID")
			if !exists {
				c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador não encontrado no contexto"})
				c.Abort()
				return
			}

			userID, ok := userIDValue.(uint)
			if !ok {
				c.JSON(http.StatusForbidden, gin.H{"error": "Utilizador inválido no contexto"})
				c.Abort()
				return
			}

			paramID := c.Param("id")
			requestedID, err := strconv.Atoi(paramID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
				c.Abort()
				return
			}

			if uint(requestedID) != userID {
				c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a este utente"})
				c.Abort()
				return
			}

			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para aceder a este recurso"})
		c.Abort()
	}
}
