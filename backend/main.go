package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"

	"path/filepath"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/routes"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/services"

	"github.com/gin-gonic/gin"
)

func startTyphoonAI() {
	go func() {
		client := http.Client{Timeout: 2 * time.Second}
		resp, err := client.Get("http://127.0.0.1:8000/health")
		if err == nil && resp != nil && resp.StatusCode == 200 {
			resp.Body.Close()
			fmt.Println("✅ Typhoon AI Service is already running on port 8000.")
			return
		}
		if resp != nil {
			resp.Body.Close()
		}

		fmt.Println("🤖 Starting Typhoon AI Service on port 8000...")
		cmd := exec.Command("python", "-u", "-m", "uvicorn", "typhoon.main:app", "--host", "0.0.0.0", "--port", "8000")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		err = cmd.Run()
		if err != nil {
			log.Println("⚠️ Typhoon AI process ended or failed:", err)
		}
	}()
}

func main() {
	config.LoadEnv()
	config.ConnectDatabase()
	config.SeedAllData()

	geminiService, err := services.NewGeminiService(config.Env.GeminiAPIKey)
	if err != nil {
		log.Printf("⚠️ Warning: Gemini Service initialization failed: %v\n", err)
	} else {
		fmt.Println("✅ Gemini Vision Service initialized successfully!")
	}

	// 1. สร้าง JobService โดยส่ง config.DB เข้าไป
	jobService := services.NewJobService(config.DB)

	// 2. ส่งทั้ง geminiService และ jobService เข้า NewJobController (แก้ไขจุดนี้)
	jobController := controller.NewJobController(geminiService, jobService)

	startTyphoonAI()

	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	r.Static("/uploads/jobs", "./uploads/jobs")
	r.Static("/upload", "./upload")

	api := r.Group("/api")
	{
		api.Static("/upload", "./upload")
		api.Static("/uploads/jobs", "./uploads/jobs")

		api.POST("/upload", func(ctx *gin.Context) {
			file, err := ctx.FormFile("file")
			if err != nil {
				ctx.JSON(400, gin.H{"error": "ไม่พบไฟล์ที่อัปโหลด"})
				return
			}

			// สร้างโฟลเดอร์ upload ถ้ายังไม่มี
			if err := os.MkdirAll("./upload", os.ModePerm); err != nil {
				ctx.JSON(500, gin.H{"error": "ไม่สามารถสร้างโฟลเดอร์เก็บไฟล์ได้"})
				return
			}

			// ตั้งชื่อไฟล์ใหม่ด้วย timestamp ป้องกันชื่อซ้ำ
			ext := filepath.Ext(file.Filename)
			newFilename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
			filePath := filepath.Join("./upload", newFilename)

			if err := ctx.SaveUploadedFile(file, filePath); err != nil {
				ctx.JSON(500, gin.H{"error": "ไม่สามารถบันทึกไฟล์ได้"})
				return
			}

			// ส่ง path กลับ (เก็บไว้ต่อกับ Domain หลัก)
			fileURL := fmt.Sprintf("/api/upload/%s", newFilename)
			ctx.JSON(200, gin.H{"url": fileURL})
		})

		routes.SetupJobRoutes(api, jobController)

		routes.AuthRoutes(api, config.DB)
		routes.KnowledgeRoutes(api, config.DB)
		routes.JobPositionRoutes(api, config.DB)
		routes.ChatRoutes(api, config.DB)
		routes.InterviewRoutes(api, config.DB)
	}

	fmt.Println("🚀 Server running on port:", config.Env.BackendPort)
	r.Run(":" + config.Env.BackendPort)
}
