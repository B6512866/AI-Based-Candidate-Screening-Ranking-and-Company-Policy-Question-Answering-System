package controller

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/entity"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AIController struct {
	db            *gorm.DB
	typhoonTarget string
	typhoonURL    *url.URL
	Proxy         *httputil.ReverseProxy
}

func NewAIController(db *gorm.DB) *AIController {
	target := os.Getenv("TYPHOON_API_URL")
	if target == "" {
		target = "http://127.0.0.1:8000"
	}
	tURL, _ := url.Parse(target)
	var proxy *httputil.ReverseProxy
	if tURL != nil {
		proxy = httputil.NewSingleHostReverseProxy(tURL)
		orig := proxy.Director
		proxy.Director = func(req *http.Request) {
			orig(req)
			req.Host = tURL.Host
			req.URL.Scheme = tURL.Scheme
			req.URL.Host = tURL.Host
			req.Header.Set("Bypass-Tunnel-Reminder", "true")

			// Strip /api/typhoon prefix so upstream FastAPI receives clean path (/api/roles, /ocr, /chat, etc.)
			cleanPath := strings.TrimPrefix(req.URL.Path, "/api/typhoon")
			if !strings.HasPrefix(cleanPath, "/") {
				cleanPath = "/" + cleanPath
			}
			req.URL.Path = cleanPath
		}
		proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, err error) {
			log.Printf("⚠️ Typhoon Proxy Error: %v", err)
			rw.Header().Set("Content-Type", "application/json")
			rw.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(rw).Encode(map[string]interface{}{
				"error": fmt.Sprintf("ไม่สามารถเชื่อมต่อ Local Typhoon AI ได้ (%v) กรุณาตรวจสอบว่า 'python main.py' และ LocalTunnel กำลังรันอยู่", err),
			})
		}
		proxy.ModifyResponse = func(resp *http.Response) error {
			resp.Header.Del("Access-Control-Allow-Origin")
			resp.Header.Del("Access-Control-Allow-Methods")
			resp.Header.Del("Access-Control-Allow-Headers")
			resp.Header.Del("Access-Control-Allow-Credentials")
			resp.Header.Del("Access-Control-Expose-Headers")
			return nil
		}
	}

	return &AIController{
		db:            db,
		typhoonTarget: target,
		typhoonURL:    tURL,
		Proxy:         proxy,
	}
}

type ChatMessageInput struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequestInput struct {
	Messages     []ChatMessageInput `json:"messages"`
	SystemPrompt string             `json:"system_prompt"`
	MaxNewTokens int                `json:"max_new_tokens"`
	Temperature  float64            `json:"temperature"`
	Model        string             `json:"model"`
}

