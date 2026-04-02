package models

import "time"

type FichaAvaliacao struct {
	ID                         uint       `gorm:"primaryKey"`
	UtenteID                   uint       `gorm:"column:utente_id"`
	ConsultaID                 *uint      `gorm:"column:consulta_id"`
	NomeCompleto               string     `gorm:"column:nome_completo"`
	NumeroProcesso             string     `gorm:"column:numero_processo"`
	DataNascimento             *time.Time `gorm:"column:data_nascimento"`
	Idade                      *uint      `gorm:"column:idade"`
	Sexo                       string     `gorm:"column:sexo"`
	PesoKg                     *float64   `gorm:"column:peso_kg"`
	AlturaM                    *float64   `gorm:"column:altura_m"`
	IMC                        *float64   `gorm:"column:imc"`
	DiagnosticoQueixaPrincipal string     `gorm:"column:diagnostico_queixa_principal"`
	TipoRegisto                string     `gorm:"column:tipo_registo"`
	DiagnosticoFisioterapia    string     `gorm:"column:diagnostico_fisioterapia"`
	ObjetivosPrognostico       string     `gorm:"column:objetivos_prognostico"`
	PlanoTerapeutico           string     `gorm:"column:plano_terapeutico"`
	PlanoProgressao            string     `gorm:"column:plano_progressao"`
	HistoriaPessoal            string     `gorm:"column:historia_pessoal"`
	Perspetivas                string     `gorm:"column:perspetivas"`
	Limitacoes                 string     `gorm:"column:limitacoes"`
	MCD                        string     `gorm:"column:mcd"`
	HistoriaCondicao           string     `gorm:"column:historia_condicao"`
	Medicacao                  string     `gorm:"column:medicacao"`
	HistMedAtual               string     `gorm:"column:hist_med_atual"`
	HistMedAnterior            string     `gorm:"column:hist_med_anterior"`
	HistMedFamiliar            string     `gorm:"column:hist_med_familiar"`
	SINSS                      string     `gorm:"column:sinss"`
	CreatedBy                  uint       `gorm:"column:created_by"`
	CreatedAt                  time.Time  `gorm:"column:created_at"`

	Utente              *Utente             `gorm:"foreignKey:UtenteID;references:UserID"`
	Consulta            *Consulta           `gorm:"foreignKey:ConsultaID"`
	User                *User               `gorm:"foreignKey:CreatedBy"`
	AvaliacoesObjetivas []AvaliacaoObjetiva `gorm:"foreignKey:FichaID"`
}

func (FichaAvaliacao) TableName() string {
	return "fichas_avaliacao"
}
