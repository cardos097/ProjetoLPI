package config

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := "host=localhost port=5432 user=clinica_app password=1234 dbname=clinicplatform sslmode=disable"

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Erro ao ligar à base de dados:", err)
	}

	log.Println("Ligação à base de dados estabelecida com sucesso")
}
