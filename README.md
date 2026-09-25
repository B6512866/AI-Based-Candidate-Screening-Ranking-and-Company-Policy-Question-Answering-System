# AI-Based Candidate Screening, Ranking and Company Policy Question Answering System
### ระบบคัดกรองพร้อมจัดลำดับผู้สมัครงานและระบบตอบคำถามด้านนโยบายระเบียบองค์กรด้วยปัญญาประดิษฐ์

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://render.com)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Email](https://img.shields.io/badge/Email-Resend-black?logo=resend)](https://resend.com)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Typhoon AI](https://img.shields.io/badge/AI-Typhoon%202.5%20%7C%20Gemini-orange)](#)

ระบบเว็บแอปพลิเคชันสำหรับฝ่ายทรัพยากรบุคคล (HR) และพนักงาน ที่ผสานพลังของ **AI (Typhoon 2.5, Typhoon OCR และ Google Gemini)** เพื่อ:
1. **คัดกรองผู้สมัครงานอัตโนมัติ (Candidate Screening & Ranking):** สกัดข้อมูลเรซูเม่อัตโนมัติด้วย OCR พร้อมวิเคราะห์จับคู่ทักษะและจัดระดับ Tier-list (Tier S, A, B, C)
2. **ระบบตอบคำถามนโยบายและสวัสดิการองค์กร (HR Policy Advisor 24/7):** ผู้ช่วย AI Chatbot อัจฉริยะแบบเต็มจอสำหรับพนักงานในการสอบถามกฎระเบียบ นโยบาย และสวัสดิการบริษัท
3. **ระบบจัดการสัมภาษณ์และแจ้งเตือน:** ส่งอีเมลแจ้งผลการคัดกรองและนัดหมายสัมภาษณ์งานผ่านระบบ Cloud Email API

---

## 🌐 Cloud Services & Infrastructure

