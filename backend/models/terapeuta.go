package models

type Terapeuta struct {
	UserID              uint    `gorm:"column:user_id;primaryKey"`
	Tipo                string  `gorm:"column:tipo"`
	AreaClinicaID       uint    `gorm:"column:area_clinica_id"`
	NumeroMecanografico *string `gorm:"column:numero_mecanografico"`

	User        User        `gorm:"foreignKey:UserID;references:ID"`
	AreaClinica AreaClinica `gorm:"foreignKey:AreaClinicaID;references:ID"`
}

func (Terapeuta) TableName() string {
	return "terapeutas"
}
