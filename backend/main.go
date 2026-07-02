package main

import (
	"fmt"
	"log"
	"os/exec"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/routes"

	"github.com/gin-gonic/gin"
)

func startTyphoonAI() {
	go func() {
		fmt.Println("🤖 Starting Typhoon AI Service on port 8000...")
		cmd := exec.Command("python", "-m", "uvicorn", "typhoon.main:app", "--host", "0.0.0.0", "--port", "8000")
		err := cmd.Run()
		if err != nil {
			log.Println("⚠️ Typhoon AI process ended or failed:", err)
		}
	}()
}

func main() {
	config.LoadEnv()
	config.ConnectDatabase()
	config.SeedAllData()

	// รัน Typhoon AI ควบคู่ไปด้วยแบบอัตโนมัติ
	startTyphoonAI()

	r := gin.Default()

	r.Use(middleware.CORSMiddleware())

	api := r.Group("/api")
	{
		// Static สำหรับเก็บไฟล์อัปโหลด
		api.Static("/upload", "./upload")

		// ลงทะเบียน Routes ต่างๆ
		routes.AuthRoutes(api, config.DB)
		routes.KnowledgeRoutes(api, config.DB)
		routes.JobPositionRoutes(api, config.DB)
	}

	fmt.Println("🚀 Server running on port:", config.Env.BackendPort)
	r.Run(":" + config.Env.BackendPort)
}