* **Supabase (Database):** [https://supabase.com](https://supabase.com)
* **Vercel (Frontend Hosting):** [https://vercel.com](https://vercel.com)
* **Render (Backend Hosting):** [https://render.com](https://render.com)
* **Resend (Email Service):** [https://resend.com](https://resend.com)

---

## 👥 ทีมพัฒนา

| รหัสนักศึกษา | ชื่อ-นามสกุล         | ตำแหน่งที่รับผิดชอบ |
| ------------ | -------------------- | -------------------- |
| C6600013     | นายภาณุ อุตะโว       | ระบบตำแหน่งงาน ระบบประเมิน |
| B6512866     | นายเจษฎา เชือดขุนทด  | ระบบตอบคำถาม ระบบวิเคราะห์และจัดลำดับผู้สมัคร |
| B6607012     | นายธนัช ตั้งมั่น     | ระบบนัดสัมภาษณ์ ระบบแจ้งผลสัมภาษณ์ |
| B6630409     | นายอิสรภาพ วาตุรัมย์ | ระบบนัดสัมภาษณ์ ระบบแจ้งผลสัมภาษณ์ |

---

## 📂 แหล่งข้อมูลโครงการ (Project Resources)

* 📁 **Google Drive (รวมเอกสารทั้งหมด):** [คลิกเพื่อเปิดไดรฟ์](https://drive.google.com/drive/folders/1e0hGde6mezr3--_qogKZiiOKSeqsBlQV)
* 🎨 **Figma Design (UI/UX):** [คลิกเพื่อเปิด Figma](https://www.figma.com/design/V971pjpu3dWQurRk6iDN2J/Capstone-Project?node-id=0-1&p=f)
* 🗂️ **System Diagram & ER Diagram (Draw.io):** [คลิกเพื่อเปิด Diagram](https://app.diagrams.net/#G1i2sgSSXXMStjnNqd5lQICJVYMljOgWD8#%7B%22pageId%22%3A%223Pbtw5pC1sATcA8mYLLV%22%7D)
* 📊 **สไลด์นำเสนอ (Canva Presentation):** [คลิกเพื่อเปิดสไลด์](https://www.canva.com/design/DAHJzGoEurk/ozo62N15eb9iaf3uQIYT1g/edit)

---

## 🔑 บัญชีเข้าใช้งานสำหรับทดสอบ (Default Accounts)

ระบบมีข้อมูลเริ่มต้น (Seed Data) สำหรับการทดสอบ ดังนี้:

| สิทธิ์การใช้งาน (Role) | อีเมล (Email) | รหัสผ่าน (Password) | สิทธิ์และหน้าที่ |
| ---------------------- | ------------- | -------------------- | ---------------- |
| **HR Manager**         | `hr@gmail.com` | `password123`        | จัดการตำแหน่งงาน, คัดกรองผู้สมัคร, จัดสัมภาษณ์, จัดการเอกสารนโยบาย |
| **Employee (พนักงาน)**  | `test@gmail.com`| `password123`        | ใช้งาน AI Advisor ตอบคำถามนโยบายและสวัสดิการ, ตรวจสอบข้อมูลส่วนตัว |

---

## 📧 ระบบแจ้งเตือนทางอีเมลและข้อกำหนดในการทดสอบ (Email Notification System)

ระบบมีฟังก์ชันส่งอีเมลอัตโนมัติ 2 ส่วนหลัก ได้แก่:
1. **อีเมลตอบรับและยืนยันรหัสใบสมัคร (Application Confirmation):** ส่งรหัส `APP-xxxxx` ให้ผู้สมัครทันทีที่กดส่งใบสมัครผ่านหน้าเว็บ สำหรับนำไปใช้เช็คสถานะ
2. **อีเมลแจ้งนัดหมายสัมภาษณ์งาน (Interview Invitation):** ส่งรายละเอียด วัน เวลา รูปแบบสัมภาษณ์ (Online/Onsite) พร้อมลิงก์ตอบรับหรือขอเลื่อนนัดหมาย

### ⚠️ หมายเหตุสำคัญสำหรับการทดสอบบนระบบ Cloud (Render Free Tier)
* **การส่งอีเมลผ่าน Resend REST API (พอร์ต 443):** บน Render Free Tier พอร์ต SMTP ปกติ (พอร์ต 587/465) ถูกบล็อคโดยไฟร์วอลล์ ระบบจึงเชื่อมต่อผ่าน HTTPS API ของ **Resend**
* **ข้อจำกัดของ Sandbox Mode (โดเมนเริ่มต้น `onboarding@resend.dev`):**
  > 📌 **สำหรับบัญชีทดสอบฟรีที่ยังไม่ได้ผูก Custom Domain:**  
  > นโยบายความปลอดภัยของ Resend จะอนุญาตให้ส่งอีเมลทดสอบไปยัง **อีเมลของเจ้าของบัญชีผู้ลงทะเบียนเท่านั้น** คือ:  
  > 👉 **`guymini02479@gmail.com`**  
  > หากกรอกอีเมลอื่นในขั้นตอนทดสอบสมัครงานหรือส่งคำเชิญสัมภาษณ์ ระบบของ Resend จะปฏิเสธการส่ง (403 Forbidden)
  > 
  > 💡 **คำแนะนำในการทดสอบระบบ:** โปรดกรอกอีเมลเป็น `guymini02479@gmail.com` ในช่องอีเมลผู้สมัคร เพื่อทดสอบรับอีเมลตอบรับรหัสใบสมัครและอีเมลเชิญสัมภาษณ์จริงในกล่องจดหมาย Inbox

### 🌐 การเปิดใช้งานส่งถึงทุกอีเมลในระดับ Production (สำหรับผู้ดูแลระบบ)
หากต้องการให้ระบบส่งอีเมลไปยังผู้สมัครได้ทุกคนโดยไม่จำกัดเฉพาะอีเมลทดสอบ สามารถดำเนินการได้ดังนี้:
1. **ยืนยันโดเมนของตนเองบน Resend (Custom Domain):**
   - เพิ่มโดเมนของบริษัทใน [resend.com/domains](https://resend.com/domains) และตั้งค่า DNS Records ให้เรียบร้อย
   - เมื่อยืนยันโดเมนแล้ว ระบบจะสามารถส่งออกไปยังผู้สมัครทุกคนได้อย่างสมบูรณ์
2. **ใช้งานผู้ให้บริการ Email API ทางเลือก (เช่น Brevo หรือ Webhook):**
   - รองรับการเชื่อมต่อผ่าน REST API พอร์ต HTTPS 443 เพื่อกระจายอีเมลไปยังผู้สมัครภายนอก

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend
- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React Icons
- **Deployment:** Vercel

### Backend
- **Language:** Go (Golang) 1.22+
- **Framework:** Gin Web Framework, GORM
- **Email Service:** Unified Multi-Engine (Resend REST API, Brevo REST API, SMTP) ผ่าน HTTPS Port 443
- **Deployment:** Render

### Database & Storage
- **Cloud Database:** Supabase (PostgreSQL 15 พร้อม Connection Pooler)
- **Local Database (ตัวเลือกเสริม):** PostgreSQL 15 ผ่าน Docker Compose

### AI & Machine Learning
- **Typhoon AI Engine:** Python FastAPI, PyTorch (CUDA 12.8 / Ampere / Ada / Blackwell), Hugging Face Transformers
  - **Typhoon 2.5 (1.5B/8B):** โมเดลสนทนาภาษาไทยสำหรับตอบคำถามนโยบายและวิเคราะห์ทักษะ
  - **Typhoon OCR 1.5:** โมเดล Vision-Language สกัดข้อความจากเรซูเม่และเอกสาร PDF/รูปภาพ
- **Google Gemini API:** Gemini 1.5 Flash / Gemini 2.5 Flash สำหรับการประมวลผลบนคลาวด์ 24/7

---

## 🖥️ ความต้องการของระบบสำหรับการรันโมเดล Local (Hardware Requirements)

*(กรณีต้องการรันโมเดล Typhoon บนเครื่องตนเอง)*

| อุปกรณ์ | สเปคขั้นต่ำ (Minimum) | สเปคแนะนำ (Recommended) |
| ------- | ---------------------- | ------------------------ |
| **CPU** | Intel Core i5 (Gen 10+) / Ryzen 5 (3000+) | Intel Core i7 (Gen 12+) / Ryzen 7 (5000+) ขึ้นไป |
| **RAM** | 16 GB | 32 GB |
| **GPU** | NVIDIA GTX 1660 Ti / RTX 2060 (VRAM 6 GB) | NVIDIA RTX 3060 / 4060 / 5060 (VRAM 12 GB+) |
| **Storage** | SSD พื้นที่ว่าง 20 GB | NVMe M.2 SSD พื้นที่ว่าง 30 GB |

---

## 🚀 ขั้นตอนการติดตั้งและรันในเครื่อง (Local Setup)

### สิ่งที่ต้องติดตั้งล่วงหน้า (Prerequisites)
1. **Node.js LTS (v20+ หรือ v22+)**
2. **Go (v1.22+)**
3. **Python (v3.10+)**
4. **Docker Desktop** (หากต้องการรัน PostgreSQL ภายในเครื่อง)

---

### ขั้นตอนที่ 1: ตั้งค่าฐานข้อมูล (Database)

#### วิธีที่ A: ใช้ Cloud Database ของ Supabase (แนะนำ - ไม่ต้องลง Docker)
นำค่า Connection จาก Supabase มาใส่ใน `backend/.env`

#### วิธีที่ B: ใช้ Local Docker
```bash
docker compose up -d
```

สร้างไฟล์ `backend/.env`:
```env
# การเชื่อมต่อ Database (เลือก Local หรือ Supabase)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=hr_system
JWT_SECRET=your_jwt_secret_key_123

# Cloud AI & Email API Keys
GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_api_key
BREVO_API_KEY=your_brevo_api_key
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

---

### ขั้นตอนที่ 2: ติดตั้งและเปิด Python AI Engine (Typhoon)

```bash
# 1. สร้างและเปิดใช้งาน Virtual Environment
cd backend
python -m venv .venv

# สำหรับ Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# สำหรับ Windows CMD:
.\.venv\Scripts\activate.bat

# 2. ติดตั้ง Dependencies
pip install -r typhoon/requirements.txt

# 3. ดาวน์โหลดโมเดล Typhoon ล่วงหน้า
python typhoon/download_models.py
```

---

### ขั้นตอนที่ 3: สตาร์ท Backend API (Go & Python)

```bash
cd backend
go run main.go
```
*ระบบจะเปิดทั้ง **Go API (Port 8080)** และ **Typhoon Engine (Port 8000)** โดยอัตโนมัติ*

---

### ขั้นตอนที่ 4: ติดตั้งและสตาร์ท Frontend (React Vite)

สร้างไฟล์ `frontend/.env`:
```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
VITE_TYPHOON_API_URL=http://localhost:8000
```

ติดตั้งและเริ่มทำงาน:
```bash
cd frontend
npm install
npm run dev
```
เปิดบราวเซอร์ไปที่: `http://localhost:5173`

---

## 🌐 การเชื่อมต่อโมเดล Local ออกสู่ภายนอก (LocalTunnel)

หากรันโมเดล AI ในเครื่องและต้องการให้เว็บไซต์บน Vercel และ Render เรียกใช้งานโมเดลได้:

**1. รัน Typhoon AI Engine (Terminal ที่ 1):**
```bash
cd backend/typhoon
python main.py
```

**2. เปิด LocalTunnel เชื่อมต่อออกสู่ภายนอก (Terminal ที่ 2):**
```bash
npx localtunnel --port 8000 --subdomain hireai-typhoon
```
นำ URL ที่ได้ (เช่น `https://hireai-typhoon.loca.lt` หรือ URL สุ่มใหม่ที่ปรากฏในเทอร์มินัล) ไปอัปเดตใส่ใน Environment Variables:
- **Vercel (Frontend):** ตั้งค่าตัวแปร `VITE_TYPHOON_API_URL` แล้วกด Redeploy
- **Render (Backend):** ตั้งค่าตัวแปร `TYPHOON_API_URL` แล้วกด Save Changes
*(หากรันคำสั่งแล้วได้ URL ใหม่ ให้คัดลอก URL ใหม่ไปอัปเดตที่ Vercel และ Render ทุกครั้ง)*

---

## 🧹 การจัดการข้อมูล (Database Maintenance & Reset)

### 1. ล้างข้อมูลทดสอบผ่าน Supabase SQL Editor (Cloud)
หากใช้งานบน Supabase Dashboard สามารถไปที่เมนู **SQL Editor** (`>_`) แล้วรันคำสั่ง SQL ด้านล่างนี้เพื่อล้างข้อมูลทดสอบ (ผู้สมัคร, การสัมภาษณ์, ผลคัดกรอง AI, ประวัติแชต) พร้อมรีเซ็ตเลข ID กลับไปเริ่มต้นที่ 1 โดยยังคงรักษาบัญชีผู้ใช้หลัก (HR/Employee), ตำแหน่งงาน และเอกสารนโยบายบริษัทเอาไว้ครบถ้วน:

```sql
TRUNCATE TABLE applications, candidates, interviews, ai_screenings, chat_messages, reports RESTART IDENTITY CASCADE;
```

### 2. ล้างข้อมูลทดสอบผ่านคำสั่ง Go (Terminal)
สามารถรันสคริปต์ในเครื่องที่โฟลเดอร์ `backend/` ได้เช่นกัน:

```bash
cd backend
go run reset_db.go
```

### 3. ล้างข้อมูลทั้งหมดใน Docker (Local Reset)
```bash
docker compose down -v
```

---

## 📄 License
This project is licensed under the MIT License.
