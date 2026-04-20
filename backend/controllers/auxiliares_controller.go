package controllers

import (
	"net/http"

	"clinica-backend/config"
	"clinica-backend/models"

	"github.com/gin-gonic/gin"
)

type TerapeutaListItem struct {
	UserID              uint    `json:"user_id"`
	Nome                string  `json:"nome"`
	Email               string  `json:"email"`
	Tipo                string  `json:"tipo"`
	AreaClinicaID       uint    `json:"area_clinica_id"`
	AreaClinicaNome     string  `json:"area_clinica_nome"`
	NumeroMecanografico *string `json:"numero_mecanografico"`
}

func GetSalas(c *gin.Context) {
	var salas []models.Sala

	if err := config.DB.
		Preload("AreasClinicas").
		Where("ativa = ?", true).
		Order("nome ASC").
		Find(&salas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, salas)
}

func GetAreasClinicas(c *gin.Context) {
	var areas []models.AreaClinica

	if err := config.DB.Where("ativa = ?", true).Order("nome ASC").Find(&areas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, areas)
}

func GetTerapeutas(c *gin.Context) {
	var terapeutas []models.Terapeuta

	err := config.DB.
		Preload("User").
		Preload("AreaClinica").
		Joins("JOIN users ON users.id = terapeutas.user_id").
		Where("users.active = ?", true).
		Order("users.nome ASC").
		Find(&terapeutas).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]TerapeutaListItem, 0, len(terapeutas))
	for _, t := range terapeutas {
		response = append(response, TerapeutaListItem{
			UserID:              t.UserID,
			Nome:                t.User.Nome,
			Email:               t.User.Email,
			Tipo:                t.Tipo,
			AreaClinicaID:       t.AreaClinicaID,
			AreaClinicaNome:     t.AreaClinica.Nome,
			NumeroMecanografico: t.NumeroMecanografico,
		})
	}

	c.JSON(http.StatusOK, response)
}

func GetAlunosDisponiveis(c *gin.Context) {
	search := c.Query("search")

	var alunos []models.Terapeuta

	query := config.DB.
		Joins("JOIN users ON terapeutas.user_id = users.id").
		Where("terapeutas.tipo = ?", "aluno").
		Where("terapeutas.supervisor_id IS NULL")

	if search != "" {
		query = query.Where("users.nome ILIKE ? OR users.email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.
		Preload("User").
		Order("users.nome ASC").
		Find(&alunos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]gin.H, 0, len(alunos))
	for _, aluno := range alunos {
		response = append(response, gin.H{
			"user_id": aluno.UserID,
			"nome":    aluno.User.Nome,
			"email":   aluno.User.Email,
		})
	}

	c.JSON(http.StatusOK, response)
}

type AdicionarAlunoRequest struct {
	AlunoID uint `json:"aluno_id" binding:"required"`
}

func AdicionarAluno(c *gin.Context) {
	professorID := c.GetUint("user_id")
	var req AdicionarAlunoRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "aluno_id obrigatório"})
		return
	}

	professor := models.Terapeuta{}
	if err := config.DB.Where("user_id = ? AND tipo = ?", professorID, "professor").First(&professor).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Só professores podem adicionar alunos"})
		return
	}

	aluno := models.Terapeuta{}
	if err := config.DB.Where("user_id = ? AND tipo = ?", req.AlunoID, "aluno").First(&aluno).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aluno não encontrado"})
		return
	}

	if aluno.SupervisorID != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Este aluno já tem um supervisor"})
		return
	}

	if err := config.DB.Model(&aluno).Update("supervisor_id", professorID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao adicionar aluno"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Aluno adicionado com sucesso",
		"aluno":   aluno.UserID,
	})
}

func RemoverAluno(c *gin.Context) {
	professorID := c.GetUint("user_id")
	alunoID := c.Param("aluno_id")

	professor := models.Terapeuta{}
	if err := config.DB.Where("user_id = ? AND tipo = ?", professorID, "professor").First(&professor).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Só professores podem remover alunos"})
		return
	}

	aluno := models.Terapeuta{}
	if err := config.DB.Where("user_id = ? AND supervisor_id = ?", alunoID, professorID).First(&aluno).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aluno não encontrado ou não pertence a este professor"})
		return
	}

	if err := config.DB.Model(&aluno).Update("supervisor_id", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao remover aluno"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Aluno removido com sucesso",
	})
}

func GetAlunosDoProfessor(c *gin.Context) {
	professorID := c.GetUint("user_id")

	var alunos []models.Terapeuta

	if err := config.DB.
		Joins("JOIN users ON terapeutas.user_id = users.id").
		Where("supervisor_id = ?", professorID).
		Preload("User").
		Order("users.nome ASC").
		Find(&alunos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]gin.H, 0, len(alunos))
	for _, aluno := range alunos {
		response = append(response, gin.H{
			"user_id": aluno.UserID,
			"nome":    aluno.User.Nome,
			"email":   aluno.User.Email,
		})
	}

	c.JSON(http.StatusOK, response)
}
