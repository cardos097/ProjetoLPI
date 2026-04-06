package main

import (
	"clinica-backend/config"
	"clinica-backend/controllers"
	"clinica-backend/middleware"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadEnv()
	config.ConnectDB()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
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

	// Grupo protegido por autenticação
	auth := r.Group("/")
	auth.Use(middleware.AuthMiddleware())
	{
		// ========================
		// CONSULTAS
		// ========================
		auth.GET("/consultas", controllers.GetConsultas)
		auth.POST("/consultas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CreateConsulta)
		auth.PATCH("/consultas/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.UpdateConsulta)
		auth.PUT("/consultas/:id/cancelar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CancelConsulta)
		auth.PUT("/consultas/:id/remarcar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.RemarcarConsulta)

		// ========================
		// UTENTES
		// ========================
		auth.GET("/utentes", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetUtentes)
		auth.GET("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetUtenteByID)
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

	port := config.GetEnv("PORT")
	r.Run(":" + port)
}
