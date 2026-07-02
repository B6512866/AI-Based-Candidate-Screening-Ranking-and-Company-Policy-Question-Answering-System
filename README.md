# AI-Based Candidate Screening, Ranking and Company Policy Question Answering System
# ระบบคัดกรองพร้อมจัดลำดับผู้สมัครงานและระบบตอบคำถามด้านนโยบายระเบียบองกรณ์ด้วยปัญญาประดิษฐ์ 

ระบบคัดกรองผู้สมัครงานด้วย AI ที่ช่วยลดภาระงาน HR ตั้งแต่การอ่านใบสมัครโดยการคัดกรองผู้สมัครแบบจัด Terilist ด้วย Typhoon OCR
ระบบตอบคำถามด้านนโยบายบริษัทหรือกฎระเบียบองกรณ์ด้วย Typhoon 2.5 Chatbot ตลอด 24 ชั่วโมง

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
  
## 🔑 บัญชีเข้าใช้งานสำหรับทดสอบ (Default Accounts)

เมื่อสั่งรันครั้งแรก ระบบจะทำการสร้างข้อมูลเริ่มต้น (Seed Data) ให้อัตโนมัติ สามารถใช้บัญชีด้านล่างเพื่อทดสอบระบบได้ทันที:

| สิทธิ์การใช้งาน (Role) | อีเมล (Email) | รหัสผ่าน (Password) | หน้าเริ่มต้น |
| ---------------------- | ------------- | -------------------- | ------------ |
| **HR Manager**         | `hr@gmail.com` | `password123`        | `/hr/dashboard` |
| **Employee (พนักงาน)**  | `test@gmail.com`| `password123`        | `/employee/chat` |
---

## สิ่งที่ต้องติดตั้งก่อนเริ่ม

* **Docker & Docker Compose** (สำหรับ PostgreSQL Database)
* **Go 1.20+** (สำหรับ Backend API)
* **Node.js 18+ & npm** (สำหรับ Frontend React)
* **Python 3.10+** (สำหรับ Typhoon AI Engine)

---

## 🖥️ ความต้องการของระบบ (Hardware Requirements)

สำหรับการรันโมเดล **Typhoon AI** (Typhoon 2.5 & Typhoon OCR):

| อุปกรณ์ | สเปคขั้นต่ำ (Minimum) | สเปคแนะนำ (Recommended) |
| ------- | ---------------------- | ------------------------ |
| **CPU** | Intel Core i5 (Gen 10+) / Ryzen 5 (3000+) | Intel Core i7 (Gen 12+) / Ryzen 7 (5000+) |
| **RAM** | 16 GB | 32 GB |
| **GPU** | NVIDIA GTX 1660 Ti / RTX 2060 (VRAM 6 GB) | NVIDIA RTX 3060 (VRAM 12 GB+) ขึ้นไป |
| **Storage** | SSD พื้นที่ว่าง 20 GB | NVMe M.2 SSD พื้นที่ว่าง 30 GB |

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
```

### 2. การใช้งาน Backend

```bash
cd backend
go run main.go
```
> 💡 **หมายเหตุเกี่ยวกับการดาวน์โหลดโมเดล AI:**
> - ไฟล์โมเดลมีขนาดใหญ่ จึงไม่ได้ถูก commit ขึ้น GitHub 
> - เมื่อสั่งรันครั้งแรก ระบบจะทำการ **ดาวน์โหลด Weights ของโมเดลจาก Hugging Face ให้อัตโนมัติ** ขอเพียงเครื่องเชื่อมต่ออินเทอร์เน็ต
> - หากต้องการดาวน์โหลดโมเดลล่วงหน้า สามารถรันสคริปต์: `python typhoon/download_models.py`
> 💡 **หมายเหตุ:** `go run main.go` จะทำการสตาร์ททั้ง **Go Backend (Port 8080)** และ **Typhoon AI Service (Port 8000)** ควบคู่กันไปให้อัตโนมัติ

### 4. รัน Frontend Service (React Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend จะ run ที่ `http://localhost:5173`

---

## 📂 Project Resources

* **Google Drive (รวมเอกสารทั้งหมด):** [ลิงก์ไดรฟ์](https://drive.google.com/drive/folders/1e0hGde6mezr3--_qogKZiiOKSeqsBlQV)
* **Figma Design (UI/UX):** [ลิงก์ Figma](https://www.figma.com/design/V971pjpu3dWQurRk6iDN2J/Capstone-Project?node-id=0-1&p=f)
* **Draw.io (System Diagram):** [ลิงก์ Diagram](https://app.diagrams.net/#G1i2sgSSXXMStjnNqd5lQICJVYMljOgWD8#%7B%22pageId%22%3A%223Pbtw5pC1sATcA8mYLLV%22%7D)
* **Canva Presentation:** [ลิงก์ Presentation](https://www.canva.com/design/DAHJzGoEurk/ozo62N15eb9iaf3uQIYT1g/edit)

---

## 🛠️ Tech Stack

### Backend & AI
* **Go** (Gin Framework, GORM)
* **Python 3.10** (FastAPI, Transformers, PyTorch)
* **Typhoon AI** (Typhoon 2.5 & Typhoon OCR)

### Frontend
* **React 19** & **TypeScript**
* **Vite** & **TailwindCSS**
* **Lucide React** (Icons)

### Database & Infrastructure
* **PostgreSQL 15**
* **Docker** & **Docker Compose**

---

## 🧹 การจัดการข้อมูล (Database Maintenance)

หากต้องการรีเซ็ตหรือลบข้อมูลในฐานข้อมูล:

```bash
# หยุดการทำงาน containers
docker compose down

# ลบข้อมูลใน volume ทั้งหมด (Reset Database)
docker compose down -v
```
