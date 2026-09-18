import { CheckCircle2, X } from "lucide-react";

export interface InterviewEmailSuccessModalProps {
    open: boolean;
    onClose: () => void;
    selectedApp: any;
    interviewDate: string;
    interviewTime: string;
}

/**
 * Modal แสดงผลลัพธ์การส่งอีเมลเชิญสัมภาษณ์สำเร็จ พร้อมรายละเอียดผู้รับและเวลานัดหมาย
 */
export function InterviewEmailSuccessModal({
    open,
    onClose,
    selectedApp,
    interviewDate,
    interviewTime,
}: InterviewEmailSuccessModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={onClose}
        >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" />
            <div
                className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[slideUp_0.3s_ease] z-10 border border-slate-100 p-6 sm:p-7"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Clean Header with Soft Icon */}
                <div className="text-center pt-2 pb-4">
                    <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-emerald-600 shadow-sm">
                        <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">ส่งอีเมลเชิญสัมภาษณ์สำเร็จ!</h3>
                </div>

                {/* Body Details (Clean Slate Card) */}
                <div className="space-y-4">
                    <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-400 font-semibold">ผู้สมัคร</span>
                            <span className="text-slate-800 font-bold">
                                {selectedApp?.Candidate?.first_name} {selectedApp?.Candidate?.last_name}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-400 font-semibold">รหัสใบสมัคร</span>
                            <span className="font-mono font-bold text-[#4169E1] bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100/60">
                                {selectedApp?.application_code || selectedApp?.ApplicationCode || `APP-${10000 + (selectedApp?.ID || 0)}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-400 font-semibold">ตำแหน่ง</span>
                            <span
                                className="text-slate-700 font-medium truncate max-w-[200px]"
                                title={selectedApp?.JobPosition?.title || selectedApp?.position || "-"}
                            >
                                {selectedApp?.JobPosition?.title || selectedApp?.position || "-"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-400 font-semibold">อีเมลปลายทาง</span>
                            <span className="text-slate-700 font-medium truncate max-w-[200px]">
                                {selectedApp?.Candidate?.email || "-"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-400 font-semibold">วันที่ & เวลา</span>
                            <span className="text-emerald-700 font-bold">
                                {interviewDate
                                    ? (() => {
                                          const [y, m, d] = interviewDate.split("-");
                                          return `${d}/${m}/${y}`;
                                      })()
                                    : "-"}{" "}
                                ({interviewTime} น.)
                            </span>
                        </div>
                    </div>

                    {/* Clean Solid Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow active:scale-[0.99] transition-all cursor-pointer"
                    >
                        ตกลง
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

export default InterviewEmailSuccessModal;
