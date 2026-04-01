package controllers

import (
	"clinica-backend/config"
	"clinica-backend/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type utenteFichaInfo struct {
	NomeCompleto   string     `gorm:"column:nome_completo"`
	NumeroProcesso string     `gorm:"column:numero_processo"`
	DataNascimento *time.Time `gorm:"column:data_nascimento"`
}

func yearsFromBirthDate(birthDate time.Time) uint {
	now := time.Now()
	age := now.Year() - birthDate.Year()

	if now.Month() < birthDate.Month() || (now.Month() == birthDate.Month() && now.Day() < birthDate.Day()) {
		age--
	}

	if age < 0 {
		return 0
	}

	return uint(age)
}

func fillFichaFromUtenteData(ficha *models.FichaAvaliacao) error {
	var info utenteFichaInfo

	err := config.DB.Table("utentes").
		Select("users.nome AS nome_completo, utentes.numero_processo, utentes.data_nascimento").
		Joins("JOIN users ON users.id = utentes.user_id").
		Where("utentes.user_id = ?", ficha.UtenteID).
		Take(&info).Error
	if err != nil {
		return err
	}

	if ficha.NomeCompleto == "" {
		ficha.NomeCompleto = info.NomeCompleto
	}

	if ficha.NumeroProcesso == "" {
		ficha.NumeroProcesso = info.NumeroProcesso
	}

	if ficha.DataNascimento == nil && info.DataNascimento != nil {
		ficha.DataNascimento = info.DataNascimento
	}

	if ficha.Idade == nil && ficha.DataNascimento != nil {
		calculatedAge := yearsFromBirthDate(*ficha.DataNascimento)
		ficha.Idade = &calculatedAge
	}

	if ficha.IMC == nil && ficha.PesoKg != nil && ficha.AlturaM != nil && *ficha.AlturaM > 0 {
		calculatedIMC := *ficha.PesoKg / (*ficha.AlturaM * *ficha.AlturaM)
		ficha.IMC = &calculatedIMC
	}

	return nil
}

type CreateFichaRequest struct {
	UtenteID                   uint     `json:"utente_id"`
	ConsultaID                 *uint    `json:"consulta_id"`
	NomeCompleto               string   `json:"nome_completo"`
	NumeroProcesso             string   `json:"numero_processo"`
	DataNascimento             string   `json:"data_nascimento"`
	Idade                      *uint    `json:"idade"`
	Sexo                       string   `json:"sexo"`
	PesoKg                     *float64 `json:"peso_kg"`
	AlturaM                    *float64 `json:"altura_m"`
	IMC                        *float64 `json:"imc"`
	DiagnosticoQueixaPrincipal string   `json:"diagnostico_queixa_principal"`
	TipoRegisto                string   `json:"tipo_registo"`
	DiagnosticoFisioterapia    string   `json:"diagnostico_fisioterapia"`
	ObjetivosPrognostico       string   `json:"objetivos_prognostico"`
	PlanoTerapeutico           string   `json:"plano_terapeutico"`
	PlanoProgressao            string   `json:"plano_progressao"`
	HistoriaPessoal            string   `json:"historia_pessoal"`
	Perspetivas                string   `json:"perspetivas"`
	Limitacoes                 string   `json:"limitacoes"`
	MCD                        string   `json:"mcd"`
	HistoriaCondicao           string   `json:"historia_condicao"`
	Medicacao                  string   `json:"medicacao"`
	HistMedAtual               string   `json:"hist_med_atual"`
	HistMedAnterior            string   `json:"hist_med_anterior"`
	HistMedFamiliar            string   `json:"hist_med_familiar"`
	SINSS                      string   `json:"sinss"`
	CreatedBy                  uint     `json:"created_by"`
}

func GetFichasAvaliacao(c *gin.Context) {
	var fichas []models.FichaAvaliacao

	if err := config.DB.Preload("AvaliacoesObjetivas").Order("id DESC").Find(&fichas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range fichas {
		if err := fillFichaFromUtenteData(&fichas[i]); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, fichas)
}

func CreateFichaAvaliacao(c *gin.Context) {
	var req CreateFichaRequest
	var dataNascimento *time.Time

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	if req.DataNascimento != "" {
		parsed, err := time.Parse("2006-01-02", req.DataNascimento)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data de nascimento inválida. Use o formato YYYY-MM-DD"})
			return
		}
		dataNascimento = &parsed
	}

	ficha := models.FichaAvaliacao{
		UtenteID:                   req.UtenteID,
		ConsultaID:                 req.ConsultaID,
		NomeCompleto:               req.NomeCompleto,
		NumeroProcesso:             req.NumeroProcesso,
		DataNascimento:             dataNascimento,
		Idade:                      req.Idade,
		Sexo:                       req.Sexo,
		PesoKg:                     req.PesoKg,
		AlturaM:                    req.AlturaM,
		IMC:                        req.IMC,
		DiagnosticoQueixaPrincipal: req.DiagnosticoQueixaPrincipal,
		TipoRegisto:                req.TipoRegisto,
		DiagnosticoFisioterapia:    req.DiagnosticoFisioterapia,
		ObjetivosPrognostico:       req.ObjetivosPrognostico,
		PlanoTerapeutico:           req.PlanoTerapeutico,
		PlanoProgressao:            req.PlanoProgressao,
		HistoriaPessoal:            req.HistoriaPessoal,
		Perspetivas:                req.Perspetivas,
		Limitacoes:                 req.Limitacoes,
		MCD:                        req.MCD,
		HistoriaCondicao:           req.HistoriaCondicao,
		Medicacao:                  req.Medicacao,
		HistMedAtual:               req.HistMedAtual,
		HistMedAnterior:            req.HistMedAnterior,
		HistMedFamiliar:            req.HistMedFamiliar,
		SINSS:                      req.SINSS,
		CreatedBy:                  req.CreatedBy,
	}

	if err := fillFichaFromUtenteData(&ficha); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Utente inválido ou dados do processo inexistentes"})
		return
	}

	if err := config.DB.Create(&ficha).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ficha)
}
