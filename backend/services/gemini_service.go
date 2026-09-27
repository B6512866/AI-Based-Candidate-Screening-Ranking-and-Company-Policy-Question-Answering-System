package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/dto"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiService struct {
	client       *genai.Client
	apiKey       string
	anthropicKey string
}

type JobImageInput struct {
	Bytes    []byte
	MimeType string
}

func extractCleanJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start != -1 && end != -1 && end > start {
		return raw[start : end+1]
	}
	return raw
}

func extractCleanJSONArray(raw string) string {
	raw = strings.TrimSpace(raw)
	start := strings.Index(raw, "[")
	end := strings.LastIndex(raw, "]")
	if start != -1 && end != -1 && end > start {
		return raw[start : end+1]
	}
	return raw
}

func NewGeminiService(apiKey string, anthropicKey ...string) (*GeminiService, error) {
	var aKey string
	if len(anthropicKey) > 0 && anthropicKey[0] != "" {
		aKey = anthropicKey[0]
	} else {
		aKey = os.Getenv("ANTHROPIC_API_KEY")
	}

	var client *genai.Client
	if apiKey != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		c, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
		if err == nil {
			client = c
		} else {
			fmt.Printf("⚠️ Warning: Failed to init Gemini genai client: %v\n", err)
		}
	}

	if client == nil && aKey == "" {
		return nil, fmt.Errorf("ไม่พบคีย์ AI (ต้องการ GEMINI_API_KEY หรือ ANTHROPIC_API_KEY)")
	}

	return &GeminiService{
		client:       client,
		apiKey:       apiKey,
		anthropicKey: aKey,
	}, nil
}

// ExtractJobInfoFromImage: สกัดข้อมูลประกาศรับสมัครงานจากรูปภาพเดียว
func (s *GeminiService) ExtractJobInfoFromImage(ctx context.Context, imageBytes []byte, mimeType string) (*dto.ExtractedJobResponse, error) {
	return s.ExtractJobInfoFromImages(ctx, []JobImageInput{{
		Bytes:    imageBytes,
		MimeType: mimeType,
	}})
}

