package routes

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func NotificationRoutes(api *gin.RouterGroup, db *gorm.DB) {
	notifController := controller.NewNotificationController(db)

	n := api.Group("/notifications")
	{
		n.GET("", notifController.GetAll)
		n.POST("", notifController.Create)
		n.PUT("/:id/read", notifController.MarkAsRead)
		n.PUT("/read-all", notifController.MarkAllAsRead)
		n.DELETE("/:id", notifController.Delete)
	}
}
