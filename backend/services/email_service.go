package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
)

// getSMTPConfig ดึงการตั้งค่า SMTP และแก้ไข typo อัตโนมัติ
func getSMTPConfig() (string, string) {
	fromEmail := strings.TrimSpace(config.Env.SMTPEmail)
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := strings.TrimSpace(strings.ReplaceAll(config.Env.SMTPPassword, " ", ""))
	if appPassword == "" || appPassword == "gjsrveyqgsixfvlk" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	return fromEmail, appPassword
}

// sendViaResend ส่งอีเมลผ่าน Resend HTTP REST API (พอร์ต 443 — ใช้งานบน Render Free ได้ 100%)
func sendViaResend(apiKey string, fromEmail string, toEmail string, subject string, htmlBody string) error {
	from := fromEmail
	if strings.HasSuffix(from, "@gmail.com") || !strings.Contains(from, "@") {
		from = "HireAI <onboarding@resend.dev>"
	}
	payload := map[string]interface{}{
		"from":    from,
		"to":      []string{toEmail},
		"subject": subject,
		"html":    htmlBody,
	}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("resend request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend error (%d): %s", resp.StatusCode, string(b))
	}
	return nil
}

// sendViaBrevo ส่งอีเมลผ่าน Brevo (Sendinblue) HTTP API (พอร์ต 443 — ใช้งานบน Render Free ได้ 100%)
func sendViaBrevo(apiKey string, fromEmail string, toEmail string, subject string, htmlBody string) error {
	payload := map[string]interface{}{
		"sender": map[string]string{
			"name":  "HireAI Recruitment",
			"email": fromEmail,
		},
		"to": []map[string]string{
			{"email": toEmail},
		},
		"subject":     subject,
		"htmlContent": htmlBody,
	}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return err
	}
	req.Header.Set("api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("brevo request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("brevo error (%d): %s", resp.StatusCode, string(b))
	}
	return nil
}

// sendEmailUnified ส่งอีเมลแบบ Unified (ตรวจจับ Resend API -> Brevo API -> Gmail SMTP)
func sendEmailUnified(toEmail string, subject string, htmlBody string) error {
	fromEmail, appPassword := getSMTPConfig()

	// 1. ลอง Resend HTTP API (Port 443)
	if config.Env.ResendAPIKey != "" {
		fmt.Printf("[Email Service] 🚀 Sending via Resend HTTP API to %s...\n", toEmail)
		err := sendViaResend(config.Env.ResendAPIKey, fromEmail, toEmail, subject, htmlBody)
		if err == nil {
			fmt.Printf("[Email Service] ✅ Resend sent successfully to %s\n", toEmail)
			return nil
		}
		fmt.Printf("[Email Service] ⚠️ Resend failed: %v, falling back...\n", err)
	}

	// 2. ลอง Brevo HTTP API (Port 443)
	if config.Env.BrevoAPIKey != "" {
		fmt.Printf("[Email Service] 🚀 Sending via Brevo HTTP API to %s...\n", toEmail)
		err := sendViaBrevo(config.Env.BrevoAPIKey, fromEmail, toEmail, subject, htmlBody)
		if err == nil {
			fmt.Printf("[Email Service] ✅ Brevo sent successfully to %s\n", toEmail)
			return nil
		}
		fmt.Printf("[Email Service] ⚠️ Brevo failed: %v, falling back...\n", err)
	}

	// 3. Fallback เป็น SMTP Port 587 (สำหรับ Localhost หรือเมื่อเปิดพอร์ต SMTP)
	fmt.Printf("[Email Service] 📧 Sending via Gmail SMTP (port 587) to %s...\n", toEmail)
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	subjectHeader := fmt.Sprintf("Subject: %s\r\n", subject)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)
	msg := []byte(subjectHeader + headers + fromHeader + toHeader + htmlBody)
	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("[Email Service] ❌ SMTP send failed to %s: %v\n", toEmail, err)
		return err
	}
	fmt.Printf("[Email Service] ✅ SMTP sent successfully to %s\n", toEmail)
	return nil
}

