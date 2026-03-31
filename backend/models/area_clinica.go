package models

type AreaClinica struct {
	ID    uint   `gorm:"column:id;primaryKey"`
	Nome  string `gorm:"column:nome"`
	Ativa bool   `gorm:"column:ativa"`
}

func (AreaClinica) TableName() string {
	return "areas_clinicas"
}
