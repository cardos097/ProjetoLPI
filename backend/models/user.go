package models

import "time"

type User struct {
	ID           uint      `gorm:"column:id;primaryKey"`
	Nome         string    `gorm:"column:nome"`
	Email        string    `gorm:"column:email"`
	PasswordHash string    `gorm:"column:password_hash"`
	Role         string    `gorm:"column:role"`
	Active       bool      `gorm:"column:active"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at"`

	Terapeuta *Terapeuta `gorm:"foreignKey:UserID;references:ID"`
}

func (User) TableName() string {
	return "users"
}