// SendApplicationEmail ส่งอีเมลแจ้งเตือนรหัสใบสมัครไปยัง Gmail ของผู้สมัครจริง
func SendApplicationEmail(toEmail string, candidateName string, jobTitle string, appCode string) error {
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4169E1, #3152c4); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; }
        .code-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
        .code-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; }
        .code-value { font-size: 28px; font-weight: 900; color: #4169E1; letter-spacing: 3px; font-family: monospace; margin: 8px 0; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>ระบบคัดกรองและประเมินผู้สมัครงานอัจฉริยะ</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;">สวัสดีคุณ <b>%s</b>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                ระบบได้รับข้อมูลใบสมัครของคุณสำหรับตำแหน่ง <b>"%s"</b> เรียบร้อยแล้ว ขณะนี้ใบสมัครอยู่ในขั้นตอนการพิจารณาและคัดกรองเบื้องต้น
            </p>
            
            <div class="code-box">
                <div class="code-title">รหัสประจำตัวใบสมัครของคุณ (Application ID)</div>
                <div class="code-value">%s</div>
                <p style="font-size: 12px; color: #64748b; margin: 0;">โปรดบันทึกรหัสนี้ไว้เพื่อใช้ตรวจสอบสถานะการสมัครงาน</p>
            </div>

            <div style="background-color: #eff6ff; border-radius: 12px; padding: 14px; margin-top: 20px; font-size: 12px; color: #1e40af; line-height: 1.5;">
                💡 <b>คำแนะนำ:</b> คุณสามารถนำรหัส <b>%s</b> ไปกรอกในเมนู <b>"เช็คสถานะสมัครงาน"</b> บนหน้าแรกของเว็บไซต์ เพื่อติดตามความคืบหน้าได้ตลอด 24 ชม.
            </div>
        </div>
        <div class="footer">
            อีเมลนี้เป็นข้อความอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
        </div>
    </div>
</body>
</html>
`, candidateName, jobTitle, appCode, appCode)

	err := sendEmailUnified(toEmail, fmt.Sprintf("[HireAI] ยืนยันการสมัครงาน - ตำแหน่ง %s", jobTitle), body)
	if err != nil {
		fmt.Printf("ส่งอีเมลไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลรหัสใบสมัคร %s ไปยัง %s สำเร็จเรียบร้อย!\n", appCode, toEmail)
	return nil
}

// SendInterviewEmail ส่งอีเมลแจ้งเตือนวันเวลาและรายละเอียดนัดหมายสัมภาษณ์ไปยัง Gmail ผู้สมัคร
func SendInterviewEmail(toEmail string, candidateName string, jobTitle string, interviewDate string, location string, notes string) error {
	notesHtml := ""
	if notes != "" {
		notesHtml = fmt.Sprintf(`<div class="info-row"><div class="info-label">Notes / หมายเหตุเพิ่มเติม</div><div class="info-value">%s</div></div>`, notes)
	}

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #10B981, #059669); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; }
        .info-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin: 24px 0; }
        .info-row { margin-bottom: 12px; font-size: 14px; }
        .info-label { font-weight: 800; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .info-value { font-weight: 700; color: #1e293b; margin-top: 2px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>Interview Invitation / แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;"><b>Dear %[1]s / เรียนคุณ %[1]s,</b></p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                We are pleased to invite you to an interview for the position of <b>"%[2]s"</b>.<br/>
                ทางบริษัทขอเรียนเชิญคุณเข้ารับการสัมภาษณ์งานในตำแหน่ง <b>"%[2]s"</b> ตามรายละเอียดนัดหมายดังต่อไปนี้:
            </p>
            
            <div class="info-box">
                <div class="info-row">
                    <div class="info-label">Date & Time / วันและเวลาสัมภาษณ์</div>
                    <div class="info-value">%[3]s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Venue & Format / รูปแบบและสถานที่นัดหมาย</div>
                    <div class="info-value">%[4]s</div>
                </div>
                %[5]s
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Please be prepared and attend the interview as scheduled. For inquiries or rescheduling, please contact HR.<br/>
                โปรดเตรียมพร้อมและเข้าร่วมสัมภาษณ์ตามกำหนดเวลาดังกล่าว หากต้องการสอบถามหรือขอเลื่อนนัดหมาย กรุณาติดต่อฝ่าย HR
            </p>
        </div>
        <div class="footer">
            HireAI Recruitment System &bull; อีเมลแจ้งนัดหมายอัตโนมัติจากระบบ
        </div>
    </div>
</body>
</html>
`, candidateName, jobTitle, interviewDate, location, notesHtml)

	err := sendEmailUnified(toEmail, fmt.Sprintf("[HireAI] Interview Invitation / แจ้งนัดหมายสัมภาษณ์งาน - %s", jobTitle), body)
	if err != nil {
		fmt.Printf("ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลแจ้งนัดหมายสัมภาษณ์ไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendCustomInterviewEmail ส่งอีเมลแจ้งนัดหมายสัมภาษณ์ตามเนื้อหาที่ HR กำหนด/แก้ไขจริง
func SendCustomInterviewEmail(toEmail string, jobTitle string, customContent string) error {
	// แปลง newline ให้เป็น <br/> เพื่อให้แสดงผลขึ้นบรรทัดใหม่ในโปรแกรมเปิดเมลได้ถูกต้อง
	formattedContent := strings.ReplaceAll(customContent, "\n", "<br/>")

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4169E1, #3152c4); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; font-size: 14px; line-height: 1.8; word-break: break-word; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            %s
        </div>
        <div class="footer">
            อีเมลนี้เป็นข้อความแจ้งนัดหมายจากระบบ HireAI Recruitment
        </div>
    </div>
</body>
</html>
`, formattedContent)

	err := sendEmailUnified(toEmail, fmt.Sprintf("[HireAI] แจ้งนัดหมายสัมภาษณ์งาน - ตำแหน่ง %s", jobTitle), body)
	if err != nil {
		fmt.Printf("ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลเชิญสัมภาษณ์เนื้อหาตามร่างไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendInterviewEmailWithButtons ส่งอีเมลแจ้งนัดหมายสัมภาษณ์พร้อมปุ่มตอบกลับ (ยืนยัน/เลื่อน/ปฏิเสธ)
func SendInterviewEmailWithButtons(toEmail string, candidateName string, appCode string, jobTitle string, interviewDate string, location string, notes string, responseToken string, baseURL string, interviewID uint) error {
	notesHtml := ""
	if notes != "" {
		notesHtml = fmt.Sprintf(`<div class="info-row"><div class="info-label">Notes / หมายเหตุเพิ่มเติม</div><div class="info-value">%s</div></div>`, notes)
	}

	cleanBaseURL := strings.TrimRight(baseURL, "/")
	confirmURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=confirm&token=%s", cleanBaseURL, interviewID, responseToken)
	rescheduleURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=reschedule&token=%s", cleanBaseURL, interviewID, responseToken)
	rejectURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=reject&token=%s", cleanBaseURL, interviewID, responseToken)

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4169E1, #3152c4); color: #ffffff; padding: 30px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; }
        .info-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin: 24px 0; }
        .info-row { margin-bottom: 12px; font-size: 14px; }
        .info-label { font-weight: 800; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .info-value { font-weight: 700; color: #1e293b; margin-top: 2px; }
        .btn-group { text-align: center; margin: 28px 0 8px 0; }
        .btn { display: inline-block; padding: 12px 22px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; margin: 6px; }
        .btn-confirm { background: linear-gradient(135deg, #10B981, #059669); color: #ffffff !important; }
        .btn-reschedule { background: linear-gradient(135deg, #F59E0B, #D97706); color: #ffffff !important; }
        .btn-reject { background: linear-gradient(135deg, #EF4444, #DC2626); color: #ffffff !important; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>Interview Invitation / แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;"><b>Dear %[1]s / เรียนคุณ %[1]s,</b></p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                We would like to invite you to attend the interview for <b>"%[2]s"</b>.<br/>
                ทางบริษัทขอเรียนเชิญคุณเข้ารับการสัมภาษณ์งานสำหรับตำแหน่ง <b>"%[2]s"</b> โดยมีรายละเอียดดังต่อไปนี้:
            </p>
            
            <div class="info-box">
                <div class="info-row">
                    <div class="info-label">App Code / รหัสประจำตัวใบสมัคร</div>
                    <div class="info-value" style="color: #2563eb; font-family: monospace; font-size: 16px;">%[3]s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Date & Time / วันและเวลาสัมภาษณ์</div>
                    <div class="info-value">%[4]s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Format & Venue / รูปแบบและสถานที่นัดหมาย</div>
                    <div class="info-value">%[5]s</div>
                </div>
                %[6]s
            </div>

            <p style="font-size: 13px; color: #475569; line-height: 1.6; margin-bottom: 4px; text-align: center;">
                Please respond to confirm, reschedule, or decline by clicking the buttons below:<br/>
                กรุณาตอบกลับเพื่อยืนยัน ขอเลื่อนนัด หรือปฏิเสธ โดยกดปุ่มด้านล่าง:
            </p>

            <div class="btn-group">
                <a href="%[7]s" class="btn btn-confirm">ยืนยันเข้าร่วม / Confirm</a>
                <a href="%[8]s" class="btn btn-reschedule">ขอเลื่อนนัด / Reschedule</a>
                <a href="%[9]s" class="btn btn-reject">ปฏิเสธ / Decline</a>
            </div>
        </div>
        <div class="footer">
            HireAI Recruitment System &bull; อีเมลแจ้งนัดหมายอัตโนมัติจากระบบ
        </div>
    </div>
</body>
</html>
`, candidateName, jobTitle, appCode, interviewDate, location, notesHtml, confirmURL, rescheduleURL, rejectURL)

	err := sendEmailUnified(toEmail, fmt.Sprintf("[HireAI] Interview Invitation / แจ้งนัดหมายสัมภาษณ์งาน - %s", jobTitle), body)
	if err != nil {
		fmt.Printf("ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลแจ้งนัดหมายสัมภาษณ์พร้อมปุ่มตอบกลับไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendCustomInterviewEmailWithButtons ส่งอีเมลแจ้งนัดหมายสัมภาษณ์ตามเนื้อหาที่ HR กำหนดพร้อมปุ่มตอบกลับ
func SendCustomInterviewEmailWithButtons(toEmail string, jobTitle string, customContent string, responseToken string, baseURL string, interviewID uint) error {
	// แปลง newline ให้เป็น <br/> เพื่อให้แสดงผลขึ้นบรรทัดใหม่ในโปรแกรมเปิดเมลได้ถูกต้อง
	formattedContent := strings.ReplaceAll(customContent, "\n", "<br/>")

	cleanBaseURL := strings.TrimRight(baseURL, "/")
	confirmURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=confirm&token=%s", cleanBaseURL, interviewID, responseToken)
	rescheduleURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=reschedule&token=%s", cleanBaseURL, interviewID, responseToken)
	rejectURL := fmt.Sprintf("%s/api/interviews/respond?id=%d&action=reject&token=%s", cleanBaseURL, interviewID, responseToken)

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4169E1, #3152c4); color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; font-size: 14px; line-height: 1.8; word-break: break-word; }
        .btn-group { text-align: center; margin: 28px 0 8px 0; padding: 0 20px; }
        .btn { display: inline-block; padding: 12px 22px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; margin: 6px; }
        .btn-confirm { background: linear-gradient(135deg, #10B981, #059669); color: #ffffff !important; }
        .btn-reschedule { background: linear-gradient(135deg, #F59E0B, #D97706); color: #ffffff !important; }
        .btn-reject { background: linear-gradient(135deg, #EF4444, #DC2626); color: #ffffff !important; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>HireAI Recruitment</h1>
            <p>Interview Invitation / แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            %s
        </div>
        <div class="btn-group">
            <a href="%s" class="btn btn-confirm">ยืนยันเข้าร่วม / Confirm</a>
            <a href="%s" class="btn btn-reschedule">ขอเลื่อนนัด / Reschedule</a>
            <a href="%s" class="btn btn-reject">ปฏิเสธ / Decline</a>
        </div>
        <div class="footer">
            HireAI Recruitment System &bull; อีเมลแจ้งนัดหมายจากระบบรับสมัครงาน
        </div>
    </div>
</body>
</html>
`, formattedContent, confirmURL, rescheduleURL, rejectURL)

	err := sendEmailUnified(toEmail, fmt.Sprintf("[HireAI] Interview Invitation / แจ้งนัดหมายสัมภาษณ์งาน - %s", jobTitle), body)
	if err != nil {
		fmt.Printf("ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลเชิญสัมภาษณ์พร้อมปุ่มตอบกลับไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendInterviewResultEmail ส่งอีเมลแจ้งผลสัมภาษณ์ (ผ่าน/ไม่ผ่าน) พร้อมปุ่มรับทราบผล
func SendInterviewResultEmail(toEmail string, candidateName string, appCode string, jobTitle string, result string, resultNotes string, customContent string, resultToken string, baseURL string, interviewID uint) error {
	cleanBaseURL := strings.TrimRight(baseURL, "/")
	acknowledgeURL := fmt.Sprintf("%s/api/interviews/acknowledge-result?id=%d&token=%s", cleanBaseURL, interviewID, resultToken)

	// ดึงชื่อตำแหน่งภาษาอังกฤษ หากตำแหน่งมีรูปแบบ "ภาษาไทย (English)"
	engJobTitle := jobTitle
	if startIdx := strings.Index(jobTitle, "("); startIdx != -1 {
		if endIdx := strings.Index(jobTitle, ")"); endIdx > startIdx {
			extracted := strings.TrimSpace(jobTitle[startIdx+1 : endIdx])
			if extracted != "" {
				engJobTitle = extracted
			}
		}
	}

	// รูปแบบการแสดงชื่อตำแหน่งในตารางข้อมูล
	jobTitleHtml := jobTitle
	if idx := strings.Index(jobTitle, "("); idx > 0 && strings.HasSuffix(jobTitle, ")") {
		thaiPart := strings.TrimSpace(jobTitle[:idx])
		engPart := strings.TrimSpace(jobTitle[idx:])
		jobTitleHtml = fmt.Sprintf(`%s<br/><span style="font-size: 11.5px; font-weight: 500; color: #64748b;">%s</span>`, thaiPart, engPart)
	}

	// กำหนดสี, หัวข้อ ตามผลสัมภาษณ์ (ไม่ใส่ไอคอน/อิโมจิ)
	var headerGradient, badgeColor, badgeBg, btnBg, resultText, subjectText, messageDefault string
	if result == "passed" {
		headerGradient = "linear-gradient(135deg, #059669, #10b981)"
		badgeColor = "#065f46"
		badgeBg = "#d1fae5"
		btnBg = "#059669"
		resultText = "ผ่านการสัมภาษณ์"
		subjectText = "ยินดีด้วย! คุณผ่านการสัมภาษณ์"
		messageDefault = fmt.Sprintf(`เรียน คุณ %s

ขอขอบคุณสำหรับความสนใจร่วมงานกับบริษัทฯ และสำหรับการสละเวลาเข้าร่วมกระบวนการสัมภาษณ์กับทางบริษัทฯ

หลังจากที่ท่านได้ผ่านการสัมภาษณ์ในรอบ HR และทางบริษัทฯ ได้นำข้อมูลของท่านส่งต่อให้หน่วยงานที่เกี่ยวข้องพิจารณา ทางบริษัทฯ มีความยินดีเป็นอย่างยิ่งที่จะแจ้งให้ทราบว่า ท่านได้รับการคัดเลือกสำหรับตำแหน่ง %s ดังกล่าว

ทีมงานยินดีต้อนรับท่านเข้าสู่ขั้นตอนถัดไป โดยเจ้าหน้าที่ฝ่ายทรัพยากรบุคคลจะติดต่อกลับเพื่อแจ้งรายละเอียด ข้อเสนอการจ้างงาน และกำหนดการเริ่มงานต่อไป

Dear %s,

Thank you for your interest in joining our company and for taking the time to participate in our interview process.

Following your successful completion of the HR interview, your profile was forwarded to the relevant department for further consideration. We are pleased to inform you that you have been selected for the %s position.

We are delighted to welcome you to our team. Our Human Resources department will contact you shortly with further details and onboarding schedule.

Sincerely yours,

HR Recruitment Team
HR - Human Resources Department
Tel. : 02-123-4567
Mobile : 081-234-5678
Email : hr@hireai-recruitment.com`, candidateName, jobTitle, candidateName, engJobTitle)
	} else {
		headerGradient = "linear-gradient(135deg, #991b1b, #b91c1c)"
		badgeColor = "#991b1b"
		badgeBg = "#fee2e2"
		btnBg = "#991b1b"
		resultText = "ไม่ผ่านการสัมภาษณ์"
		subjectText = "แจ้งผลการสัมภาษณ์"
		messageDefault = fmt.Sprintf(`เรียน คุณ %s

ขอขอบคุณสำหรับความสนใจร่วมงานกับบริษัทฯ และสำหรับการสละเวลาเข้าร่วมกระบวนการสัมภาษณ์กับทางบริษัทฯ

หลังจากที่ท่านได้ผ่านการสัมภาษณ์ในรอบ HR และทางบริษัทฯ ได้นำข้อมูลของท่านส่งต่อให้หน่วยงานที่เกี่ยวข้องพิจารณา ทางบริษัทฯ ได้ดำเนินการพิจารณาเรียบร้อยแล้ว

ทั้งนี้ บริษัทฯ ขอแจ้งให้ทราบว่า ในครั้งนี้ท่านไม่ได้รับการคัดเลือกสำหรับตำแหน่ง %s ดังกล่าว

บริษัทฯ ขอขอบคุณสำหรับความสนใจ เวลา และความตั้งใจที่ท่านมีให้กับกระบวนการคัดเลือก และหวังเป็นอย่างยิ่งว่าจะมีโอกาสได้พิจารณาใบสมัครของท่านสำหรับตำแหน่งที่เหมาะสมในอนาคต

ขออวยพรให้ท่านประสบความสำเร็จในหน้าที่การงานและเส้นทางอาชีพต่อไป

Dear %s,

Thank you for your interest in joining our company and for taking the time to participate in our interview process.

Following your successful completion of the HR interview, your profile was forwarded to the relevant department for further consideration. After careful consideration, we regret to inform you that you have not been selected for the %s position at this time.

We sincerely appreciate your interest, time, and effort throughout the recruitment process. We hope to have the opportunity to consider your application for other suitable positions within our company in the future.

We wish you continued success in your career and future endeavors.

Sincerely yours,

HR Recruitment Team
HR - Human Resources Department
Tel. : 02-123-4567
Mobile : 081-234-5678
Email : hr@hireai-recruitment.com`, candidateName, jobTitle, candidateName, engJobTitle)
	}

	// ถ้า HR ส่ง customContent มา ให้ใช้แทน messageDefault
	messageHtml := messageDefault
	if customContent != "" {
		messageHtml = customContent
	}
	messageHtml = strings.ReplaceAll(messageHtml, "\n", "<br/>")

	// หมายเหตุ
	notesHtml := ""
	if resultNotes != "" {
		notesHtml = fmt.Sprintf(`<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; margin-top:16px; font-size:13px; color:#475569; line-height:1.6;">
            <b style="color:#334155;">ความเห็นเพิ่มเติม:</b><br/>%s
        </div>`, strings.ReplaceAll(resultNotes, "\n", "<br/>"))
	}

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: %s; color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; color: #334155; }
        .result-badge { display: inline-block; background: %s; color: %s; padding: 8px 22px; border-radius: 100px; font-size: 14px; font-weight: 800; margin: 16px 0; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; margin: 16px 0; }
        .btn-acknowledge { display: block; box-sizing: border-box; width: 100%%; max-width: 100%%; text-align: center; padding: 14px 20px; border-radius: 14px; font-size: 14px; font-weight: 800; text-decoration: none; color: #ffffff !important; margin-top: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>แจ้งผลการสัมภาษณ์</h1>
            <p>HireAI Recruitment System</p>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <span class="result-badge">%s</span>
            </div>

            <div style="font-size: 13.5px; line-height: 1.8; color: #334155; margin: 16px 0; background: #fafbfc; border: 1px solid #edf2f7; border-radius: 12px; padding: 20px;">
                %s
            </div>

            <div class="info-box">
                <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="color: #64748b; font-weight: 600; padding: 7px 0; white-space: nowrap; vertical-align: top; width: 100px;">รหัสใบสมัคร</td>
                        <td style="color: #4169E1; font-weight: 700; font-family: monospace; text-align: right; padding: 7px 0;">%s</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="color: #64748b; font-weight: 600; padding: 7px 0; white-space: nowrap; vertical-align: top; width: 100px;">ตำแหน่งงาน</td>
                        <td style="color: #0f172a; font-weight: 700; text-align: right; padding: 7px 0; line-height: 1.4;">%s</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-weight: 600; padding: 7px 0; white-space: nowrap; vertical-align: top; width: 100px;">ผลสัมภาษณ์</td>
                        <td style="color: #0f172a; font-weight: 700; text-align: right; padding: 7px 0;">%s</td>
                    </tr>
                </table>
            </div>

            %s

            <a href="%s" class="btn-acknowledge" style="background: %s; display: block; box-sizing: border-box; width: 100%%; max-width: 100%%; text-decoration: none; color: #ffffff !important;">
                ยืนยันรับทราบผลการสัมภาษณ์
            </a>
            <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 10px;">
                กรุณากดปุ่มด้านบนเพื่อยืนยันว่าคุณได้รับทราบผลการสัมภาษณ์แล้ว
            </p>
        </div>
        <div class="footer">
            อีเมลนี้เป็นข้อความอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
        </div>
    </div>
</body>
</html>
`,
		headerGradient,
		badgeBg, badgeColor,
		resultText,
		messageHtml,
		appCode, jobTitleHtml, resultText,
		notesHtml,
		acknowledgeURL,
		btnBg,
	)

	err := sendEmailUnified(toEmail, fmt.Sprintf("[HireAI] %s - ตำแหน่ง %s", subjectText, jobTitle), body)
	if err != nil {
		fmt.Printf("ส่งอีเมลแจ้งผลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("ส่งอีเมลแจ้งผลสัมภาษณ์ (%s) ไปยัง %s สำเร็จเรียบร้อย!\n", result, toEmail)
	return nil
}
