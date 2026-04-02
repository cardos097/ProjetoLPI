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
	r.PATCH("/consultas/:id", controllers.UpdateConsulta)
	r.PUT("/consultas/:id/cancelar", controllers.CancelConsulta)
	r.PUT("/consultas/:id/remarcar", controllers.RemarcarConsulta)

	r.GET("/utentes", controllers.GetUtentes)
	r.GET("/utentes/:id", controllers.GetUtenteByID)
	r.GET("/utentes/:id/consultas", controllers.GetConsultasByUtenteID)
	r.GET("/utentes/:id/registos-clinicos", controllers.GetRegistosClinicosByUtenteID)
	r.GET("/salas", controllers.GetSalas)
	r.GET("/areas-clinicas", controllers.GetAreasClinicas)
	r.GET("/terapeutas", controllers.GetTerapeutas)

	r.GET("/fichas-avaliacao", controllers.GetFichasAvaliacao)
	r.GET("/fichas-avaliacao/:id", controllers.GetFichaAvaliacaoByID)
	r.POST("/fichas-avaliacao", controllers.CreateFichaAvaliacao)
	r.PATCH("/fichas-avaliacao/:id", controllers.UpdateFichaAvaliacao)

	r.GET("/assiduidade", controllers.GetAssiduidade)
	r.POST("/assiduidade", controllers.CreateAssiduidade)

	r.Run(":8080")
}
