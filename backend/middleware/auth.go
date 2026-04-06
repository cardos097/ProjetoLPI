package middleware

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDHeader := c.GetHeader("X-User-ID")
		userRole := c.GetHeader("X-User-Role")

		if userIDHeader == "" || userRole == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Utilizador não autenticado",
			})
			c.Abort()
			return
		}

		userID, err := strconv.Atoi(userIDHeader)
		if err != nil || userID <= 0 {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "X-User-ID inválido",
			})
			c.Abort()
			return
		}

		c.Set("userID", uint(userID))
		c.Set("userRole", userRole)

		c.Next()
	}
}