// CheckLocalTyphoon checks if local Typhoon server is responsive
func (c *AIController) isLocalTyphoonOnline() bool {
	client := &http.Client{Timeout: 2 * time.Second}
	req, err := http.NewRequest("GET", c.typhoonTarget+"/health", nil)
	if err != nil {
		return false
	}
	req.Header.Set("Bypass-Tunnel-Reminder", "true")
	resp, err := client.Do(req)
	if err != nil || resp == nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// GET /api/typhoon-status
func (c *AIController) GetStatus(ctx *gin.Context) {
	modelParam := strings.ToLower(strings.TrimSpace(ctx.DefaultQuery("model", "")))
	isLocal := c.isLocalTyphoonOnline()

	// Default online status represents whether the local Typhoon model is online
	isOnline := isLocal
	if modelParam != "" {
		if strings.Contains(modelParam, "gemini") || strings.Contains(modelParam, "claude") || strings.Contains(modelParam, "gpt") {
			isOnline = true // Cloud AI is 24/7
		} else {
			isOnline = isLocal // Typhoon requires local model running
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"online":        isOnline,
		"status":        "ok",
		"cloud_ai":      true,
		"models":        []string{"gemini-3.5-flash", "claude-sonnet-5"},
		"local_typhoon": isLocal,
	})
}

// GET /api/typhoon/health
func (c *AIController) Health(ctx *gin.Context) {
	isLocal := c.isLocalTyphoonOnline()
	statusStr := "offline"
	if isLocal {
		statusStr = "ok"
	}
	ctx.JSON(http.StatusOK, gin.H{
		"status":           statusStr,
		"online":           isLocal,
		"cloud_ai":         true,
		"gemini_ready":     true,
		"claude_ready":     true,
		"local_typhoon":    isLocal,
		"idle_timeout_sec": 300,
	})
}

// GET /api/typhoon/api/roles
func (c *AIController) GetRoles(ctx *gin.Context) {
	// If local Typhoon is running, try to forward
	if c.isLocalTyphoonOnline() && c.Proxy != nil {
		c.Proxy.ServeHTTP(ctx.Writer, ctx.Request)
		return
	}

	// Fallback to database job positions
	var jobs []entity.JobPosition
	if err := c.db.Find(&jobs).Error; err == nil && len(jobs) > 0 {
		var titles []string
		for _, j := range jobs {
			if j.Title != "" {
				titles = append(titles, j.Title)
			}
		}
		if len(titles) > 0 {
			ctx.JSON(http.StatusOK, titles)
			return
		}
	}

	defaultRoles := []string{
		"Software Engineer",
		"Frontend Developer (React)",
		"Backend Developer (Go / Python)",
		"Full Stack Developer",
		"QA Engineer / Tester",
		"DevOps Engineer",
		"Data Analyst / Data Scientist",
		"HR Officer / Recruiter",
	}
	ctx.JSON(http.StatusOK, defaultRoles)
}

// POST /api/typhoon/ocr
func (c *AIController) HandleOCR(ctx *gin.Context) {
	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาแนบไฟล์ Resume (PDF หรือรูปภาพ)"})
		return
	}

	modelParam := strings.ToLower(ctx.DefaultPostForm("model", ""))
	isTyphoonRequested := strings.Contains(modelParam, "typhoon")

	// If Typhoon is specifically requested AND local model is running, forward to it
	if isTyphoonRequested && c.isLocalTyphoonOnline() && c.Proxy != nil {
		c.Proxy.ServeHTTP(ctx.Writer, ctx.Request)
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเปิดไฟล์ได้: " + err.Error()})
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอ่านไฟล์ได้: " + err.Error()})
		return
	}

	mimeType := fileHeader.Header.Get("Content-Type")
	filenameLower := strings.ToLower(fileHeader.Filename)
	if strings.HasSuffix(filenameLower, ".pdf") {
		mimeType = "application/pdf"
	} else if strings.HasSuffix(filenameLower, ".png") {
		mimeType = "image/png"
	} else if strings.HasSuffix(filenameLower, ".jpg") || strings.HasSuffix(filenameLower, ".jpeg") {
		mimeType = "image/jpeg"
	}

	geminiKey := strings.TrimSpace(config.Env.GeminiAPIKey)
	if geminiKey == "" {
		geminiKey = strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	}
	if geminiKey == "" {
		geminiKey = strings.TrimSpace(os.Getenv("GOOGLE_API_KEY"))
	}

	if geminiKey == "" {
		// If no gemini key but local typhoon is online, forward
		if c.isLocalTyphoonOnline() && c.Proxy != nil {
			c.Proxy.ServeHTTP(ctx.Writer, ctx.Request)
			return
		}
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "⚠️ ไม่พบ GEMINI_API_KEY สำหรับรัน Cloud Vision OCR"})
		return
	}

	log.Printf("🔍 [Cloud OCR] Processing %s (%s, %d bytes) via Gemini Cloud Vision...", fileHeader.Filename, mimeType, len(fileBytes))

	extractedText, err := extractTextViaGemini(geminiKey, fileBytes, mimeType)
	if err != nil {
		log.Printf("⚠️ Gemini Vision OCR error: %v", err)
		// Fallback to local typhoon if online
		if c.isLocalTyphoonOnline() && c.Proxy != nil {
			c.Proxy.ServeHTTP(ctx.Writer, ctx.Request)
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini Vision OCR ล้มเหลว: " + err.Error()})
		return
	}

	log.Printf("✅ [Cloud OCR Success] Extracted %d characters from %s (0%% GPU Load)", len(extractedText), fileHeader.Filename)
	ctx.JSON(http.StatusOK, gin.H{
		"text": extractedText,
		"type": "pdf",
	})
}

