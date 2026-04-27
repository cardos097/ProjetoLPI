package models

import "time"

type SimpleEntity struct {
	ID   uint   `json:"id"`
	Nome string `json:"nome"`
}

type ConsultaDTO struct {
	ID            uint          `json:"id"`
	UtenteID      uint          `json:"utente_id"`
	TerapeutaID   uint          `json:"terapeuta_id"`
	SalaID        uint          `json:"sala_id"`
	AreaClinicaID uint          `json:"area_clinica_id"`
	DataInicio    time.Time     `json:"data_inicio"`
	DataFim       time.Time     `json:"data_fim"`
	Duracao       int           `json:"duracao"` // em minutos
	Estado        string        `json:"estado"`
	Tipo          string        `json:"tipo"`
	Utente        *SimpleEntity `json:"utente"`
	Terapeuta     *SimpleEntity `json:"terapeuta"`
	Sala          *SimpleEntity `json:"sala"`
	AreaClinica   *SimpleEntity `json:"area_clinica"`
}

// ConvertToDTO converte uma Consulta para ConsultaDTO
func (c *Consulta) ConvertToDTO() *ConsultaDTO {
	duracao := 0
	if !c.DataFim.IsZero() && !c.DataInicio.IsZero() {
		duracao = int(c.DataFim.Sub(c.DataInicio).Minutes())
	}

	utente := &SimpleEntity{
		ID:   c.Utente.ID,
		Nome: c.Utente.Nome,
	}

	terapeuta := &SimpleEntity{
		ID:   c.Terapeuta.ID,
		Nome: c.Terapeuta.Nome,
	}

	sala := &SimpleEntity{
		ID:   c.Sala.ID,
		Nome: c.Sala.Nome,
	}

	areaClinica := &SimpleEntity{
		ID:   c.AreaClinica.ID,
		Nome: c.AreaClinica.Nome,
	}

	return &ConsultaDTO{
		ID:            c.ID,
		UtenteID:      c.UtenteID,
		TerapeutaID:   c.TerapeutaID,
		SalaID:        c.SalaID,
		AreaClinicaID: c.AreaClinicaID,
		DataInicio:    c.DataInicio,
		DataFim:       c.DataFim,
		Duracao:       duracao,
		Estado:        c.Estado,
		Tipo:          "Consulta",
		Utente:        utente,
		Terapeuta:     terapeuta,
		Sala:          sala,
		AreaClinica:   areaClinica,
	}
}
