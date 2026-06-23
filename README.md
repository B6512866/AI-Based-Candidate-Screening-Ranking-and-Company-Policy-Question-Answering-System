# AI-Based Recruitment Screening and Employee Advisory System

ระบบคัดกรองผู้สมัครงานและที่ปรึกษาพนักงานด้วย AI ที่ช่วยลดภาระงาน HR ตั้งแต่การอ่านใบสมัครด้วย DeepSeek OCR คัดกรองและให้คะแนนผู้สมัครด้วย Meta Llama 3 และตอบคำถามนโยบายบริษัทด้วย Typhoon 2 Chatbot ตลอด 24 ชั่วโมง

---

## 👥 ทีมพัฒนา

| รหัสนักศึกษา | ชื่อ-นามสกุล         |
| ------------ | -------------------- |
| C6600013     | นายภาณุ อุตะโว       |
| B6512866     | นายเจษฎา เชือดขุนทด  |
| B6607012     | นายธนัช ตั้งมั่น     |
| B6630409     | นายอิสรภาพ วาตุรัมย์ |

---

## 📂 Project Resources

### 📁 เอกสารและไฟล์โครงการ

* Google Drive (รวมเอกสารทั้งหมด)
  https://drive.google.com/drive/folders/1e0hGde6mezr3--_qogKZiiOKSeqsBlQV

### 🎨 UI/UX Design

* Figma Design
  https://www.figma.com/design/V971pjpu3dWQurRk6iDN2J/Capstone-Project?node-id=0-1&p=f

### 🗂️ Database & System Diagram

* Draw.io (ER Diagram / Data Flow Diagram)
  https://app.diagrams.net/#G1i2sgSSXXMStjnNqd5lQICJVYMljOgWD8#%7B%22pageId%22%3A%223Pbtw5pC1sATcA8mYLLV%22%7D

### 📊 Presentation

* Canva Presentation
  https://www.canva.com/design/DAHJzGoEurk/ozo62N15eb9iaf3uQIYT1g/edit

---

## สิ่งที่ต้องติดตั้งก่อนเริ่ม

* Docker
* Go
* Node.js

---

## ขั้นตอนการใช้งาน

### 1. เริ่มเชื่อมต่อฐานข้อมูลโดย PostgreSQL ต่อเข้ากับ Docker Compose

```bash
docker compose up -d
```

> การตั้งค่า database อยู่ใน `.env` file

สร้าง `.env` ใน folder `backend/` และใส่ค่าดังนี้:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=hr_system
JWT_SECRET=mysecretkey123
DEEPSEEK_API_KEY=
LLAMA_API_KEY=
TYPHOON_API_KEY=
```

### 2. การใช้งาน Backend

```bash
cd backend
go run main.go
```

Backend จะ run ที่ `http://localhost:8080`

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend จะ run ที่ `http://localhost:5173`

---

## วิธีลบข้อมูล

1. ทำการหยุดและลบ containers:

```bash
docker compose down
```

2. ลบ volume ทิ้ง:

```bash
docker compose down -v
```

---

## การเชื่อมต่อ Database ใน VS Code

ติดตั้ง Extension **PostgreSQL** (Chris Kolkman) แล้วใช้ค่าดังนี้:

| ช่อง            | ค่าที่ใส่           |
| --------------- | ------------------- |
| Host            | 127.0.0.1           |
| PostgreSQL user | postgres            |
| Password        | postgres123         |
| Port            | 5432                |
| Use SSL?        | Standard Connection |
| Database        | hr_system           |

---

## Tech Stack

### Backend

* Go
* Gin Framework
* GORM

### Frontend

* React
* TypeScript
* Vite

### Database

* PostgreSQL 15

### Infrastructure

* Docker
* Docker Compose

### AI Services

* DeepSeek OCR
* Meta Llama 3
* Typhoon 2

---

## ระบบที่พัฒนา

### Recruitment Screening Module

* อัปโหลด Resume ของผู้สมัคร
* ดึงข้อมูลอัตโนมัติด้วย OCR
* วิเคราะห์คุณสมบัติผู้สมัครด้วย AI
* คำนวณคะแนนความเหมาะสมกับตำแหน่งงาน
* แสดงผลลัพธ์พร้อมเหตุผลประกอบการตัดสินใจ

### Employee Advisory Module

* Chatbot ตอบคำถามนโยบายบริษัท
* ค้นหาข้อมูลจากเอกสารภายในองค์กร
* ให้บริการตลอด 24 ชั่วโมง
* รองรับภาษาไทย
