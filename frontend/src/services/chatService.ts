import apiClient from "./apiClient";

export interface ChatMessageData {
  ID: number;
  CreatedAt: string;
  question: string;
  answer: string;
  source_doc?: string;
  user_id: number;
  session_id: string;
  session_title: string;
}

export interface ChatSessionData {
  session_id: string;
  session_title: string;
  created_at: string;
}

// 1. ดึงรายการห้องสนทนาทั้งหมดของผู้ใช้ปัจจุบัน
export async function getChatSessions() {
  const response = await apiClient.get<{ data: ChatSessionData[] }>("/chat/sessions");
  return response.data;
}

// 2. ดึงประวัติแชตทั้งหมดเฉพาะห้องที่เลือก (session_id)
export async function getChatHistory(sessionId: string) {
  const response = await apiClient.get<{ data: ChatMessageData[] }>(`/chat/history?session_id=${sessionId}`);
  return response.data;
}

// 3. บันทึกคำถามและคำตอบใหม่ผูกสัมพันธ์กับห้องและหัวข้อแชต
export async function saveChatMessage(question: string, answer: string, sessionId: string, sessionTitle: string, sourceDoc?: string) {
  const response = await apiClient.post("/chat/save", {
    question,
    answer,
    source_doc: sourceDoc || "",
    session_id: sessionId,
    session_title: sessionTitle,
  });
  return response.data;
}
