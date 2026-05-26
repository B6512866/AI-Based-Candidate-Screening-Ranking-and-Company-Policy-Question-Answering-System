# 🤖 AI-Powered HR System
### ระบบ HR อัจฉริยะ | CPE Pre Cap-Stone Project G12

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go](https://img.shields.io/badge/Backend-Go-00ADD8?logo=go)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)
![DeepSeek](https://img.shields.io/badge/OCR-DeepSeek-1A6FFF)
![Llama](https://img.shields.io/badge/Screening-Llama%203-6B4EFF)
![Typhoon2](https://img.shields.io/badge/Chatbot-Typhoon%202-0D9488)

---

## 📌 Overview / ภาพรวม

ระบบ HR อัจฉริยะที่ใช้ AI ครบวงจร ช่วยลดภาระงาน HR ตั้งแต่การอ่านใบสมัคร ไปจนถึงการตอบคำถามพนักงาน

| Module | AI Model | หน้าที่ |
|--------|----------|---------|
| 📄 OCR | **DeepSeek OCR** | อ่านและดึงข้อมูลจาก Resume อัตโนมัติ |
| 🦙 Screening | **Meta Llama 3** | วิเคราะห์ Resume และให้คะแนน 0–100 |
| 🌪️ Chatbot | **Typhoon 2** | ตอบคำถามนโยบาย HR ภาษาไทย ตลอด 24 ชม. |

---

## 🏗️ System Architecture / สถาปัตยกรรมระบบ

```
[Resume / Form]
      │
      ▼
[DeepSeek OCR] ──► Extract Text
      │
      ▼
[Llama 3] ──► Score 0–100 + Ranking
      │
      ▼
[HR Dashboard] ──► Review / Approve / Reject
      │
[Typhoon 2 Chatbot] ◄──► Employee Q&A (24/7)
```

---

## 🛠️ Tools & Framework / เครื่องมือที่ใช้

### Database
- 🐘 **PostgreSQL** — จัดเก็บข้อมูลผู้สมัคร นโยบาย และประวัติการสนทนา

### Backend
- 🐹 **Go (Golang)** + **Gin** — REST API, AI integration, business logic

### Frontend
- ⚛️ **React JS** — UI สำหรับ HR Dashboard และ Employee Chatbot
- 🟦 **TypeScript** — Type-safe frontend development
- 🟠 **HTML5** + 🔵 **CSS3** — Structure & Styling

### AI Models
- 🔵 **DeepSeek OCR** — Optical Character Recognition สำหรับเอกสาร
- 🟣 **Meta Llama 3** — Open-source LLM สำหรับคัดกรองและให้คะแนน
- 🟢 **Typhoon 2** (SCB10X) — Thai LLM ต่อยอดจาก Llama สำหรับ Chatbot ภาษาไทย

---

## ✨ Features / ฟีเจอร์หลัก

### 👔 HR Side (ฝั่ง HR)
- ✅ อัปโหลดใบสมัคร → OCR อ่านอัตโนมัติ
- ✅ Llama วิเคราะห์และให้คะแนนผู้สมัคร 0–100
- ✅ จัดอันดับผู้สมัครตามความเหมาะสม
- ✅ ปุ่ม อนุมัติ / สัมภาษณ์ / ปฏิเสธ ในหน้าเดียว
- ✅ Filter ตามสถานะและตำแหน่งงาน

### 👤 Employee Side (ฝั่งพนักงาน)
- ✅ AI Chatbot ตอบนโยบาย HR ภาษาไทย-อังกฤษ
- ✅ อ้างอิงแหล่งข้อมูลจากเอกสารนโยบายจริง
- ✅ ถามได้ตลอด 24 ชั่วโมง ไม่ต้องรอ HR

---

## 🚀 Getting Started / วิธีติดตั้ง

### Prerequisites
```bash
Go 1.21+
Node.js 18+
PostgreSQL 15+
```

### 1. Clone Repository
```bash
git clone https://github.com/B6512866/AI-Based-Recruitment-Screening-and-Employee-Advisory-System.git
cd AI-Based-Recruitment-Screening-and-Employee-Advisory-System
```

### 2. Setup Database
```bash
psql -U postgres -c "CREATE DATABASE hr_system;"
psql -U postgres -d hr_system -f ./database/schema.sql
```

### 3. Environment Variables
```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=your_password

# AI APIs
DEEPSEEK_API_KEY=your_deepseek_key
LLAMA_API_KEY=your_llama_key
TYPHOON_API_KEY=your_typhoon_key
```

### 4. Run Backend (Go)
```bash
cd backend
go mod tidy
go run main.go
# Server starts at http://localhost:8080
```

### 5. Run Frontend (React)
```bash
cd frontend
npm install
npm run dev
# App starts at http://localhost:3000
```

---

## 📁 Project Structure / โครงสร้างโปรเจกต์

```
AI-Based-Recruitment-Screening-and-Employee-Advisory-System/
├── backend/
│   ├── main.go
│   ├── handlers/
│   │   ├── ocr.go          # DeepSeek OCR integration
│   │   ├── screening.go    # Llama scoring logic
│   │   └── chatbot.go      # Typhoon 2 chatbot
│   ├── models/
│   └── database/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx     # HR dashboard
│   │   │   ├── Candidates.tsx    # ผู้สมัคร
│   │   │   └── Chatbot.tsx       # AI Chatbot
│   │   └── components/
├── database/
│   └── schema.sql
├── company_docs/
│   └── hr_policy.txt       # Mock HR policy data
├── .env.example
└── README.md
```

---

## 🧪 Test Results / ผลการทดสอบ

### DeepSeek OCR
| Input | Output |
|-------|--------|
| ฟอร์ม Resume สแกน (PDF/Image) | ข้อความที่อ่านได้ครบถ้วน ทั้งไทย-อังกฤษ |
| ตาราง Education / Work Experience | ข้อมูลแยก field ถูกต้อง |

### Llama 3 Screening
| ผู้สมัคร | คะแนน | สถานะ |
|---------|-------|-------|
| Candidate A | 92/100 | ✅ Shortlisted |
| Candidate B | 78/100 | ✅ Shortlisted |
| Candidate C | 65/100 | ❌ Not shortlisted |

> เกณฑ์: คะแนน ≥ 70 = ผ่านการคัดเลือก

### Typhoon 2 Chatbot
```
User:  ลาป่วยได้กี่วันต่อปี?
Bot:   ตามนโยบายทรัพยากรบุคคล บริษัท Demo จำกัด
       พนักงานสามารถลาป่วยได้สูงสุด 30 วันต่อปี
       โดยไม่ต้องมีใบรับรองแพทย์สำหรับการลาไม่เกิน 2 วัน
       📎 อ้างอิง: hr_policy.txt
```

---

## 🤝 AI Model Background / ที่มาของ AI

| Model | พัฒนาโดย | ปีที่เปิดตัว | จุดเด่น |
|-------|---------|------------|--------|
| **DeepSeek OCR** | DeepSeek (จีน) | 2025 | OCR ความแม่นยำสูง รองรับเอกสารซับซ้อน |
| **Meta Llama 3** | Meta AI | 2024 | Open-source LLM ระดับโลก |
| **Typhoon 2** | SCB 10X (ไทย) | 2024 | Fine-tuned จาก Llama สำหรับภาษาไทยโดยเฉพาะ |

> 💡 **Note:** Typhoon 2 ต่อยอดจาก Meta Llama 3 โดย SCB10X นำมา fine-tune ด้วยข้อมูลภาษาไทย ทำให้เข้าใจบริบทและวัฒนธรรมไทยได้ดียิ่งขึ้น

---

## 👥 Team / ทีมพัฒนา

**CPE Pre Cap-Stone Project G12**

| ชื่อ | Role |
|-----|------|
| สมาชิก 1 | Backend (Go) + AI Integration |
| สมาชิก 2 | Frontend (React + TypeScript) |
| สมาชิก 3 | Database + DevOps |
| สมาชิก 4 | UI/UX Design + Testing |

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  <b>CPE Pre Cap-Stone Project G12</b><br>
  Built with ❤️ using DeepSeek OCR · Meta Llama 3 · Typhoon 2
</div>
