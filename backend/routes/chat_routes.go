package routes

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func ChatRoutes(api *gin.RouterGroup, db *gorm.DB) {
	chatController := controller.NewChatController(db)
	c := api.Group("/chat")
	{
		c.GET("/sessions", middleware.AuthMiddleware(), chatController.GetChatSessions)
		c.GET("/history", middleware.AuthMiddleware(), chatController.GetChatHistory)
		c.POST("/save", middleware.AuthMiddleware(), chatController.SaveChatMessage)
		c.DELETE("/sessions", middleware.AuthMiddleware(), chatController.DeleteSession)
		c.PUT("/sessions/rename", middleware.AuthMiddleware(), chatController.RenameSession)
	}
}
