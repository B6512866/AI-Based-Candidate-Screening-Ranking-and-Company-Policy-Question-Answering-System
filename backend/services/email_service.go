package services

import (
	"fmt"
	"net/smtp"
	"strings"

	"AI-Based-Recruitment-Screening-and-Employee-Advisory-System/backend/config"
)

// SendApplicationEmail ส่งอีเมลแจ้งเตือนรหัสใบสมัครไปยัง Gmail ของผู้สมัครจริง
func SendApplicationEmail(toEmail string, candidateName string, jobTitle string, appCode string) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	// ตัดช่องว่างของ App Password ออก
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := fmt.Sprintf("Subject: [HireAI] ยืนยันการสมัครงาน - ตำแหน่ง %s\r\n", jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

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

	msg := []byte(subject + headers + fromHeader + toHeader + body)

	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("❌ [SMTP Error] ส่งอีเมลไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("📧 [SMTP Success] ส่งอีเมลรหัสใบสมัคร %s ไปยัง %s สำเร็จเรียบร้อย!\n", appCode, toEmail)
	return nil
}

// SendInterviewEmail ส่งอีเมลแจ้งเตือนวันเวลาและรายละเอียดนัดหมายสัมภาษณ์ไปยัง Gmail ผู้สมัคร
func SendInterviewEmail(toEmail string, candidateName string, jobTitle string, interviewDate string, location string, notes string) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := fmt.Sprintf("Subject: [HireAI] แจ้งนัดหมายสัมภาษณ์งาน - ตำแหน่ง %s\r\n", jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

	notesHtml := ""
	if notes != "" {
		notesHtml = fmt.Sprintf(`<div class="info-row"><div class="info-label">📝 หมายเหตุเพิ่มเติม</div><div class="info-value">%s</div></div>`, notes)
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
            <p>แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
        </div>
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;">สวัสดีคุณ <b>%s</b>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                ขอแสดงความยินดีด้วย! ฝ่ายทรัพยากรบุคคลขอเรียนเชิญคุณเข้ารับการสัมภาษณ์งานในตำแหน่ง <b>"%s"</b> โดยมีรายละเอียดนัดหมายดังนี้:
            </p>
            
            <div class="info-box">
                <div class="info-row">
                    <div class="info-label">📅 วันและเวลาสัมภาษณ์</div>
                    <div class="info-value">%s</div>
                </div>
                <div class="info-row">
                    <div class="info-label">📍 รูปแบบ / สถานที่นัดหมาย</div>
                    <div class="info-value">%s</div>
                </div>
                %s
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                โปรดเตรียมพร้อมและเข้าร่วมสัมภาษณ์ตามกำหนดเวลาดังกล่าว หากต้องการสอบถามหรือขอเลื่อนนัดหมาย กรุณาติดต่อฝ่าย HR
            </p>
        </div>
        <div class="footer">
            อีเมลนี้เป็นข้อความแจ้งนัดหมายอัตโนมัติจากระบบ HireAI Recruitment
        </div>
    </div>
</body>
</html>
`, candidateName, jobTitle, interviewDate, location, notesHtml)

	msg := []byte(subject + headers + fromHeader + toHeader + body)
	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("❌ [SMTP Interview Error] ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("📧 [SMTP Interview Success] ส่งอีเมลแจ้งนัดหมายสัมภาษณ์ไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

// SendCustomInterviewEmail ส่งอีเมลแจ้งนัดหมายสัมภาษณ์ตามเนื้อหาที่ HR กำหนด/แก้ไขจริง
func SendCustomInterviewEmail(toEmail string, jobTitle string, customContent string) error {
	fromEmail := config.Env.SMTPEmail
	if fromEmail == "" {
		fromEmail = "guymini02479@gmail.com"
	}

	appPassword := config.Env.SMTPPassword
	if appPassword == "" {
		appPassword = "gjsrvsyeqsixfvlk"
	}
	appPassword = strings.ReplaceAll(appPassword, " ", "")

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := fmt.Sprintf("Subject: [HireAI] แจ้งนัดหมายสัมภาษณ์งาน - ตำแหน่ง %s\r\n", jobTitle)
	headers := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n"
	fromHeader := fmt.Sprintf("From: HireAI Recruitment <%s>\r\n", fromEmail)
	toHeader := fmt.Sprintf("To: %s\r\n\r\n", toEmail)

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

	msg := []byte(subject + headers + fromHeader + toHeader + body)
	auth := smtp.PlainAuth("", fromEmail, appPassword, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	if err != nil {
		fmt.Printf("❌ [SMTP Custom Interview Error] ส่งอีเมลสัมภาษณ์ไปยัง %s ล้มเหลว: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("📧 [SMTP Custom Interview Success] ส่งอีเมลเชิญสัมภาษณ์เนื้อหาตามร่างไปยัง %s สำเร็จเรียบร้อย!\n", toEmail)
	return nil
}