// ExtractJobInfoFromImages: สกัดข้อมูลประกาศรับสมัครงานจากรูปภาพหลายรูป (พร้อมระบบ Fallback สู่ Claude)
func (s *GeminiService) ExtractJobInfoFromImages(ctx context.Context, images []JobImageInput) (*dto.ExtractedJobResponse, error) {
	if len(images) == 0 {
		return nil, fmt.Errorf("ไม่พบรูปภาพสำหรับวิเคราะห์")
	}

	prompt := `คุณคือผู้เชี่ยวชาญด้าน HR และการวิเคราะห์ประกาศรับสมัครงาน
รูปภาพทั้งหมดที่แนบมาเป็นประกาศงานตำแหน่งเดียวกัน แต่อาจแบ่งเนื้อหาเป็นหลายหน้า เช่น หน้าที่งาน คุณสมบัติ สวัสดิการ และข้อมูลติดต่อ
โปรดอ่านข้อความจากทุกรูป แล้วรวมเป็นข้อมูลประกาศงานชุดเดียว ห้ามวิเคราะห์แยกเป็นหลายตำแหน่ง ห้ามตัดข้อความเพราะอยู่คนละรูป และห้ามใส่ข้อมูลซ้ำ

กฎการอ่านข้อความสำคัญ:
1. ห้ามละเว้นข้อความในหัวข้อ "รายละเอียดงาน", "หน้าที่ความรับผิดชอบ", "คุณสมบัติผู้สมัคร" หรือหัวข้อที่มีความหมายใกล้เคียง
2. ให้คัดลอกสาระสำคัญของหน้าที่และงานที่ต้องทำทั้งหมดลงใน responsibilities เป็นรายการแยกข้อ
3. ให้คัดลอกคุณสมบัติทั้งหมดลงใน qualifications เป็นรายการแยกข้อ
4. description ต้องเป็นสรุปลักษณะงานที่อ่านได้จริงอย่างน้อย 1-2 ประโยค หากในภาพมีหัวข้อรายละเอียดงาน ให้สรุปจากหัวข้อนั้นโดยตรง ห้ามปล่อยเป็นค่าว่าง
5. ให้แยกข้อความในหัวข้อ "วิธีการสมัคร", "การสมัครงาน", "ติดต่อ", "Contact" หรือหัวข้อใกล้เคียงทั้งหมดไว้ใน contact_info เป็นข้อความเดียว โดยห้ามรวมกับ description หรือ benefits
6. สร้าง suggested_criteria จากข้อมูลรวมทุกภาพ โดยแบ่งเป็นหัวข้อเดี่ยวที่ไม่ซ้ำกัน
7. แต่ละเกณฑ์หลักต้องมี sub_criteria 3 ข้อเสมอ: ระดับดี weight 100, ระดับปานกลาง weight 50 และระดับแย่ weight 0
8. คำอธิบาย sub_criteria ต้องขึ้นต้นด้วย "ดี:", "ปานกลาง:" และ "แย่:" ตามลำดับ และต้องอ้างอิงข้อมูลจากประกาศจริง

ตอบกลับเป็น JSON ตามโครงสร้างนี้เท่านั้น (ห้ามใส่ Markdown อื่นนอกเหนือจาก JSON):
{
  "title": "ชื่อตำแหน่งงาน",
  "department": "ชื่อแผนกหรือฝ่าย",
  "location": "สถานที่ทำงาน",
  "salary": "ช่วงเงินเดือน",
  "type": "ประเภทการจ้างงาน",
  "description": "คำอธิบายรายละเอียดงานโดยย่อ",
  "qualifications": ["คุณสมบัติข้อที่ 1"],
  "responsibilities": ["ความรับผิดชอบข้อที่ 1"],
  "benefits": ["สวัสดิการข้อที่ 1"],
  "contact_info": "วิธีการสมัครและข้อมูลติดต่อ",
  "suggested_criteria": [
    {
      "id": "c1",
      "title": "ชื่อเกณฑ์หลัก",
      "weight": 25,
      "sub_criteria": [
        {"id": "s1_1", "title": "ระดับดี", "description": "ดี: ตรงตามประกาศ", "weight": 100},
        {"id": "s1_2", "title": "ระดับปานกลาง", "description": "ปานกลาง: ตรงตามบางส่วน", "weight": 50},
        {"id": "s1_3", "title": "ระดับแย่", "description": "แย่: ไม่ตรงตามประกาศ", "weight": 0}
      ]
    }
  ]
}`

	var lastErr error

	// 1. ลองใช้ Gemini ก่อน
	if s.client != nil {
		candidateModels := []string{"gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"}
		for _, modelName := range candidateModels {
			model := s.client.GenerativeModel(modelName)
			model.ResponseMIMEType = "application/json"

			parts := make([]genai.Part, 0, len(images)+1)
			for _, img := range images {
				format := imageFormat(img.Bytes, img.MimeType)
				parts = append(parts, genai.ImageData(format, img.Bytes))
			}
			parts = append(parts, genai.Text(prompt))

			resp, err := model.GenerateContent(ctx, parts...)
			if err != nil {
				lastErr = err
				fmt.Printf("⚠️ Gemini model %s failed: %v, trying next...\n", modelName, err)
				continue
			}

			if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
				var textBuilder strings.Builder
				for _, part := range resp.Candidates[0].Content.Parts {
					if t, ok := part.(genai.Text); ok {
						textBuilder.WriteString(string(t))
					}
				}
				cleanJSON := extractCleanJSON(textBuilder.String())
				var extracted dto.ExtractedJobResponse
				if err := json.Unmarshal([]byte(cleanJSON), &extracted); err == nil && extracted.Title != "" {
					fmt.Printf("✅ [Gemini Vision SUCCESS] Extracted job '%s' using model %s\n", extracted.Title, modelName)
					return &extracted, nil
				}
			}
		}
	}

	// 2. ถ้า Gemini ล้มเหลว หรือติดปัญหา JSON ให้ Fallback สู่ Claude Vision ทันที
	if s.anthropicKey != "" {
		fmt.Println("🔄 Falling back to Claude 3.5 Vision API...")
		extracted, err := s.extractJobInfoViaClaudeVision(ctx, images, prompt)
		if err == nil && extracted != nil {
			fmt.Printf("✅ [Claude Vision SUCCESS] Extracted job '%s'\n", extracted.Title)
			return extracted, nil
		}
		lastErr = err
	}

	if lastErr != nil {
		return nil, fmt.Errorf("ไม่สามารถสกัดข้อมูลประกาศงานด้วย AI ได้: %v", lastErr)
	}
	return nil, fmt.Errorf("ไม่สามารถวิเคราะห์ข้อมูลรูปภาพได้")
}

