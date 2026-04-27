package models

import "time"

type Utente struct {
	UserID         uint       `gorm:"column:user_id;primaryKey"`
	TerapeutaID    *uint      `gorm:"column:terapeuta_id"`
	DataNascimento *time.Time `gorm:"column:data_nascimento"`
	NIF            []byte     `gorm:"column:nif"`
	Telefone       *string    `gorm:"column:telefone"`
	Morada         *string    `gorm:"column:morada"`
	NumeroProcesso *string    `gorm:"column:numero_processo"`
	FotoURL        *string    `gorm:"column:foto_url"`

	User      User  `gorm:"foreignKey:UserID;references:ID"`
	Terapeuta *User `gorm:"foreignKey:TerapeutaID;references:ID"`
}

func (Utente) TableName() string {
	return "utentes"
}
