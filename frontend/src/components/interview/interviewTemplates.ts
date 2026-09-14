/**
 * ═════════════════════════════════════════════════════════════════════════
 * Interview Invitation Email Templates (เทมเพลตจดหมายเชิญสัมภาษณ์สองภาษา)
 * Path: frontend/src/components/interview/interviewTemplates.ts
 * ═════════════════════════════════════════════════════════════════════════
 */

import { formatPhoneNumber, formatTime12H } from "../rules/rule";

export interface InterviewEmailParams {
    candidateName: string;
    candidatePhone?: string;
    position: string;
    appCode: string;
    date: string;
    time: string;
    format: string;
    venueLink: string;
    onsiteAddress?: string;
    meetingId?: string;
    passcode?: string;
    hrName: string;
    hrTel?: string;
    hrMobile?: string;
    hrEmail?: string;
}

/**
 * ฟังก์ชันสร้างเนื้อหาจดหมายเชิญสัมภาษณ์แบบสองภาษา (ไทย + อังกฤษ)
 * รองรับทั้ง 3 รูปแบบ: Onsite, Phone, Online
 */
export function buildInterviewEmailContent(params: InterviewEmailParams): string {
    const hrName = params.hrName?.trim() || "HR - Human Resources Department";
    const hrTel = params.hrTel?.trim() || "02-123-4567";
    const hrMobile = params.hrMobile?.trim() || "081-234-5678";
    const hrEmail = params.hrEmail?.trim() || "hr@hireai-recruitment.com";
    const timeEng = formatTime12H(params.time);

    // ── รูปแบบ: Onsite Interview ──
    if (params.format === "onsite") {
        const venuePlace = params.venueLink?.trim() || "-";
        const venueAddress = params.onsiteAddress !== undefined ? params.onsiteAddress.trim() : "-";
        const venueEng = venueAddress ? `${venuePlace}, ${venueAddress}` : venuePlace;

        return (
`เรียน คุณ ${params.candidateName},

ทางบริษัทขอเรียนเชิญท่านเข้าร่วมการสัมภาษณ์งานสำหรับตำแหน่ง ${params.position} โดยมีรายละเอียดดังต่อไปนี้:

รายละเอียดการสัมภาษณ์:
ผู้สมัคร: ${params.candidateName}
รหัสใบสมัคร: ${params.appCode}
วันที่: ${params.date}
เวลา: ${params.time} น.
รูปแบบการสัมภาษณ์: Onsite Interview
สถานที่สัมภาษณ์: ${venuePlace}
ที่อยู่: ${venueAddress}

กรุณาเดินทางมายังสถานที่สัมภาษณ์ตามวันและเวลาที่กำหนด และโปรดเผื่อเวลาในการเดินทาง

Dear ${params.candidateName},

I would like to invite you to attend an interview for the position of ${params.position} with the details below:

Interview Details
Candidate: ${params.candidateName}
Application Code: ${params.appCode}
Date: ${params.date}
Time: ${timeEng}
Interview Type: Onsite Interview
Venue: ${venueEng}
Address: ${venueAddress}

Please arrive at the interview venue on the scheduled date and time. We recommend allowing sufficient time for travel.

Sincerely yours,

${hrName}
HR - Human Resources Department
Tel. : ${hrTel}
Mobile : ${hrMobile}
Email : ${hrEmail}`
        );
    }

    // ── รูปแบบ: Phone Interview ──
    if (params.format === "phone") {
        const rawPhone = params.venueLink?.trim() || params.candidatePhone?.trim() || "-";
        const phoneNo = rawPhone !== "-" ? formatPhoneNumber(rawPhone) : "-";

        return (
`เรียน คุณ ${params.candidateName},

ทางบริษัทขอเรียนเชิญท่านเข้าร่วมการสัมภาษณ์งานสำหรับตำแหน่ง ${params.position} โดยมีรายละเอียดดังต่อไปนี้:

รายละเอียดการสัมภาษณ์:
ผู้สมัคร: ${params.candidateName}
รหัสใบสมัคร: ${params.appCode}
วันที่: ${params.date}
เวลา: ${params.time} น.
รูปแบบการสัมภาษณ์: Phone Interview
หมายเลขโทรศัพท์สำหรับสัมภาษณ์: ${phoneNo}

เจ้าหน้าที่ฝ่ายทรัพยากรบุคคลจะติดต่อท่านตามหมายเลขโทรศัพท์ข้างต้นในวันและเวลาที่กำหนด กรุณาเตรียมพร้อมรับสายและตรวจสอบให้แน่ใจว่าสามารถติดต่อท่านได้ในช่วงเวลาดังกล่าว

Dear ${params.candidateName},

I would like to invite you to attend a Phone Interview for the position of ${params.position} with the details below:

Interview Details
Candidate: ${params.candidateName}
Application Code: ${params.appCode}
Date: ${params.date}
Time: ${timeEng}
Interview Type: Phone Interview
Interview Phone Number: ${phoneNo}

Our HR representative will contact you at the phone number provided above on the scheduled date and time. Please make sure that you are available and reachable during the interview period.

Sincerely yours,

${hrName}
HR - Human Resources Department
Tel. : ${hrTel}
Mobile : ${hrMobile}
Email : ${hrEmail}`
        );
    }

    // ── รูปแบบ: Online Interview (Default) ──
    const joinLink = params.venueLink?.trim() || "-";
    const mId = params.meetingId?.trim() || "-";
    const pwd = params.passcode?.trim() || "-";

    return (
`เรียน คุณ ${params.candidateName},

ทางบริษัทขอเรียนเชิญท่านเข้าร่วมการสัมภาษณ์งานสำหรับตำแหน่ง ${params.position} โดยมีรายละเอียดดังต่อไปนี้:

รายละเอียดการสัมภาษณ์:
ผู้สมัคร: ${params.candidateName}
รหัสใบสมัคร: ${params.appCode}
วันที่: ${params.date}
เวลา: ${params.time} น.
รูปแบบการสัมภาษณ์: Online Interview

Dear ${params.candidateName},

I would like to invite you to attend an Online Interview for the position of ${params.position} with the details below:

Interview Details
Candidate: ${params.candidateName}
Application Code: ${params.appCode}
Date: ${params.date}
Time: ${timeEng}
Interview Type: Online Interview

Sincerely yours,

${hrName}
HR - Human Resources Department
Tel. : ${hrTel}
Mobile : ${hrMobile}
Email : ${hrEmail}

_____________________________________________
Online interview
Join: ${joinLink}
Meeting ID: ${mId}
Passcode: ${pwd}`
    );
}

