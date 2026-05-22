package models

import "time"

type FichaTerapiaFala struct {
	ID                     uint       `gorm:"primaryKey"`
	UtenteID               uint       `gorm:"column:utente_id"`
	ConsultaID             *uint      `gorm:"column:consulta_id"`
	NomeCompleto           string     `gorm:"column:nome_completo"`
	NumeroProcesso         string     `gorm:"column:numero_processo"`
	DataNascimento         *time.Time `gorm:"column:data_nascimento"`
	Sexo                   string     `gorm:"column:sexo"`
	AvaliacaoSubjetiva     string     `gorm:"column:avaliacao_subjetiva"`
	AvaliacaoObjetiva      string     `gorm:"column:avaliacao_objetiva"`
	DiagnosticoTerapiaFala string     `gorm:"column:diagnostico_terapia_fala"`
	ObjetivosPrognostico   string     `gorm:"column:objetivos_prognostico"`
	PlanoTerapeutico       string     `gorm:"column:plano_terapeutico"`
	PlanoProgressao        string     `gorm:"column:plano_progressao"`
	CreatedBy              uint       `gorm:"column:created_by"`
	Estado                 string     `gorm:"column:estado;default:'aprovada'"`
	EstudanteID            *uint      `gorm:"column:estudante_id"`
	CreatedAt              time.Time  `gorm:"column:created_at"`

	Utente    *Utente   `gorm:"foreignKey:UtenteID;references:UserID"`
	Consulta  *Consulta `gorm:"foreignKey:ConsultaID"`
	User      *User     `gorm:"foreignKey:CreatedBy"`
	Estudante *User     `gorm:"foreignKey:EstudanteID;references:ID"`
}

func (FichaTerapiaFala) TableName() string {
	return "fichas_terapia_fala"
}
