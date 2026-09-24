package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
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

		// ── Reverse Proxy for Typhoon AI Service ────────────────────────────────────
		typhoonTarget := os.Getenv("TYPHOON_API_URL")
		if typhoonTarget == "" {
			typhoonTarget = "http://127.0.0.1:8000"
		}
		typhoonURL, errUrl := url.Parse(typhoonTarget)
		if errUrl == nil {
			proxy := httputil.NewSingleHostReverseProxy(typhoonURL)
			originalDirector := proxy.Director
			proxy.Director = func(req *http.Request) {
				originalDirector(req)
				req.Host = typhoonURL.Host
				req.URL.Scheme = typhoonURL.Scheme
				req.URL.Host = typhoonURL.Host
				// Required for LocalTunnel to bypass browser reminder page
				req.Header.Set("Bypass-Tunnel-Reminder", "true")
			}
			// Strip CORS headers from upstream to prevent duplicate headers conflict in browser
			proxy.ModifyResponse = func(resp *http.Response) error {
				resp.Header.Del("Access-Control-Allow-Origin")
				resp.Header.Del("Access-Control-Allow-Methods")
				resp.Header.Del("Access-Control-Allow-Headers")
				resp.Header.Del("Access-Control-Allow-Credentials")
				resp.Header.Del("Access-Control-Expose-Headers")
				return nil
			}
			api.Any("/typhoon/*proxyPath", func(c *gin.Context) {
				c.Request.URL.Path = c.Param("proxyPath")
				proxy.ServeHTTP(c.Writer, c.Request)
			})
		}

		// ── Dedicated Typhoon health check (no CORS issue) ───────────────────────────
		api.GET("/typhoon-status", func(c *gin.Context) {
			client := &http.Client{Timeout: 8 * time.Second}
			req, _ := http.NewRequest("GET", typhoonTarget+"/health", nil)
			req.Header.Set("Bypass-Tunnel-Reminder", "true")
			resp, err := client.Do(req)
			if err != nil || resp == nil {
				c.JSON(200, gin.H{"online": false, "error": "unreachable"})
				return
			}
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			var result map[string]interface{}
			if err := json.Unmarshal(body, &result); err != nil {
				c.JSON(200, gin.H{"online": false, "error": "bad response"})
				return
			}
			status, _ := result["status"].(string)
			c.JSON(200, gin.H{"online": status == "ok", "details": result})
		})


		routes.SetupJobRoutes(api, jobController)

		routes.AuthRoutes(api, config.DB)
		routes.KnowledgeRoutes(api, config.DB)
		routes.JobPositionRoutes(api, config.DB)
		routes.ChatRoutes(api, config.DB)
		routes.InterviewRoutes(api, config.DB)
		routes.UserRoutes(api, config.DB)

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