// POST /api/typhoon/chat
func (c *AIController) HandleChat(ctx *gin.Context) {
	bodyBytes, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "ไม่สามารถอ่านคำขอได้"})
		return
	}
	// Restore body for proxy if needed
	ctx.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var req ChatRequestInput
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "รูปแบบ JSON ไม่ถูกต้อง: " + err.Error()})
		return
	}

	selectedModel := strings.ToLower(strings.TrimSpace(req.Model))
	isGemini := strings.Contains(selectedModel, "gemini")
	isClaude := strings.Contains(selectedModel, "claude")
	isTyphoon := strings.Contains(selectedModel, "typhoon") || (!isGemini && !isClaude)

	// 1. If Gemini is selected -> execute directly via Gemini Cloud Streaming API
	if isGemini {
		geminiKey := strings.TrimSpace(config.Env.GeminiAPIKey)
		if geminiKey == "" {
			geminiKey = strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
		}
		if geminiKey == "" {
			geminiKey = strings.TrimSpace(os.Getenv("GOOGLE_API_KEY"))
		}
		if geminiKey == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "⚠️ ไม่พบ GEMINI_API_KEY ในระบบ กรุณาตรวจสอบไฟล์ .env"})
			return
		}

		c.streamGemini(ctx, geminiKey, req)
		return
	}

	// 2. If Claude is selected -> execute directly via Anthropic Claude Streaming API
	if isClaude {
		claudeKey := strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY"))
		if claudeKey == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "⚠️ ไม่พบ ANTHROPIC_API_KEY ในระบบ กรุณาตรวจสอบไฟล์ .env"})
			return
		}

		c.streamClaude(ctx, claudeKey, req)
		return
	}

	// 3. If Typhoon is selected -> must run local model
	if isTyphoon {
		if !c.isLocalTyphoonOnline() {
			ctx.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "⚠️ โมเดล Typhoon 2.5 เป็นโมเดลภาษาไทยในเครื่อง (Local Model) จำเป็นต้องรันโมเดลก่อนใช้งาน\n\n💻 วิธีเปิดใช้งาน: เปิด Terminal รันคำสั่ง:\ncd backend/typhoon\npython main.py\n\n💡 คำแนะนำ: หากไม่ต้องการรันโมเดลในเครื่อง สามารถคลิกดรอปดาวน์สลับไปใช้ 'Gemini 3.5 Flash' หรือ 'Claude Sonnet 5' เพื่อประมวลผลผ่าน Cloud API ได้ตลอดเวลา 24 ชม. ทันทีครับ",
			})
			return
		}

		// Proxy to local typhoon
		if c.Proxy != nil {
			c.Proxy.ServeHTTP(ctx.Writer, ctx.Request)
			return
		}
	}

	ctx.JSON(http.StatusBadRequest, gin.H{"error": "ไม่พบโมเดล AI ที่ระบุ"})
}

func (c *AIController) streamGemini(ctx *gin.Context, apiKey string, req ChatRequestInput) {
	candidateModels := []string{"gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.1-flash-lite-preview", "gemini-3.5-flash", "gemini-2.5-flash"}
	userMsgText := ""
	for _, m := range req.Messages {
		userMsgText += fmt.Sprintf("%s: %s\n", m.Role, m.Content)
	}

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"role": "user",
				"parts": []map[string]string{
					{"text": userMsgText},
				},
			},
		},
	}
	if req.SystemPrompt != "" {
		payload["system_instruction"] = map[string]interface{}{
			"parts": []map[string]string{
				{"text": req.SystemPrompt},
			},
		}
	}
	bodyBytes, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 120 * time.Second}
	var resp *http.Response
	var lastErr error
	var usedModel string

	for _, m := range candidateModels {
		apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?alt=sse&key=%s", m, apiKey)
		httpReq, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(bodyBytes))
		if err != nil {
			continue
		}
		httpReq.Header.Set("Content-Type", "application/json")
		r, err := client.Do(httpReq)
		if err == nil && r.StatusCode == http.StatusOK {
			resp = r
			usedModel = m
			break
		}
		if r != nil {
			b, _ := io.ReadAll(r.Body)
			r.Body.Close()
			lastErr = fmt.Errorf("HTTP %d: %s", r.StatusCode, string(b))
		} else {
			lastErr = err
		}
	}

	if resp == nil {
		ctx.JSON(http.StatusTooManyRequests, gin.H{
			"error": fmt.Sprintf("⚠️ โควต้า Gemini Cloud API เต็มหรือเกิดข้อผิดพลาด: %v", lastErr),
		})
		return
	}
	defer resp.Body.Close()

	log.Printf("⚡ [Gemini Cloud API SUCCESS] Streaming %s via endpoint '%s' (0%% GPU Load)", req.Model, usedModel)

	ctx.Header("Content-Type", "text/plain; charset=utf-8")
	ctx.Header("Transfer-Encoding", "chunked")
	ctx.Header("X-Accel-Buffering", "no")
	ctx.Writer.WriteHeader(http.StatusOK)

	flusher, ok := ctx.Writer.(http.Flusher)
	scanner := bufio.NewScanner(resp.Body)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "data:") {
			dataJSON := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			var geminiResp struct {
				Candidates []struct {
					Content struct {
						Parts []struct {
							Text string `json:"text"`
						} `json:"parts"`
					} `json:"content"`
				} `json:"candidates"`
			}
			if err := json.Unmarshal([]byte(dataJSON), &geminiResp); err == nil {
				if len(geminiResp.Candidates) > 0 {
					for _, part := range geminiResp.Candidates[0].Content.Parts {
						if part.Text != "" {
							ctx.Writer.Write([]byte(part.Text))
							if ok {
								flusher.Flush()
							}
						}
					}
				}
			}
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("Gemini stream scan warning: %v", err)
	}
}

