package main

import (
	"fmt"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/routes"

	"github.com/gin-gonic/gin"
)

func main() {

	config.LoadEnv()
	config.ConnectDatabase()
	config.SeedAllData()

	r := gin.Default()

	r.Use(middleware.CORSMiddleware())

	api := r.Group("/api")
	{
		// Static สำหรับเก็บไฟล์อัปโหลด
		api.Static("/upload", "./upload")

		// ลงทะเบียน Routes ต่างๆ
		routes.AuthRoutes(api, config.DB)

		// ในอนาคตคุณสามารถเพิ่ม Routes อื่นๆ ที่นี่เหมือนตัวอย่างได้ เช่น:
		// routes.CandidateRoutes(api)
		// routes.ApplicationRoutes(api)
	}

	fmt.Println(" Server running on port:", config.Env.BackendPort)
	r.Run(":" + config.Env.BackendPort)
}