// callClaude sends a request to Anthropic Claude models (claude-sonnet-5 with claude-haiku fallback)
func (s *GeminiService) callClaude(ctx context.Context, content interface{}, maxTokens int) (string, error) {
	if s.anthropicKey == "" {
		return "", fmt.Errorf("anthropic key not configured")
	}

	candidateModels := []string{"claude-sonnet-5", "claude-haiku-4-5-20251001"}
	var lastErr error

	for _, model := range candidateModels {
		payload := map[string]interface{}{
			"model":      model,
			"max_tokens": maxTokens,
			"messages": []map[string]interface{}{
				{
					"role":    "user",
					"content": content,
				},
			},
		}
		bodyBytes, err := json.Marshal(payload)
		if err != nil {
			return "", err
		}

		req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(bodyBytes))
		if err != nil {
			return "", err
		}
		req.Header.Set("x-api-key", s.anthropicKey)
		req.Header.Set("anthropic-version", "2023-06-01")
		req.Header.Set("content-type", "application/json")

		client := &http.Client{Timeout: 90 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			fmt.Printf("⚠️ Claude model %s network error: %v, trying next...\n", model, err)
			continue
		}

		respBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBytes))
			fmt.Printf("⚠️ Claude model %s returned status %d: %s\n", model, resp.StatusCode, string(respBytes))
			continue
		}

		var claudeResp struct {
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
			Error *struct {
				Message string `json:"message"`
			} `json:"error"`
		}

		if err := json.Unmarshal(respBytes, &claudeResp); err != nil {
			lastErr = err
			continue
		}
		if claudeResp.Error != nil {
			lastErr = fmt.Errorf("claude api error: %s", claudeResp.Error.Message)
			continue
		}

		var textBuilder strings.Builder
		for _, c := range claudeResp.Content {
			if c.Type == "text" {
				textBuilder.WriteString(c.Text)
			}
		}
		out := textBuilder.String()
		if strings.TrimSpace(out) != "" {
			return out, nil
		}
	}
	return "", lastErr
}

// extractJobInfoViaClaudeVision: ใช้ Anthropic Claude วิเคราะห์รูปภาพ
func (s *GeminiService) extractJobInfoViaClaudeVision(ctx context.Context, images []JobImageInput, prompt string) (*dto.ExtractedJobResponse, error) {
	if s.anthropicKey == "" {
		return nil, fmt.Errorf("anthropic key not configured")
	}

	contentParts := make([]map[string]interface{}, 0, len(images)+1)
	for _, img := range images {
		mime := img.MimeType
		if !strings.HasPrefix(mime, "image/") {
			mime = http.DetectContentType(img.Bytes)
			if !strings.HasPrefix(mime, "image/") {
				mime = "image/jpeg"
			}
		}
		b64 := base64.StdEncoding.EncodeToString(img.Bytes)
		contentParts = append(contentParts, map[string]interface{}{
			"type": "image",
			"source": map[string]interface{}{
				"type":       "base64",
				"media_type": mime,
				"data":       b64,
			},
		})
	}
	contentParts = append(contentParts, map[string]interface{}{
		"type": "text",
		"text": prompt + "\n\nOutput only raw JSON.",
	})

	rawText, err := s.callClaude(ctx, contentParts, 4096)
	if err != nil {
		return nil, err
	}

	cleanJSON := extractCleanJSON(rawText)
	var extracted dto.ExtractedJobResponse
	if err := json.Unmarshal([]byte(cleanJSON), &extracted); err != nil {
		return nil, fmt.Errorf("json parse error from claude: %v", err)
	}

	return &extracted, nil
}

