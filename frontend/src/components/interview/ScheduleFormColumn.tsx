import { useState, useRef, useEffect, JSX } from "react";
import {
    CalendarDays,
    Clock,
    Phone,
    MapPin,
    Link as LinkIcon,
    Hash,
    KeyRound,
    CheckCircle2,
    Save,
    Loader2,
} from "lucide-react";
import { formatPhoneNumber, handlePhoneKeyDown } from "../rules/rule";

export interface ScheduleFormColumnProps {
    selectedApp: any;
    selectedAppId: number | null;
    interviewDate: string;
    setInterviewDate: (val: string) => void;
    interviewTime: string;
    setInterviewTime: (val: string) => void;
    interviewFormat: string;
    setInterviewFormat: (val: string) => void;
    interviewLink: string;
    setInterviewLink: (val: string) => void;
    onsiteAddress: string;
    setOnsiteAddress: (val: string) => void;
    meetingId: string;
    setMeetingId: (val: string) => void;
    passcode: string;
    setPasscode: (val: string) => void;
    saving: boolean;
    saveSuccess: boolean;
    editingInterviewId: number | null;
    onOpenConfirmModal: () => void;
    handleResetEmailTemplate: (
        appId?: number | null,
        format?: string,
        link?: string,
        date?: string,
        time?: string,
        meetingId?: string,
        passcode?: string,
        onsiteAddress?: string
    ) => void;
    formatLabels: Record<string, string>;
    formatIcons: Record<string, JSX.Element>;
}

/**
 * คอลัมน์ที่ 2: กำหนดวันและเวลาการนัดสัมภาษณ์ (เลือกวันที่, เวลา, รูปแบบ Online/Onsite/Phone, และบันทึก)
 */
