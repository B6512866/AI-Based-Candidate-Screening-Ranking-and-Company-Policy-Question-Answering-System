package routes

import (
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/controller"

	"github.com/gin-gonic/gin"
)

func SetupJobRoutes(router *gin.RouterGroup, jobController *controller.JobController) {
	jobs := router.Group("/v1/jobs")
	{
		jobs.POST("/extract-image", jobController.ExtractFromImage)
		jobs.POST("/generate-criteria", jobController.GenerateCriteria)
	}
}
