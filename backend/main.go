package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/routes"

	"github.com/gin-gonic/gin"
)

func startTyphoonAI() {
	go func() {
		fmt.Println("🤖 Starting Typhoon AI Service on port 8000...")
		cmd := exec.Command("python", "-u", "-m", "uvicorn", "typhoon.main:app", "--host", "0.0.0.0", "--port", "8000")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
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

		// POST /api/upload สำหรับเก็บไฟล์ผู้สมัครเฉยๆ โดยไม่ใช้ OCR
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

		// ลงทะเบียน Routes ต่างๆ
		routes.AuthRoutes(api, config.DB)
		routes.KnowledgeRoutes(api, config.DB)
		routes.JobPositionRoutes(api, config.DB)
	}

	fmt.Println("🚀 Server running on port:", config.Env.BackendPort)
	r.Run(":" + config.Env.BackendPort)
}
