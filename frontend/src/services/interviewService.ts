import apiClient from "./apiClient";

// ── ดึงนัดสัมภาษณ์ทั้งหมด
export async function getAllInterviews() {
  const res = await apiClient.get("/interviews");
  return res.data;
}

// ── ดึงนัดสัมภาษณ์ตาม ID
export async function getInterviewById(id: number) {
  const res = await apiClient.get(`/interviews/${id}`);
  return res.data;
}

// ── สร้างนัดสัมภาษณ์ใหม่
export async function createInterview(
  applicationId: number,
  interviewDate: string,
  interviewTime: string,
  format: string,
  formatDescription: string
) {
  const res = await apiClient.post("/interviews", {
    application_id: applicationId,
    interview_date: interviewDate,
    interview_time: interviewTime,
    format: format,
    format_description: formatDescription,
  });
  return res.data;
}

// ── อัปเดตนัดสัมภาษณ์
export async function updateInterview(
  id: number,
  data: {
    interview_date?: string;
    interview_time?: string;
    format?: string;
    format_description?: string;
    interview_status?: string;
  }
) {
  const res = await apiClient.put(`/interviews/${id}`, data);
  return res.data;
}

// ── ลบนัดสัมภาษณ์
export async function deleteInterview(id: number) {
  const res = await apiClient.delete(`/interviews/${id}`);
  return res.data;
}

// ── ดึง Candidate/Application ทั้งหมดสำหรับเลือกนัดสัมภาษณ์
export async function getCandidatesForInterview() {
  const res = await apiClient.get("/interviews/candidates");
  return res.data;
}

// ── ส่งอีเมลเชิญสัมภาษณ์ (แยกจากการบันทึก)
export async function sendInterviewEmail(
  interviewId: number,
  emailContent: string
) {
  const res = await apiClient.post(`/interviews/${interviewId}/send-email`, {
    email_content: emailContent,
  });
  return res.data;
}
