package main

import (
	"clinica-backend/config"
	"clinica-backend/controllers"

	"github.com/gin-gonic/gin"
)

func main() {
	config.ConnectDB()

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	r.GET("/consultas", controllers.GetConsultas)
	r.POST("/consultas", controllers.CreateConsulta)
	r.PUT("/consultas/:id/cancelar", controllers.CancelConsulta)

	r.GET("/utentes", controllers.GetUtentes)
	r.GET("/utentes/:id", controllers.GetUtenteByID)
	r.GET("/utentes/:id/consultas", controllers.GetConsultasByUtenteID)
	r.GET("/utentes/:id/registos-clinicos", controllers.GetRegistosClinicosByUtenteID)

	r.GET("/fichas-avaliacao", controllers.GetFichasAvaliacao)
	r.POST("/fichas-avaliacao", controllers.CreateFichaAvaliacao)

	r.GET("/assiduidade", controllers.GetAssiduidade)
	r.POST("/assiduidade", controllers.CreateAssiduidade)

	r.Run(":8080")
}
