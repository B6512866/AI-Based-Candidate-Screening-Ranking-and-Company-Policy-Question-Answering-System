package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/dto"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiService struct {
	client *genai.Client
	model  *genai.GenerativeModel
}

type JobImageInput struct {
	Bytes    []byte
	MimeType string
}

func NewGeminiService(apiKey string) (*GeminiService, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY ไม่ถูกตั้งค่า")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("ไม่สามารถสร้าง Gemini Client ได้: %v", err)
	}

	// ใช้ gemini-2.5-flash สำหรับงานประมวลผลทั่วไปและ OCR Vision
	model := client.GenerativeModel("gemini-2.5-flash")

	// กำหนดให้ตอบกลับเป็น JSON เสมอ
	model.ResponseMIMEType = "application/json"

	return &GeminiService{
		client: client,
		model:  model,
	}, nil
}

// ExtractJobInfoFromImage: สกัดข้อมูลประกาศรับสมัครงานจากรูปภาพ
func (s *GeminiService) ExtractJobInfoFromImage(ctx context.Context, imageBytes []byte, mimeType string) (*dto.ExtractedJobResponse, error) {
	return s.ExtractJobInfoFromImages(ctx, []JobImageInput{{
		Bytes:    imageBytes,
		MimeType: mimeType,
	}})
}

func (s *GeminiService) ExtractJobInfoFromImages(ctx context.Context, images []JobImageInput) (*dto.ExtractedJobResponse, error) {
	if len(images) == 0 {
		return nil, fmt.Errorf("ไม่พบรูปภาพสำหรับวิเคราะห์")
	}

	parts := make([]genai.Part, 0, len(images)+1)
	for _, image := range images {
		format := imageFormat(image.Bytes, image.MimeType)
		parts = append(parts, genai.ImageData(format, image.Bytes))
	}

	fmt.Printf("🔍 Sending %d job image(s) to Gemini\n", len(images))

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

ตอบกลับเป็น JSON ตามโครงสร้างนี้เท่านั้น:
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

	parts = append(parts, genai.Text(prompt))
	resp, err := s.model.GenerateContent(ctx, parts...)
	if err != nil {
		return nil, fmt.Errorf("gemini image analysis failed: %v", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini ไม่ได้ส่งผลลัพธ์กลับมา")
	}

	var responseText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if text, ok := part.(genai.Text); ok {
			responseText += string(text)
		}
	}

	responseText = strings.TrimSpace(responseText)
	responseText = strings.TrimPrefix(responseText, "```json")
	responseText = strings.TrimPrefix(responseText, "```")
	responseText = strings.TrimSuffix(strings.TrimSpace(responseText), "```")

	var extractedData dto.ExtractedJobResponse
	if err := json.Unmarshal([]byte(responseText), &extractedData); err != nil {
		return nil, fmt.Errorf("ไม่สามารถแปลงข้อมูล JSON จาก Gemini ได้: %v", err)
	}

	return &extractedData, nil
}

func imageFormat(imageBytes []byte, mimeType string) string {
	// 🛠️ 1. ตรวจจับ MIME Type จากเนื้อไฟล์จริง
	detectedMime := http.DetectContentType(imageBytes)

	// 🛠️ 2. ดึงเฉพาะชื่อ Format (เช่น png, jpeg) ห้ามมีคำว่า image/ เด็ดขาด!
	format := ""
	if strings.HasPrefix(detectedMime, "image/") {
		format = strings.TrimPrefix(detectedMime, "image/")
	} else {
		// Fallback ไปใช้ mimeType ที่รับมาจาก Controller
		format = strings.ToLower(strings.TrimSpace(mimeType))
		format = strings.TrimPrefix(format, "image/")
	}

	// 🛠️ 3. ปรับแก้ให้ตรงตามมาตรฐานที่ Gemini SDK ต้องการ
	if format == "jpg" || format == "pjpeg" {
		format = "jpeg"
	}
	if format == "" || format == "octet-stream" {
		format = "jpeg" // Default
	}

	return format
}

