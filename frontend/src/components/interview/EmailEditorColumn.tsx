import { Send, Mail, Loader2 } from "lucide-react";

export interface EmailEditorColumnProps {
    emailContent: string;
    setEmailContent: (val: string) => void;
    sendingEmail: boolean;
    lastSavedInterviewId: number | null;
    onOpenEmailModal: () => void;
}

/**
 * คอลัมน์ที่ 3: เนื้อหาจดหมายเชิญผู้สมัคร (แสดง/แก้ไขร่างจดหมายสองภาษา และปุ่มเปิด Modal ตรวจสอบ/ส่งอีเมล)
 */
export function EmailEditorColumn({
    emailContent,
    setEmailContent,
    sendingEmail,
    lastSavedInterviewId,
    onOpenEmailModal,
}: EmailEditorColumnProps) {
    return (
        <div className="lg:col-span-4 bg-slate-50/80 rounded-2xl border border-slate-100 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-black text-slate-700">เนื้อหาจดหมายเชิญผู้สมัคร</h3>
                </div>
            </div>

            {!emailContent && (
                <div className="flex-1 flex items-center justify-center text-center p-6">
                    <div className="space-y-2">
                        <Send className="w-10 h-10 text-slate-200 mx-auto" />
                        <p className="text-sm text-slate-400 font-medium">กรุณาเลือกผู้สมัครเพื่อสร้างจดหมาย</p>
                        <p className="text-xs text-slate-300">ระบบจะสร้างเนื้อหาจดหมายเชิญให้อัตโนมัติ</p>
                    </div>
                </div>
            )}

            {emailContent && (
                <>
                    <div className="flex-1 min-h-0 flex flex-col mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 flex-shrink-0">
                            เนื้อหาคำเชิญ
                        </label>
                        <textarea
                            rows={14}
                            value={emailContent}
                            onChange={(e) => setEmailContent(e.target.value)}
                            className="w-full flex-1 min-h-[300px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 resize-none transition-all leading-relaxed font-sans overflow-y-auto"
                        />
                    </div>

                    {/* ── ปุ่มส่งคำเชิญ (เปิด popup ดูเนื้อหาก่อน) ── */}
                    <button
                        className="flex-shrink-0 group w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-300/50 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={sendingEmail || !lastSavedInterviewId}
                        onClick={onOpenEmailModal}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                        {sendingEmail ? (
                            <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                        ) : (
                            <Mail className="w-5 h-5 relative z-10" />
                        )}
                        <span className="relative z-10">
                            {sendingEmail ? "กำลังส่ง..." : "ดูตัวอย่างและส่งคำเชิญ"}
                        </span>
                    </button>
                </>
            )}
        </div>
    );
}

export default EmailEditorColumn;
