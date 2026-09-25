package main

import (
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
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
		_, errPath := exec.LookPath("python")
		if errPath != nil {
			log.Println("ℹ️ Local Python executable not found in PATH; skipping local Python auto-start. (Using Cloud AI / Remote Typhoon API)")
			return
		}

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
		// Keep legacy Static routes for backward-compat (old files already in DB)
		api.Static("/upload", "./upload")
		api.Static("/uploads/jobs", "./uploads/jobs")

		// ── Base64 File Upload (Persistent in DB, zero cloud disk loss) ────────────
		api.POST("/upload", func(ctx *gin.Context) {
			file, err := ctx.FormFile("file")
			if err != nil {
				ctx.JSON(400, gin.H{"error": "ไม่พบไฟล์ที่อัปโหลด"})
				return
			}

			f, err := file.Open()
			if err != nil {
				ctx.JSON(500, gin.H{"error": "ไม่สามารถเปิดไฟล์ได้"})
				return
			}
			defer f.Close()

			fileBytes, err := io.ReadAll(f)
			if err != nil {
				ctx.JSON(500, gin.H{"error": "ไม่สามารถอ่านไฟล์ได้"})
				return
			}

			contentType := file.Header.Get("Content-Type")
			ext := strings.ToLower(filepath.Ext(file.Filename))
			switch ext {
			case ".pdf":
				contentType = "application/pdf"
			case ".jpg", ".jpeg":
				contentType = "image/jpeg"
			case ".png":
				contentType = "image/png"
			case ".webp":
				contentType = "image/webp"
			case ".txt":
				contentType = "text/plain"
			default:
				if contentType == "" || contentType == "application/octet-stream" {
					contentType = http.DetectContentType(fileBytes)
				}
			}

			encoded := base64.StdEncoding.EncodeToString(fileBytes)
			dataURI := fmt.Sprintf("data:%s;base64,%s", contentType, encoded)

			log.Printf("✅ File uploaded as Base64 (mime: %s, size: %d bytes)", contentType, len(fileBytes))
			ctx.JSON(200, gin.H{"url": dataURI})
		})

		// ── AI Service Routes (24/7 Cloud AI for Gemini & Claude + Local Proxy for Typhoon) ────
		aiController := controller.NewAIController(config.DB)
		api.GET("/version", func(c *gin.Context) { c.JSON(200, gin.H{"version": "v1.2-clean-ocr"}) })
		api.GET("/typhoon-status", aiController.GetStatus)
		api.GET("/typhoon/health", aiController.Health)
		api.GET("/typhoon/api/roles", aiController.GetRoles)
		api.POST("/typhoon/ocr", aiController.HandleOCR)
		api.POST("/typhoon/chat", aiController.HandleChat)

		proxyHandler := func(targetPath string) gin.HandlerFunc {
			return func(c *gin.Context) {
				if aiController.Proxy != nil {
					c.Request.URL.Path = targetPath
					aiController.Proxy.ServeHTTP(c.Writer, c.Request)
				} else {
					c.JSON(http.StatusOK, gin.H{"status": "ok"})
				}
			}
		}

		api.POST("/typhoon/model/unload", proxyHandler("/model/unload"))
		api.POST("/typhoon/api/score", proxyHandler("/api/score"))
		api.POST("/typhoon/analyze-resume", proxyHandler("/analyze-resume"))

		routes.SetupJobRoutes(api, jobController)

		routes.AuthRoutes(api, config.DB)
		routes.KnowledgeRoutes(api, config.DB)
		routes.JobPositionRoutes(api, config.DB)
		routes.ChatRoutes(api, config.DB)
		routes.InterviewRoutes(api, config.DB)
		routes.UserRoutes(api, config.DB)
		routes.NotificationRoutes(api, config.DB)

		api.GET("/test-email", func(c *gin.Context) {
			to := c.DefaultQuery("to", "guymini02479@gmail.com")
			err := services.SendApplicationEmail(to, "Test User", "Software Engineer", "APP-TEST-DIRECT")
			if err != nil {
				c.JSON(500, gin.H{
					"status":     "error",
					"error":      err.Error(),
					"smtp_email": config.Env.SMTPEmail,
				})
				return
			}
			c.JSON(200, gin.H{
				"status":  "success",
				"message": "อีเมลทดสอบส่งสำเร็จไปยัง " + to,
			})
		})
	}

	fmt.Println("🚀 Server running on port:", config.Env.BackendPort)
	r.Run(":" + config.Env.BackendPort)
}