func (c *AIController) streamClaude(ctx *gin.Context, apiKey string, req ChatRequestInput) {
	claudeModel := "claude-sonnet-5"
	if strings.Contains(strings.ToLower(req.Model), "haiku") {
		claudeModel = "claude-haiku-4-5-20251001"
	}

	var claudeMessages []map[string]string
	for _, m := range req.Messages {
		claudeMessages = append(claudeMessages, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	maxTokens := req.MaxNewTokens
	if maxTokens <= 0 || maxTokens > 8192 {
		maxTokens = 8192
	}

	payload := map[string]interface{}{
		"model":      claudeModel,
		"max_tokens": maxTokens,
		"messages":   claudeMessages,
		"stream":     true,
	}
	if req.SystemPrompt != "" {
		payload["system"] = req.SystemPrompt
	}

	bodyBytes, _ := json.Marshal(payload)
	httpReq, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(bodyBytes))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	httpReq.Header.Set("x-api-key", apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")
	httpReq.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 180 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		ctx.JSON(http.StatusBadGateway, gin.H{"error": "ไม่สามารถติดต่อ Claude API ได้: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		ctx.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Claude Cloud API Error (%d): %s", resp.StatusCode, string(b))})
		return
	}

	log.Printf("⚡ [Claude Cloud API SUCCESS] Streaming %s (0%% GPU Load)", claudeModel)

	ctx.Header("Content-Type", "text/plain; charset=utf-8")
	ctx.Header("Transfer-Encoding", "chunked")
	ctx.Header("X-Accel-Buffering", "no")
	ctx.Writer.WriteHeader(http.StatusOK)

	flusher, ok := ctx.Writer.(http.Flusher)
	scanner := bufio.NewScanner(resp.Body)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "data:") {
			dataJSON := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			var claudeEvent struct {
				Type  string `json:"type"`
				Delta struct {
					Type string `json:"type"`
					Text string `json:"text"`
				} `json:"delta"`
			}
			if err := json.Unmarshal([]byte(dataJSON), &claudeEvent); err == nil {
				if claudeEvent.Type == "content_block_delta" && claudeEvent.Delta.Text != "" {
					ctx.Writer.Write([]byte(claudeEvent.Delta.Text))
					if ok {
						flusher.Flush()
					}
				}
			}
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("Claude stream scan warning: %v", err)
	}
}

// extractTextViaGemini calls Gemini Vision API with base64 encoded document
func extractTextViaGemini(geminiKey string, fileBytes []byte, mimeType string) (string, error) {
	b64 := base64.StdEncoding.EncodeToString(fileBytes)
	candidateModels := []string{"gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.1-flash-lite-preview", "gemini-3.5-flash", "gemini-2.5-flash"}

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []interface{}{
					map[string]interface{}{
						"inline_data": map[string]string{
							"mime_type": mimeType,
							"data":      b64,
						},
					},
					map[string]string{
						"text": "Extract all text and content from this resume document accurately. Output clean markdown only without extra explanations.",
					},
				},
			},
		},
	}
	bodyBytes, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 90 * time.Second}
	var lastErr error

	for _, m := range candidateModels {
		apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", m, geminiKey)
		httpReq, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(bodyBytes))
		if err != nil {
			continue
		}
		httpReq.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(httpReq)
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var resBody struct {
				Candidates []struct {
					Content struct {
						Parts []struct {
							Text string `json:"text"`
						} `json:"parts"`
					} `json:"content"`
				} `json:"candidates"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&resBody); err == nil {
				if len(resBody.Candidates) > 0 {
					var textOut strings.Builder
					for _, p := range resBody.Candidates[0].Content.Parts {
						textOut.WriteString(p.Text)
					}
					out := strings.TrimSpace(textOut.String())
					if out != "" {
						return out, nil
					}
				}
			}
		}
		if resp != nil {
			b, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			lastErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(b))
		} else {
			lastErr = err
		}
	}

	return "", fmt.Errorf("gemini vision OCR error: %v", lastErr)
}
