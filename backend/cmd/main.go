package main

import (
	"clinica-backend/config"
	"clinica-backend/controllers"
	"clinica-backend/middleware"
	"clinica-backend/routes"
	"clinica-backend/utils"
	"context"
	"log"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadEnv()
	config.ConnectDB()

	googleClientID := config.GetEnvOptional("GOOGLE_CLIENT_ID", "")
	if googleClientID != "" {
		if err := utils.InitGoogle(context.Background(), googleClientID); err != nil {
			log.Printf("Aviso: Falha ao inicializar Google OAuth: %v", err)
		}
	}

	jwtSecret := config.GetEnvOptional("JWT_SECRET", "your-secret-key-change-in-production")
	utils.SetJWTSecret(jwtSecret)

	r := gin.Default()

	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:8000",
		"http://localhost:8001",
		"http://127.0.0.1:8000",
	}

	if envOrigins := config.GetEnvOptional("CORS_ALLOWED_ORIGINS", ""); envOrigins != "" {
		for _, origin := range strings.Split(envOrigins, ",") {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				allowedOrigins = append(allowedOrigins, origin)
			}
		}
	}

	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Accept", "Authorization", "X-User-ID", "X-User-Role"},
		ExposeHeaders:   []string{"Content-Length"},
		MaxAge:          12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	routes.RegisterAuthRoutes(r)

	r.POST("/utentes", controllers.CreateUtente)

	auth := r.Group("/")
	auth.Use(middleware.AuthMiddleware())
	{
		auth.GET("/consultas", controllers.GetConsultas)
		auth.GET("/consultas/disponibilidade/check", controllers.CheckDisponibilidade)
		auth.GET("/consultas/:id", controllers.GetConsultaByID)
		auth.GET("/terapeutas/:terapeuta_id/horarios-disponiveis", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetHorariosDisponiveis)
		auth.POST("/consultas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.CreateConsulta)
		auth.PATCH("/consultas/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.UpdateConsulta)
		auth.PUT("/consultas/:id/cancelar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CancelConsulta)
		auth.PUT("/consultas/:id/remarcar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.RemarcarConsulta)

		auth.GET("/utentes", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetUtentes)
		auth.GET("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetUtenteByID)
		auth.PATCH("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.UpdateUtente)
		auth.POST("/utentes/:id/avatar", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.UploadAvatar)
		auth.DELETE("/utentes/:id", middleware.RoleMiddleware("admin", "administrativo"), controllers.DeleteUtente)
		auth.GET("/utentes/:id/consultas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetConsultasByUtenteID)
		auth.GET("/utentes/:id/registos-clinicos", middleware.RoleMiddleware("admin", "terapeuta"), controllers.GetRegistosClinicosByUtenteID)

		auth.GET("/salas", controllers.GetSalas)
		auth.GET("/areas-clinicas", controllers.GetAreasClinicas)
		auth.GET("/terapeutas", middleware.RoleMiddleware("admin", "administrativo", "terapeuta", "utente"), controllers.GetTerapeutas)
		auth.GET("/terapeutas/area/:area_id", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetTerapeutasByArea)
		auth.GET("/alunos-disponiveis", middleware.RoleMiddleware("terapeuta"), controllers.GetAlunosDisponiveis)
		auth.GET("/meus-alunos", middleware.RoleMiddleware("terapeuta"), controllers.GetAlunosDoProfessor)
		auth.POST("/adicionar-aluno", middleware.RoleMiddleware("terapeuta"), controllers.AdicionarAluno)
		auth.DELETE("/remover-aluno/:aluno_id", middleware.RoleMiddleware("terapeuta"), controllers.RemoverAluno)
		auth.PUT("/terapeutas/area-clinica", middleware.RoleMiddleware("terapeuta"), controllers.UpdateAreaClinica)

		auth.GET("/fichas-avaliacao", middleware.RoleMiddleware("admin", "terapeuta"), controllers.GetFichasAvaliacao)
		auth.GET("/fichas-avaliacao/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.GetFichaAvaliacaoByID)
		auth.POST("/fichas-avaliacao", middleware.RoleMiddleware("admin", "terapeuta"), controllers.CreateFichaAvaliacao)
		auth.PATCH("/fichas-avaliacao/:id", middleware.RoleMiddleware("admin", "terapeuta"), controllers.UpdateFichaAvaliacao)

		auth.GET("/assiduidade", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.GetAssiduidade)
		auth.POST("/assiduidade", middleware.RoleMiddleware("admin", "administrativo", "terapeuta"), controllers.CreateAssiduidade)
	}

	r.Static("/uploads", "./uploads")

	port := config.GetEnv("PORT")
	r.Run(":" + port)
}
