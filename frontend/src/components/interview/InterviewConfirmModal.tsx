import { Save, Mail } from "lucide-react";
import { Modal } from "./Modal";

const defaultFormatLabels: Record<string, string> = {
    online: "Online Interview (Google Meet / Microsoft Teams / Zoom)",
    onsite: "Onsite Interview (สถานที่ / บริษัท)",
    phone: "Phone Interview (โทรศัพท์)",
};

export interface InterviewConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    selectedApp: any;
    interviewDate: string;
    interviewTime: string;
    interviewFormat: string;
    interviewLink: string;
    onsiteAddress?: string;
    meetingId?: string;
    passcode?: string;
    formatLabels?: Record<string, string>;
    saving?: boolean;
}

/**
 * Modal สำหรับตรวจสอบและยืนยันข้อมูลการนัดสัมภาษณ์ก่อนบันทึก
 */
export function InterviewConfirmModal({
    open,
    onClose,
    onConfirm,
    selectedApp,
    interviewDate,
    interviewTime,
    interviewFormat,
    interviewLink,
    onsiteAddress = "",
    meetingId = "",
    passcode = "",
    formatLabels = defaultFormatLabels,
    saving = false,
}: InterviewConfirmModalProps) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="ยืนยันการบันทึกนัดสัมภาษณ์"
            footer={
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#7C3AED] text-white font-bold text-sm shadow-lg shadow-indigo-200/50 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "กำลังบันทึก..." : "ยืนยันบันทึก"}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    กรุณาตรวจสอบข้อมูลการนัดหมายก่อนบันทึก:
                </p>

                {selectedApp && (
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-5 space-y-3 border border-indigo-100">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#4169E1] to-[#7C3AED] flex items-center justify-center text-white font-black text-base shadow-sm flex-shrink-0">
                                {(selectedApp.Candidate?.first_name || "?")[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-base font-black text-slate-800 truncate">
                                        {selectedApp.Candidate?.first_name} {selectedApp.Candidate?.last_name}
                                    </p>
                                    <span className="font-mono text-[11px] font-bold text-[#4169E1] bg-white/90 px-2 py-0.5 rounded-lg border border-indigo-100 shadow-xs flex-shrink-0">
                                        APP-{10000 + (selectedApp?.ID || 0)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium truncate">
                                    {selectedApp.JobPosition?.title || selectedApp.position || "-"}
                                </p>
                                <p className="text-xs text-slate-600 font-medium truncate flex items-center gap-1.5 mt-0.5">
                                    <Mail className="w-3.5 h-3.5 text-[#4169E1] flex-shrink-0" />
                                    <span className="truncate">{selectedApp.Candidate?.email || "-"}</span>
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm">
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">วันที่</p>
                                <p className="text-sm font-mono font-bold text-slate-800">{interviewDate || "-"}</p>
                            </div>
                            <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm">
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">เวลา</p>
                                <p className="text-sm font-mono font-bold text-slate-800">{interviewTime ? `${interviewTime} น.` : "-"}</p>
                            </div>
                            <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm col-span-2">
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">รูปแบบการสัมภาษณ์</p>
                                <p className="text-sm font-mono font-bold text-slate-800">{formatLabels[interviewFormat] || interviewFormat}</p>
                            </div>

                            {/* กรณี Online Interview: แสดงลิงก์, Meeting ID, Passcode */}
                            {interviewFormat === "online" && (
                                <>
                                    <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm col-span-2">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">ลิงก์ประชุมออนไลน์ (Join Link)</p>
                                        <p className="text-sm font-mono font-bold text-slate-800 break-all">{interviewLink || "-"}</p>
                                    </div>
                                    <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Meeting ID</p>
                                        <p className="text-sm font-mono font-bold text-slate-800">{meetingId || "-"}</p>
                                    </div>
                                    <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Passcode</p>
                                        <p className="text-sm font-mono font-bold text-slate-800">{passcode || "-"}</p>
                                    </div>
                                </>
                            )}

                            {/* กรณี onsite Interview: แสดงสถานที่สัมภาษณ์ และ ที่อยู่ */}
                            {interviewFormat === "onsite" && (
                                <>
                                    <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm col-span-2">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">สถานที่สัมภาษณ์</p>
                                        <p className="text-sm font-mono font-bold text-slate-800">{interviewLink || "-"}</p>
                                    </div>
                                    <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm col-span-2">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">ที่อยู่</p>
                                        <p className="text-sm font-mono font-bold text-slate-800">{onsiteAddress || "-"}</p>
                                    </div>
                                </>
                            )}

                            {/* กรณี Phone Interview: แสดงเบอร์โทรศัพท์สำหรับสัมภาษณ์ */}
                            {interviewFormat === "phone" && (
                                <div className="bg-white/90 rounded-xl p-3 border border-slate-100 shadow-sm col-span-2">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">เบอร์โทรศัพท์สำหรับสัมภาษณ์</p>
                                    <p className="text-sm font-bold text-slate-800">{interviewLink || "-"}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default InterviewConfirmModal;
