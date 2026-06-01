package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	BackendPort string
	DBHost      string
	DBUser      string
	DBPass      string
	DBName      string
	DBPort      string
}

var Env Config

func LoadEnv() {
	godotenv.Load()

	Env = Config{
		BackendPort: getEnv("PORT", "8080"),
		DBHost:      getEnv("DB_HOST", "127.0.0.1"),
		DBUser:      getEnv("DB_USER", "postgres"),
		DBPass:      getEnv("DB_PASSWORD", "postgres"),
		DBName:      getEnv("DB_NAME", "hr_system"),
		DBPort:      getEnv("DB_PORT", "5432"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