// GenerateJobFromPrompt: ร่างตำแหน่งงานและเกณฑ์ประเมินแบบสมบูรณ์จากข้อความหรือชื่อตำแหน่ง (Text Prompt)
func (s *GeminiService) GenerateJobFromPrompt(ctx context.Context, userPrompt, jobTitle, department string) (*dto.ExtractedJobResponse, error) {
	prompt := fmt.Sprintf(`คุณคือผู้เชี่ยวชาญด้าน HR Recruitment และ Talent Acquisition
โปรดร่างข้อมูลประกาศรับสมัครงานและเกณฑ์ประเมินที่สมบูรณ์แบบสำหรับตำแหน่งงานต่อไปนี้:
ชื่อตำแหน่งงาน: %s
แผนก/ฝ่าย: %s
ข้อมูลเพิ่มเติม/ความต้องการ: %s

คำแนะนำในการร่าง:
1. หากชื่อตำแหน่งหรือความต้องการสั้น ให้ใช้ความเชี่ยวชาญด้าน HR ขยายความหน้าที่ความรับผิดชอบ และคุณสมบัติผู้สมัครให้ครอบคลุม เป็นมืออาชีพ และสอดคล้องกับมาตรฐานอุตสาหกรรม
2. กำหนดช่วงเงินเดือนและสถานที่ทำงานที่สมเหตุสมผลสำหรับตลาดแรงงานไทย
3. ระบุสวัสดิการที่ดึงดูดใจ
4. สร้าง suggested_criteria ทั้งหมด 3-4 เกณฑ์หลัก แต่ละเกณฑ์มี 3 เกณฑ์ย่อย (ดี weight 100, ปานกลาง weight 50, แย่ weight 0)

ตอบกลับเป็น JSON ตามโครงสร้างนี้เท่านั้น (ห้ามใส่ Markdown อื่นนอกเหนือจาก JSON):
{
  "title": "ชื่อตำแหน่งงาน",
  "department": "ชื่อแผนกหรือฝ่าย",
  "location": "สถานที่ทำงาน",
  "salary": "ช่วงเงินเดือน",
  "type": "ประเภทการจ้างงาน (เช่น งานเต็มเวลา (Full-time))",
  "description": "คำอธิบายรายละเอียดงานโดยย่อที่กระชับและน่าสนใจ",
  "qualifications": ["คุณสมบัติข้อที่ 1", "คุณสมบัติข้อที่ 2", "คุณสมบัติข้อที่ 3"],
  "responsibilities": ["หน้าที่ความรับผิดชอบข้อที่ 1", "หน้าที่ความรับผิดชอบข้อที่ 2", "หน้าที่ความรับผิดชอบข้อที่ 3"],
  "benefits": ["สวัสดิการข้อที่ 1", "สวัสดิการข้อที่ 2"],
  "contact_info": "วิธีการสมัครและข้อมูลติดต่อ",
  "suggested_criteria": [
    {
      "id": "c1",
      "title": "ชื่อเกณฑ์หลัก",
      "weight": 35,
      "sub_criteria": [
        {"id": "s1_1", "title": "ระดับดี", "description": "ดี: ตรงตามข้อกำหนดอย่างสมบูรณ์", "weight": 100},
        {"id": "s1_2", "title": "ระดับปานกลาง", "description": "ปานกลาง: มีความรู้หรือทักษะบางส่วน", "weight": 50},
        {"id": "s1_3", "title": "ระดับแย่", "description": "แย่: ขาดทักษะพื้นฐานที่จำเป็น", "weight": 0}
      ]
    }
  ]
}`, jobTitle, department, userPrompt)

	var lastErr error

	// 1. ลอง Gemini ก่อน
	if s.client != nil {
		candidateModels := []string{"gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"}
		for _, m := range candidateModels {
			model := s.client.GenerativeModel(m)
			model.ResponseMIMEType = "application/json"

			resp, err := model.GenerateContent(ctx, genai.Text(prompt))
			if err != nil {
				lastErr = err
				fmt.Printf("⚠️ Gemini model %s failed: %v, trying next...\n", m, err)
				continue
			}
			if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
				var textBuilder strings.Builder
				for _, p := range resp.Candidates[0].Content.Parts {
					if t, ok := p.(genai.Text); ok {
						textBuilder.WriteString(string(t))
					}
				}
				cleanJSON := extractCleanJSON(textBuilder.String())
				var job dto.ExtractedJobResponse
				if err := json.Unmarshal([]byte(cleanJSON), &job); err == nil && job.Title != "" {
					fmt.Printf("✅ [Gemini Text SUCCESS] Generated job '%s' using %s\n", job.Title, m)
					return &job, nil
				}
			}
		}
	}

	// 2. Fallback สู่ Claude
	if s.anthropicKey != "" {
		fmt.Println("🔄 Generating job via Claude API...")
		rawText, err := s.callClaude(ctx, prompt+"\n\nOutput only pure raw JSON.", 4096)
		if err == nil {
			cleanJSON := extractCleanJSON(rawText)
			var job dto.ExtractedJobResponse
			if err := json.Unmarshal([]byte(cleanJSON), &job); err == nil && job.Title != "" {
				fmt.Printf("✅ [Claude Text SUCCESS] Generated job '%s'\n", job.Title)
				return &job, nil
			}
		} else {
			fmt.Printf("⚠️ Claude fallback error: %v\n", err)
			lastErr = err
		}
	}

	if lastErr != nil {
		return nil, fmt.Errorf("ไม่สามารถสร้างตำแหน่งงานด้วย AI ได้: %v", lastErr)
	}
	return nil, fmt.Errorf("ไม่สามารถสร้างตำแหน่งงานด้วย AI ได้")
}