export interface ParsedInterviewFormatDesc {
    link: string;
    venue: string;
    address: string;
    meetingId: string;
    passcode: string;
}

/**
 * ฟังก์ชันแปลงค่า format_description (รองรับทั้ง JSON string และ Plain text)
 */
export function parseInterviewFormatDescription(rawStr?: string): ParsedInterviewFormatDesc {
    if (!rawStr) {
        return { link: "", venue: "", address: "", meetingId: "", passcode: "" };
    }
    const trimmed = rawStr.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
            const parsed = JSON.parse(trimmed);
            return {
                link: parsed.link || parsed.venue || "",
                venue: parsed.venue || parsed.link || "",
                address: parsed.address || "",
                meetingId: parsed.meetingId || "",
                passcode: parsed.passcode || "",
            };
        } catch {
            // fallback if json parse fails
        }
    }
    return {
        link: trimmed,
        venue: trimmed,
        address: "",
        meetingId: "",
        passcode: "",
    };
}

/**
 * ฟังก์ชันแปลงข้อมูลนัดหมายเป็น format_description สำหรับบันทึกลง Database
 * หากมีข้อมูลเสริม (Meeting ID, Passcode, ที่อยู่) จะแพ็กเป็น JSON ให้อัตโนมัติ
 */
export function serializeInterviewFormatDescription(params: {
    format: string;
    interviewLink: string;
    onsiteAddress?: string;
    meetingId?: string;
    passcode?: string;
}): string {
    const { format, interviewLink, onsiteAddress, meetingId, passcode } = params;
    const cleanLink = (interviewLink || "").trim();
    const cleanAddress = (onsiteAddress || "").trim();
    const cleanMeetingId = (meetingId || "").trim();
    const cleanPasscode = (passcode || "").trim();

    if (format === "online") {
        if (cleanMeetingId || cleanPasscode) {
            return JSON.stringify({
                link: cleanLink,
                meetingId: cleanMeetingId,
                passcode: cleanPasscode,
            });
        }
        return cleanLink;
    }

    if (format === "onsite") {
        if (cleanAddress) {
            return JSON.stringify({
                venue: cleanLink,
                address: cleanAddress,
            });
        }
        return cleanLink;
    }

    return cleanLink;
}

