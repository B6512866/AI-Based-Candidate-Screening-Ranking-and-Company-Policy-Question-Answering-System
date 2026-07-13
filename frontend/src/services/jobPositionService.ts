import apiClient from "./apiClient";

export async function getalljobs() {
  const res = await apiClient.get("/job-positions");
  return res.data;
}

export async function getbyidjob(id: number) {
  const res = await apiClient.get("/job-positions/" + id);
  return res.data;
}

export async function createjob(
  title: string,
  description: string,
  criteria: string,
  department: string = "",
  location: string = "",
  salary: string = "",
  jobType: string = "",
  benefits: string = "",
  contactInfo: string = "",
  status: string = "เปิดรับสมัคร"
) {
  const res = await apiClient.post("/job-positions", {
    title,
    description,
    criteria,
    department,
    location,
    salary,
    type: jobType,
    benefits,
    contact_info: contactInfo,
    status
  });
  return res.data;
}

export async function updatejob(
  id: number,
  title: string,
  description: string,
  criteria: string,
  department: string = "",
  location: string = "",
  salary: string = "",
  jobType: string = "",
  benefits: string = "",
  contactInfo: string = "",
  status: string = "เปิดรับสมัคร"
) {
  const res = await apiClient.put(`/job-positions/${id}`, {
    title,
    description,
    criteria,
    department,
    location,
    salary,
    type: jobType,
    benefits,
    contact_info: contactInfo,
    status
  });
  return res.data;
}

export async function deletejob(id: number) {
  const res = await apiClient.delete(`/job-positions/${id}`);
  return res.data;
}

// ── สำหรับผู้สมัครส่งข้อมูลและ Resume
export async function applyjob(
  jobId: number,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  resumeText: string,
  resumeUrl: string
){
  const res = await apiClient.post(`/job-positions/${jobId}/apply`, {
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone,
    resume_text: resumeText,
    resume_url: resumeUrl
  });
  return res.data;
}

// ── สำหรับ HR ดึงใบสมัครทั้งหมดแยกตามตำแหน่งงาน
export async function getapplications(jobId: number) {
  const res = await apiClient.get(`/job-positions/${jobId}/applications`);
  return res.data;
}

// ── บันทึก/อัปเดตผลคัดกรอง AI สำหรับใบสมัครรายคน
export async function updateApplicationScreening(
  appId: number,
  score: number,
  strengths: string,
  modelUsed: string = "typhoon2.5-qwen3-4b",
  resumeText: string = ""
) {
  const res = await apiClient.put(`/applications/${appId}/screening`, {
    score,
    strengths,
    model_used: modelUsed,
    resume_text: resumeText
  });
  return res.data;
}