// GenerateCriteriaFromText: เจนเกณฑ์ประเมินจาก Job Title และ Job Description
func (s *GeminiService) GenerateCriteriaFromText(ctx context.Context, jobTitle string, jobDescription string) ([]dto.MainCriterionDTO, error) {
	prompt := fmt.Sprintf(`คุณคือผู้เชี่ยวชาญด้าน HR Recruiter
โปรดสร้างเกณฑ์ประเมินผู้สมัครงาน สำหรับตำแหน่ง: "%s"
รายละเอียดงาน: "%s"

เงื่อนไขการสร้างเกณฑ์:
1. สร้างเกณฑ์หลัก (Main Criteria) ที่เหมาะสมกับตำแหน่งงาน โดย **ต้องแบ่งเป็นหัวข้อเดี่ยวๆ ชัดเจน ห้ามรวบรวม 2 หัวข้อเข้าด้วยกัน**
2. ในแต่ละเกณฑ์หลัก **ต้องมีเกณฑ์ย่อย (Sub-criteria) จำนวน 3 ข้อถ้วนเสมอ** (ประกอบด้วย ระดับดี, ระดับปานกลาง, ระดับแย่)
3. **กฎการให้คะแนนและคำอธิบาย (weight & description):** 
   - เกณฑ์ย่อยข้อที่ 1 (ระดับดี): ต้องขึ้นต้นด้วยคำว่า **"ดี: ตรงตามประกาศ [ระบุรายละเอียด]"** และกำหนด weight เป็น **100**
   - เกณฑ์ย่อยข้อที่ 2 (ระดับปานกลาง): ต้องขึ้นต้นด้วยคำว่า **"ปานกลาง: [ระบุรายละเอียดทักษะเสริม/AI เจนเพิ่ม]"** และกำหนด weight เป็น **50**
   - เกณฑ์ย่อยข้อที่ 3 (ระดับแย่): ต้องขึ้นต้นด้วยคำว่า **"แย่: [ระบุรายละเอียดข้อจำกัด]"** และกำหนด weight เป็น **0**

ตอบกลับมาในรูปแบบ JSON Array ของเกณฑ์ประเมินตามโครงสร้างนี้เท่านั้น:
[
  {
    "id": "c1",
    "title": "ชื่อเกณฑ์หลัก (หัวข้อเดี่ยว ชัดเจน)",
    "weight": 35,
    "sub_criteria": [
      {
        "id": "s1_1",
        "title": "ชื่อเกณฑ์ย่อยที่ 1",
        "description": "ดี: ตรงตามประกาศ มีประสบการณ์หรือทักษะตามที่ระบุในประกาศ",
        "weight": 100
      },
      {
        "id": "s1_2",
        "title": "ชื่อเกณฑ์ย่อยที่ 2 (AI เจนเพิ่ม)",
        "description": "ปานกลาง: มีความรู้ความเข้าใจในระดับปานกลางหรือทักษะใกล้เคียง",
        "weight": 50
      },
      {
        "id": "s1_3",
        "title": "ชื่อเกณฑ์ย่อยที่ 3 (AI เจนเพิ่ม)",
        "description": "แย่: ขาดทักษะสำคัญหรือยังไม่ผ่านเกณฑ์พื้นฐาน",
        "weight": 0
      }
    ]
  }
]`, jobTitle, jobDescription)

	var lastErr error

	// 1. ลอง Gemini
	if s.client != nil {
		candidateModels := []string{"gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"}
		for _, m := range candidateModels {
			model := s.client.GenerativeModel(m)
			model.ResponseMIMEType = "application/json"

			resp, err := model.GenerateContent(ctx, genai.Text(prompt))
			if err != nil {
				lastErr = err
				fmt.Printf("⚠️ Gemini model %s failed: %v, trying next...\n", m, err)
				continue
			}
			if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
				var textBuilder strings.Builder
				for _, p := range resp.Candidates[0].Content.Parts {
					if t, ok := p.(genai.Text); ok {
						textBuilder.WriteString(string(t))
					}
				}
				cleanJSON := extractCleanJSONArray(textBuilder.String())
				var criteria []dto.MainCriterionDTO
				if err := json.Unmarshal([]byte(cleanJSON), &criteria); err == nil && len(criteria) > 0 {
					return criteria, nil
				}
			}
		}
	}

	// 2. Fallback สู่ Claude
	if s.anthropicKey != "" {
		fmt.Println("🔄 Generating criteria via Claude API...")
		rawText, err := s.callClaude(ctx, prompt+"\n\nOutput only raw JSON array.", 4096)
		if err == nil {
			cleanJSON := extractCleanJSONArray(rawText)
			var criteria []dto.MainCriterionDTO
			if json.Unmarshal([]byte(cleanJSON), &criteria) == nil && len(criteria) > 0 {
				fmt.Printf("✅ [Claude Criteria SUCCESS] Generated %d criteria\n", len(criteria))
				return criteria, nil
			}
		} else {
			fmt.Printf("⚠️ Claude fallback error: %v\n", err)
			lastErr = err
		}
	}

	if lastErr != nil {
		return nil, fmt.Errorf("gemini generate criteria failed: %v", lastErr)
	}
	return nil, fmt.Errorf("ไม่สามารถสร้างเกณฑ์ด้วย AI ได้")
}

func (s *GeminiService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}

func imageFormat(imageBytes []byte, mimeType string) string {
	detectedMime := http.DetectContentType(imageBytes)
	format := ""
	if strings.HasPrefix(detectedMime, "image/") {
		format = strings.TrimPrefix(detectedMime, "image/")
	} else {
		format = strings.ToLower(strings.TrimSpace(mimeType))
		format = strings.TrimPrefix(format, "image/")
	}
	if format == "jpg" || format == "pjpeg" {
		format = "jpeg"
	}
	if format == "" || format == "octet-stream" {
		format = "jpeg"
	}
	return format
}
