package models

type Sala struct {
	ID        uint    `gorm:"column:id;primaryKey"`
	Nome      string  `gorm:"column:nome"`
	Descricao *string `gorm:"column:descricao"`
	Ativa     bool    `gorm:"column:ativa"`
}

func (Sala) TableName() string {
	return "salas"
}
