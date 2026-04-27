package models

import "time"

type ConsultaDTO struct {
	ID              uint      `json:"id"`
	DataInicio      time.Time `json:"data_inicio"`
	DataFim         time.Time `json:"data_fim"`
	Duracao         int       `json:"duracao"` // em minutos
	Estado          string    `json:"estado"`
	Tipo            string    `json:"tipo"`
	UtenteName      string    `json:"utente_nome"`
	TerapeutaName   string    `json:"terapeuta_nome"`
	SalaID          uint      `json:"sala_id"`
	SalaName        string    `json:"sala_nome"`
	AreaClinicaName string    `json:"area_clinica_nome"`
}

// ConvertToDTO converte uma Consulta para ConsultaDTO
func (c *Consulta) ConvertToDTO() *ConsultaDTO {
	duracao := 0
	if !c.DataFim.IsZero() && !c.DataInicio.IsZero() {
		duracao = int(c.DataFim.Sub(c.DataInicio).Minutes())
	}

	return &ConsultaDTO{
		ID:              c.ID,
		DataInicio:      c.DataInicio,
		DataFim:         c.DataFim,
		Duracao:         duracao,
		Estado:          c.Estado,
		Tipo:            "Consulta",
		UtenteName:      c.Utente.Nome,
		TerapeutaName:   c.Terapeuta.Nome,
		SalaID:          c.SalaID,
		SalaName:        c.Sala.Nome,
		AreaClinicaName: c.AreaClinica.Nome,
	}
}
