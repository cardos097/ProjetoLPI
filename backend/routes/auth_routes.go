package routes

import (
	"clinica-backend/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(router *gin.Engine) {
	auth := router.Group("/auth")
	{
		// Login tradicional (email/password)
		auth.POST("/login", controllers.Login)

		// Login via Google OAuth
		auth.POST("/google/callback", controllers.GoogleLogin)
	}
}
