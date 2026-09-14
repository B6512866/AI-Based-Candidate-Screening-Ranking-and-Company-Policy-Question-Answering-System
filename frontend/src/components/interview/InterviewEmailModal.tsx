import { Edit3, Eye, Loader2, Send } from "lucide-react";
import { Modal } from "./Modal";

export interface InterviewEmailModalProps {
    open: boolean;
    onClose: () => void;
    onSend: () => void;
    sendingEmail: boolean;
    emailContent: string;
    setEmailContent: (content: string) => void;
    emailModalTab: "edit" | "preview";
    setEmailModalTab: (tab: "edit" | "preview") => void;
}

/**
 * Modal สำหรับดูและแก้ไขเนื้อหาจดหมายเชิญสัมภาษณ์ก่อนส่งจริง
 */
export function InterviewEmailModal({
    open,
    onClose,
    onSend,
    sendingEmail,
    emailContent,
    setEmailContent,
    emailModalTab,
    setEmailModalTab,
}: InterviewEmailModalProps) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="ตัวอย่างจดหมายเชิญสัมภาษณ์"
            maxWidth="max-w-2xl"
            footer={
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={onSend}
                        disabled={sendingEmail}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-200/50 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sendingEmail ? "กำลังส่ง..." : "ส่งอีเมลเชิญสัมภาษณ์"}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Tab Switcher: แก้ไขข้อความ (ขึ้นก่อน) vs ตัวอย่าง */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setEmailModalTab("edit")}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            emailModalTab === "edit"
                                ? "bg-white text-[#4169E1] shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        แก้ไขข้อความ (Edit)
                    </button>
                    <button
                        type="button"
                        onClick={() => setEmailModalTab("preview")}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            emailModalTab === "preview"
                                ? "bg-white text-[#4169E1] shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        ตัวอย่างที่จะแสดงในอีเมล (Preview)
                    </button>
                </div>

                {emailModalTab === "edit" ? (
                    /* Editable email content (ขึ้นก่อน) */
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">แก้ไขเนื้อหาจดหมายเชิญ</label>
                        <textarea
                            rows={10}
                            value={emailContent}
                            onChange={(e) => setEmailContent(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 resize-none transition-all leading-relaxed"
                            placeholder="พิมพ์ข้อความเชิญสัมภาษณ์ที่นี่..."
                        />
                    </div>
                ) : (
                    /* Email Preview */
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-gradient-to-r from-[#4169E1] to-[#3152c4] text-white px-5 py-4 text-center">
                            <p className="font-black text-lg">HireAI Recruitment</p>
                            <p className="text-xs opacity-90">Interview Invitation / แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
                        </div>
                        <div className="px-5 py-4">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{emailContent}</pre>
                            </div>
                        </div>
                        {/* ปุ่มตัวอย่างในอีเมล */}
                        <div className="px-5 pb-3 flex flex-wrap items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-sm">✅ ยืนยันเข้าร่วม / Confirm</span>
                            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold shadow-sm">📅 ขอเลื่อนนัด / Reschedule</span>
                            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold shadow-sm">❌ ปฏิเสธ / Decline</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default InterviewEmailModal;
