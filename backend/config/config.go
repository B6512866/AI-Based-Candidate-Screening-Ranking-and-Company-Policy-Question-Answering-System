package config

import (
	"fmt"

	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	BackendPort  string
	DBHost       string
	DBUser       string
	DBPass       string
	DBName       string
	DBPort       string
	JWTSecret    string
	FrontendURL  string
	BackendURL   string
	SMTPEmail    string
	SMTPPassword string
	GeminiAPIKey string
}

var Env Config

func LoadEnv() {
	_ = godotenv.Load()

	Env = Config{
		BackendPort:  getEnv("BACKEND_PORT", getEnv("PORT", "8080")),
		DBHost:       getEnv("DB_HOST", "127.0.0.1"),
		DBUser:       getEnv("DB_USER", "postgres"),
		DBPass:       getEnv("DB_PASSWORD", "postgres"),
		DBName:       getEnv("DB_NAME", "hr_system"),
		DBPort:       getEnv("DB_PORT", "5432"),
		JWTSecret:    getEnv("JWT_SECRET", "mysecretkey123"),
		FrontendURL:  getEnv("FRONTEND_URL", "http://localhost:5173"),
		BackendURL:   getEnv("BACKEND_URL", "http://localhost:8080"),
		SMTPEmail:    getEnv("SMTP_EMAIL", "guymini02479@gmail.com"),
		SMTPPassword: getEnv("SMTP_PASSWORD", "gjsrvsyeqsixfvlk"),
		GeminiAPIKey: getEnv("GEMINI_API_KEY", ""), // <--- เพิ่มบรรทัดนี้ครับ!
	}

	if Env.GeminiAPIKey == "" {
		fmt.Println("❌ Log Debug: GEMINI_API_KEY is empty!")
	} else {
		fmt.Println("🔑 Log Debug: GEMINI_API_KEY loaded successfully")
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return defaultValue
}