export function ScheduleFormColumn({
    selectedApp,
    selectedAppId,
    interviewDate,
    setInterviewDate,
    interviewTime,
    setInterviewTime,
    interviewFormat,
    setInterviewFormat,
    interviewLink,
    setInterviewLink,
    onsiteAddress,
    setOnsiteAddress,
    meetingId,
    setMeetingId,
    passcode,
    setPasscode,
    saving,
    saveSuccess,
    editingInterviewId,
    onOpenConfirmModal,
    handleResetEmailTemplate,
    formatLabels,
    formatIcons,
}: ScheduleFormColumnProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);
    const timeRef = useRef<HTMLDivElement>(null);
    const [openTimeDropdown, setOpenTimeDropdown] = useState<"hour" | "minute" | null>(null);

    // ปิด Time Dropdown เมื่อคลิกนอกพื้นที่
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
                setOpenTimeDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-5">
            <h3 className="text-sm font-black text-slate-700">กำหนดวันและเวลาการนัดสัมภาษณ์</h3>

            <div className="space-y-4">
                {/* ── วันสัมภาษณ์ ── */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                        วันสัมภาษณ์ (วัน/เดือน/ปี)
                    </label>
                    <div
                        onClick={() => {
                            try {
                                dateInputRef.current?.showPicker();
                            } catch {
                                dateInputRef.current?.focus();
                            }
                        }}
                        className="relative flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#4169E1]/20 transition-all cursor-pointer hover:border-slate-300"
                    >
                        <CalendarDays className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                        <span
                            className={`text-sm select-none ${
                                interviewDate ? "text-slate-800 font-bold" : "text-slate-400 font-medium"
                            }`}
                        >
                            {interviewDate
                                ? (() => {
                                      const [y, m, d] = interviewDate.split("-");
                                      return `${d}/${m}/${y}`;
                                  })()
                                : "วว/ดด/ปปปป"}
                        </span>
                        <CalendarDays className="w-4 h-4 text-[#4169E1] ml-auto flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity" />
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={interviewDate}
                            onChange={(e) => {
                                setInterviewDate(e.target.value);
                                if (selectedAppId) {
                                    handleResetEmailTemplate(selectedAppId, undefined, undefined, e.target.value);
                                }
                            }}
                            className="sr-only"
                            tabIndex={-1}
                        />
                    </div>
                </div>

                {/* ── เวลานัดหมาย (พิมพ์เองได้ + มีปุ่ม dropdown) ── */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">เวลานัดหมาย</label>
                    <div
                        ref={timeRef}
                        className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-[#4169E1]/20 transition-all"
                    >
                        <Clock className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                        <div className="flex items-center gap-2 flex-1">
                            {/* ชั่วโมง */}
                            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg focus-within:bg-white focus-within:border-[#4169E1] transition-colors">
                                <input
                                    type="text"
                                    maxLength={2}
                                    value={interviewTime.split(":")[0] ?? "10"}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        const m = interviewTime.split(":")[1] || "00";
                                        setInterviewTime(`${val}:${m}`);
                                    }}
                                    onBlur={(e) => {
                                        let val = e.target.value.replace(/\D/g, "");
                                        let num = parseInt(val, 10);
                                        if (isNaN(num)) num = 10;
                                        if (num < 0) num = 0;
                                        if (num > 23) num = 23;
                                        const h = String(num).padStart(2, "0");
                                        const m = interviewTime.split(":")[1] || "00";
                                        const newT = `${h}:${m}`;
                                        setInterviewTime(newT);
                                        if (selectedAppId) {
                                            handleResetEmailTemplate(selectedAppId, undefined, undefined, undefined, newT);
                                        }
                                    }}
                                    className="w-8 py-1 pl-2 text-center text-sm font-bold text-slate-700 bg-transparent focus:outline-none"
                                    placeholder="10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setOpenTimeDropdown(openTimeDropdown === "hour" ? null : "hour")}
                                    className="px-1.5 py-1 text-[9px] text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-r-lg transition-colors cursor-pointer"
                                    title="เลือกชั่วโมง"
                                >
                                    ▼
                                </button>

                                {openTimeDropdown === "hour" && (
                                    <div className="absolute left-0 top-full mt-1.5 w-20 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-50 animate-[fadeIn_0.15s_ease]">
                                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => {
                                                    const m = interviewTime.split(":")[1] || "00";
                                                    const newT = `${h}:${m}`;
                                                    setInterviewTime(newT);
                                                    setOpenTimeDropdown(null);
                                                    if (selectedAppId) {
                                                        handleResetEmailTemplate(
                                                            selectedAppId,
                                                            undefined,
                                                            undefined,
                                                            undefined,
                                                            newT
                                                        );
                                                    }
                                                }}
                                                className={`w-full px-3 py-1.5 text-xs text-center font-bold transition-colors cursor-pointer ${
                                                    (interviewTime.split(":")[0] || "10") === h
                                                        ? "bg-[#4169E1] text-white"
                                                        : "text-slate-700 hover:bg-indigo-50 hover:text-[#4169E1]"
                                                }`}
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <span className="text-slate-400 font-black text-sm">:</span>

                            {/* นาที */}
                            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg focus-within:bg-white focus-within:border-[#4169E1] transition-colors">
                                <input
                                    type="text"
                                    maxLength={2}
                                    value={interviewTime.split(":")[1] ?? "00"}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        const h = interviewTime.split(":")[0] || "10";
                                        setInterviewTime(`${h}:${val}`);
                                    }}
                                    onBlur={(e) => {
                                        let val = e.target.value.replace(/\D/g, "");
                                        let num = parseInt(val, 10);
                                        if (isNaN(num)) num = 0;
                                        if (num < 0) num = 0;
                                        if (num > 59) num = 59;
                                        const m = String(num).padStart(2, "0");
                                        const h = interviewTime.split(":")[0] || "10";
                                        const newT = `${h}:${m}`;
                                        setInterviewTime(newT);
                                        if (selectedAppId) {
                                            handleResetEmailTemplate(selectedAppId, undefined, undefined, undefined, newT);
                                        }
                                    }}
                                    className="w-8 py-1 pl-2 text-center text-sm font-bold text-slate-700 bg-transparent focus:outline-none"
                                    placeholder="00"
                                />
                                <button
                                    type="button"
                                    onClick={() => setOpenTimeDropdown(openTimeDropdown === "minute" ? null : "minute")}
                                    className="px-1.5 py-1 text-[9px] text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-r-lg transition-colors cursor-pointer"
                                    title="เลือกนาที"
                                >
                                    ▼
                                </button>
                                {openTimeDropdown === "minute" && (
                                    <div className="absolute left-0 top-full mt-1.5 w-20 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-50 animate-[fadeIn_0.15s_ease]">
                                        {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(
                                            (m) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => {
                                                        const h = interviewTime.split(":")[0] || "10";
                                                        const newT = `${h}:${m}`;
                                                        setInterviewTime(newT);
                                                        setOpenTimeDropdown(null);
                                                        if (selectedAppId) {
                                                            handleResetEmailTemplate(
                                                                selectedAppId,
                                                                undefined,
                                                                undefined,
                                                                undefined,
                                                                newT
                                                            );
                                                        }
                                                    }}
                                                    className={`w-full px-3 py-1.5 text-xs text-center font-bold transition-colors cursor-pointer ${
                                                        (interviewTime.split(":")[1] || "00") === m
                                                            ? "bg-[#4169E1] text-white"
                                                            : "text-slate-700 hover:bg-indigo-50 hover:text-[#4169E1]"
                                                    }`}
                                                >
                                                    {m}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            <span className="text-xs text-slate-500 font-bold ml-1">น.</span>
                        </div>
                    </div>
                </div>

                {/* ── รูปแบบสัมภาษณ์ ── */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">รูปแบบสัมภาษณ์</label>
                    <select
                        value={interviewFormat}
                        onChange={(e) => {
                            const newFormat = e.target.value;
                            setInterviewFormat(newFormat);

                            // Auto-suggest appropriate venue / contact based on format
                            let newLink = interviewLink;
                            const cand = selectedApp?.Candidate;
                            const candPhone = cand?.phone || cand?.Phone || "";

                            if (newFormat === "phone") {
                                if (
                                    !interviewLink ||
                                    interviewLink.includes("meet.google") ||
                                    interviewLink.includes("ห้องประชุม") ||
                                    interviewLink.includes("Lab") ||
                                    !/^0/.test(interviewLink.trim())
                                ) {
                                    newLink = formatPhoneNumber(candPhone);
                                    setInterviewLink(newLink);
                                } else {
                                    newLink = formatPhoneNumber(interviewLink);
                                    setInterviewLink(newLink);
                                }
                            } else if (newFormat === "onsite") {
                                if (
                                    !interviewLink ||
                                    interviewLink.includes("meet.google") ||
                                    /^0\d/.test(interviewLink.trim())
                                ) {
                                    newLink = "";
                                    setInterviewLink(newLink);
                                }
                            } else if (newFormat === "online") {
                                if (
                                    !interviewLink ||
                                    interviewLink.includes("ห้องประชุม") ||
                                    interviewLink.includes("อาคาร") ||
                                    /^0\d/.test(interviewLink.trim())
                                ) {
                                    newLink = "";
                                    setInterviewLink(newLink);
                                }
                            }

                            if (selectedAppId) {
                                handleResetEmailTemplate(selectedAppId, newFormat, newLink);
                            }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all cursor-pointer font-medium"
                    >
                        <option value="online">Online Interview (Google Meet / Microsoft Teams / Zoom)</option>
                        <option value="onsite">Onsite Interview (สถานที่ / บริษัท)</option>
                        <option value="phone">Phone Interview (โทรศัพท์)</option>
                    </select>
                </div>

                {/* ── ช่องกรอกข้อมูลตามรูปแบบ (Link / เบอร์โทร / สถานที่) ── */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                        {interviewFormat === "online"
                            ? "ลิงก์ประชุมออนไลน์"
                            : interviewFormat === "phone"
                            ? "เบอร์โทรศัพท์สำหรับสัมภาษณ์"
                            : interviewFormat === "onsite"
                            ? "สถานที่สัมภาษณ์"
                            : ""}
                    </label>
                    <div className="relative">
                        {interviewFormat === "phone" ? (
                            <Phone className="w-4 h-4 text-teal-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        ) : interviewFormat === "onsite" ? (
                            <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        ) : (
                            <LinkIcon className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                        <input
                            type={interviewFormat === "phone" ? "tel" : "text"}
                            placeholder={
                                interviewFormat === "online"
                                    ? "เช่น https://meet.google.com/..."
                                    : interviewFormat === "phone"
                                    ? "เช่น 081-234-5678 หรือ 02-123-4567"
                                    : interviewFormat === "onsite"
                                    ? "เช่น อาคาร 1, ชั้น 2 หรือ ห้องประชุม 301"
                                    : ""
                            }
                            value={interviewLink}
                            onKeyDown={(e) => {
                                if (interviewFormat === "phone") {
                                    handlePhoneKeyDown(e, interviewLink);
                                }
                            }}
                            onChange={(e) => {
                                let val = e.target.value;
                                if (interviewFormat === "phone") {
                                    val = formatPhoneNumber(val);
                                }
                                setInterviewLink(val);
                                if (selectedAppId) {
                                    handleResetEmailTemplate(selectedAppId, undefined, val);
                                }
                            }}
                            maxLength={interviewFormat === "phone" ? 12 : undefined}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* ช่องกรอกข้อมูลที่อยู่ สำหรับ onsite */}
                {interviewFormat === "onsite" && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">ที่อยู่</label>
                        <div className="relative">
                            <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="เช่น สำนักงานใหญ่ หรือ 123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ"
                                value={onsiteAddress}
                                onChange={(e) => {
                                    setOnsiteAddress(e.target.value);
                                    if (selectedAppId) {
                                        handleResetEmailTemplate(
                                            selectedAppId,
                                            undefined,
                                            undefined,
                                            undefined,
                                            undefined,
                                            undefined,
                                            undefined,
                                            e.target.value
                                        );
                                    }
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all font-medium"
                            />
                        </div>
                    </div>
                )}

                {/* Meeting ID & Passcode สำหรับ Online */}
                {interviewFormat === "online" && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Meeting ID</label>
                            <div className="relative">
                                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="เช่น 829 1029 3847"
                                    value={meetingId}
                                    onChange={(e) => {
                                        setMeetingId(e.target.value);
                                        if (selectedAppId) {
                                            handleResetEmailTemplate(
                                                selectedAppId,
                                                undefined,
                                                undefined,
                                                undefined,
                                                undefined,
                                                e.target.value
                                            );
                                        }
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all font-mono"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Passcode</label>
                            <div className="relative">
                                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="เช่น 123456"
                                    value={passcode}
                                    onChange={(e) => {
                                        setPasscode(e.target.value);
                                        if (selectedAppId) {
                                            handleResetEmailTemplate(
                                                selectedAppId,
                                                undefined,
                                                undefined,
                                                undefined,
                                                undefined,
                                                undefined,
                                                e.target.value
                                            );
                                        }
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Card */}
            {selectedApp && interviewDate && (
                <div className="mt-4 bg-white border border-indigo-100 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-[#4169E1] uppercase tracking-wider">ตัวอย่าง</p>
                    <p className="text-sm font-bold text-slate-800">
                        {selectedApp.Candidate?.first_name} {selectedApp.Candidate?.last_name}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" /> {interviewDate}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {interviewTime} น.
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        {formatIcons[interviewFormat]}
                        <span>{formatLabels[interviewFormat]}</span>
                    </div>
                    {/* ข้อมูลเฉพาะตามรูปแบบใน Preview Card */}
                    {interviewFormat === "online" && (
                        <>
                            {interviewLink && (
                                <p className="text-xs text-indigo-600 font-medium break-all">
                                    🔗 ลิงก์: {interviewLink}
                                </p>
                            )}
                            {(meetingId || passcode) && (
                                <div className="flex gap-3 text-[11px] text-slate-500 font-mono font-medium pt-1 border-t border-slate-100">
                                    {meetingId && <span>ID: {meetingId}</span>}
                                    {passcode && <span>Passcode: {passcode}</span>}
                                </div>
                            )}
                        </>
                    )}

                    {interviewFormat === "onsite" && (
                        <>
                            {interviewLink && (
                                <p className="text-xs text-slate-700 font-medium break-all">
                                    📍 สถานที่: {interviewLink}
                                </p>
                            )}
                            {onsiteAddress && (
                                <p className="text-xs text-slate-500 font-medium break-all">
                                    🏢 ที่อยู่: {onsiteAddress}
                                </p>
                            )}
                        </>
                    )}

                    {interviewFormat === "phone" && interviewLink && (
                        <p className="text-xs text-slate-700 font-mono font-medium">
                            📞 เบอร์โทรศัพท์: {interviewLink}
                        </p>
                    )}
                </div>
            )}

            {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    บันทึกนัดสัมภาษณ์สำเร็จ! ข้อมูลถูกเติมในจดหมายเชิญแล้ว
                </div>
            )}

            {/* ── ปุ่มบันทึกสวย (Gradient + Animation) ── */}
            <button
                disabled={saving || !selectedAppId || !interviewDate}
                onClick={onOpenConfirmModal}
                className="group w-full mt-2 relative overflow-hidden bg-gradient-to-r from-[#4169E1] via-[#5B7FFF] to-[#7C3AED] text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                ) : (
                    <Save className="w-5 h-5 relative z-10" />
                )}
                <span className="relative z-10">
                    {saving
                        ? "กำลังบันทึก..."
                        : editingInterviewId
                        ? "อัปเดตข้อมูลการนัดสัมภาษณ์"
                        : "บันทึกข้อมูลการนัดสัมภาษณ์"}
                </span>
            </button>
        </div>
    );
}

export default ScheduleFormColumn;
