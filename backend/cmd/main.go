package main

import (
	"clinica-backend/config"
	"clinica-backend/controllers"
	"clinica-backend/middleware"
	"clinica-backend/routes"
	"clinica-backend/utils"
	"context"
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadEnv()
	config.ConnectDB()

	// Inicializar Google OAuth
	googleClientID := config.GetEnvOptional("GOOGLE_CLIENT_ID", "")
	if googleClientID != "" {
		if err := utils.InitGoogle(context.Background(), googleClientID); err != nil {
			log.Printf("Aviso: Falha ao inicializar Google OAuth: %v", err)
		}
	}

	// Configurar JWT Secret
	jwtSecret := config.GetEnvOptional("JWT_SECRET", "your-secret-key-change-in-production")
	utils.SetJWTSecret(jwtSecret)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:8001", "http://127.0.0.1:8000", "http://localhost:8000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-User-ID", "X-User-Role"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Rota pública
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// Registar rotas de autenticação
	routes.RegisterAuthRoutes(r)

	// ========================
	// UTENTES (públicos registar)
	// ========================
	r.POST("/utentes", controllers.CreateUtente)

	// Grupo protegido por autenticação
	auth := r.Group("/")
	auth.Use(middleware.AuthMiddleware())
	{
		// ========================
		// CONSULTAS
		// ========================
		auth.GET("/consultas", controllers.GetConsultas)
		auth.GET("/consultas/:id", controllers.GetConsultaByID)
		auth.POST("/consultas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CreateConsulta)
		auth.PATCH("/consultas/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.UpdateConsulta)
		auth.PUT("/consultas/:id/cancelar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CancelConsulta)
		auth.PUT("/consultas/:id/remarcar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.RemarcarConsulta)

		// ========================
		// UTENTES
		// ========================
		auth.GET("/utentes", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetUtentes)
		auth.GET("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetUtenteByID)
		auth.PATCH("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.UpdateUtente)
		auth.POST("/utentes/:id/avatar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.UploadAvatar)
		auth.DELETE("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo"), controllers.DeleteUtente)
		auth.GET("/utentes/:id/consultas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetConsultasByUtenteID)
		auth.GET("/utentes/:id/registos-clinicos", middleware.RoleMiddleware("admin", "terapeuta"), controllers.GetRegistosClinicosByUtenteID)

		// ========================
		// AUXILIARES
		// ========================
		auth.GET("/salas", controllers.GetSalas)
		auth.GET("/areas-clinicas", controllers.GetAreasClinicas)
		auth.GET("/terapeutas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetTerapeutas)

		// ========================
		// FICHAS DE AVALIAÇÃO
		// ========================
		auth.GET("/fichas-avaliacao", middleware.RoleMiddleware("admin", "terapeuta"), controllers.GetFichasAvaliacao)
		auth.GET("/fichas-avaliacao/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.GetFichaAvaliacaoByID)
		auth.POST("/fichas-avaliacao", middleware.RoleMiddleware("admin", "terapeuta"), controllers.CreateFichaAvaliacao)
		auth.PATCH("/fichas-avaliacao/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.UpdateFichaAvaliacao)

		// ========================
		// ASSIDUIDADE
		// ========================
		auth.GET("/assiduidade", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetAssiduidade)
		auth.POST("/assiduidade", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CreateAssiduidade)
	}

	// Servir ficheiros estáticos do diretório de uploads
	r.Static("/uploads", "./uploads")

	port := config.GetEnv("PORT")
	r.Run(":" + port)
}