/*
func (s *GeminiService) legacyExtractJobInfoFromImage(ctx context.Context, imageBytes []byte, mimeType string) (*dto.ExtractedJobResponse, error) {
	prompt := `คุณคือผู้เชี่ยวชาญด้าน HR และการวิเคราะห์ประกาศรับสมัครงาน
โปรดอ่านและสกัดข้อมูลจากรูปภาพประกาศรับสมัครงานนี้ แล้วแปลงให้อยู่ในรูปแบบ JSON ตามโครงสร้างต่อไปนี้เท่านั้น:

	กฎการอ่านข้อความสำคัญ:
	1. ห้ามละเว้นข้อความในหัวข้อ "รายละเอียดงาน", "หน้าที่ความรับผิดชอบ", "คุณสมบัติผู้สมัคร" หรือหัวข้อที่มีความหมายใกล้เคียง
	2. ให้คัดลอกสาระสำคัญของหน้าที่และงานที่ต้องทำทั้งหมดลงใน responsibilities เป็นรายการแยกข้อ
	3. ให้คัดลอกคุณสมบัติทั้งหมดลงใน qualifications เป็นรายการแยกข้อ
	4. description ต้องเป็นสรุปลักษณะงานที่อ่านได้จริงอย่างน้อย 1-2 ประโยค หากในภาพมีหัวข้อรายละเอียดงาน ให้สรุปจากหัวข้อนั้นโดยตรง ห้ามปล่อยเป็นค่าว่าง
	5. ให้แยกข้อความในหัวข้อ "วิธีการสมัคร", "การสมัครงาน", "ติดต่อ", "Contact" หรือหัวข้อที่มีความหมายใกล้เคียงทั้งหมดไว้ใน contact_info เป็นข้อความเดียว โดยห้ามนำไปรวมกับ description หรือ benefits

เงื่อนไขสำหรับ suggested_criteria:
	5. เกณฑ์หลัก (Main Criterion) **ต้องแบ่งเป็นหัวข้อเดี่ยวๆ ชัดเจน ห้ามรวบรวม 2 หัวข้อเข้าด้วยกัน**
	6. แต่ละเกณฑ์หลัก **ต้องมีเกณฑ์ย่อย (Sub-criteria) จำนวน 3 ข้อถ้วนเสมอ** (ประกอบด้วย ระดับดี, ระดับปานกลาง, ระดับแย่)
	7. **กฎการให้คะแนนและคำอธิบาย (weight & description):**
   - เกณฑ์ย่อยข้อที่ 1 (ระดับดี): ต้องขึ้นต้นด้วยคำว่า **"ดี: ตรงตามประกาศ [ระบุรายละเอียด]"** และกำหนด weight เป็น **100**
   - เกณฑ์ย่อยข้อที่ 2 (ระดับปานกลาง): ต้องขึ้นต้นด้วยคำว่า **"ปานกลาง: [ระบุรายละเอียดทักษะเสริม/AI เจนเพิ่ม]"** และกำหนด weight เป็น **50**
   - เกณฑ์ย่อยข้อที่ 3 (ระดับแย่): ต้องขึ้นต้นด้วยคำว่า **"แย่: [ระบุรายละเอียดข้อจำกัด]"** และกำหนด weight เป็น **0**

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
	  "contact_info": "วิธีการสมัครและข้อมูลติดต่อ เช่น อีเมล เบอร์โทรศัพท์ เว็บไซต์ หรือ LINE",
  "suggested_criteria": [
    {
      "id": "c1",
      "title": "ชื่อเกณฑ์หลัก (หัวข้อเดี่ยว ชัดเจน ไม่รวบยอด)",
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
  ]
}`

	// ⚠️ ส่งแค่ตัวแปร format (เช่น "png") ห้ามมี "image/"
	resp, err := s.model.GenerateContent(ctx,
		genai.ImageData(format, imageBytes),
		genai.Text(prompt),
	)
	if err != nil {
		return nil, fmt.Errorf("gemini image analysis failed: %v", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini ไม่ได้ส่งผลลัพธ์กลับมา")
	}

	var responseText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if text, ok := part.(genai.Text); ok {
			responseText += string(text)
		}
	}

	// 🛠️ ลบ Markdown Code Block ทิ้งเผื่อ Gemini ส่งกลับมาเป็น ```json ... ```
	responseText = strings.TrimSpace(responseText)
	if strings.HasPrefix(responseText, "```json") {
		responseText = strings.TrimPrefix(responseText, "```json")
		responseText = strings.TrimSuffix(responseText, "```")
	} else if strings.HasPrefix(responseText, "```") {
		responseText = strings.TrimPrefix(responseText, "```")
		responseText = strings.TrimSuffix(responseText, "```")
	}

	var extractedData dto.ExtractedJobResponse
	if err := json.Unmarshal([]byte(responseText), &extractedData); err != nil {
		fmt.Printf("❌ JSON Parse Error: \n%s\n", responseText)
		return nil, fmt.Errorf("ไม่สามารถแปลงข้อมูล JSON จาก Gemini ได้: %v", err)
	}

	return &extractedData, nil
}
*/

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

	resp, err := s.model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("gemini generate criteria failed: %v", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini ไม่ได้ส่งผลลัพธ์กลับมา")
	}

	var responseText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if text, ok := part.(genai.Text); ok {
			responseText += string(text)
		}
	}

	responseText = strings.TrimSpace(responseText)
	if strings.HasPrefix(responseText, "```json") {
		responseText = strings.TrimPrefix(responseText, "```json")
		responseText = strings.TrimSuffix(responseText, "```")
	} else if strings.HasPrefix(responseText, "```") {
		responseText = strings.TrimPrefix(responseText, "```")
		responseText = strings.TrimSuffix(responseText, "```")
	}

	var criteria []dto.MainCriterionDTO
	if err := json.Unmarshal([]byte(responseText), &criteria); err != nil {
		return nil, fmt.Errorf("ไม่สามารถแปลงข้อมูล JSON จาก Gemini ได้: %v", err)
	}

	return criteria, nil
}

func (s *GeminiService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}
