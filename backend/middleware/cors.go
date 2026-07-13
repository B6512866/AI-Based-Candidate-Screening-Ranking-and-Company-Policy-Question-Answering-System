package middleware

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	origins := []string{
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://100.123.193.113:5173",
	}
	if config.Env.FrontendURL != "" && config.Env.FrontendURL != "http://localhost:5173" {
		origins = append(origins, config.Env.FrontendURL)
	}

	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	})
}