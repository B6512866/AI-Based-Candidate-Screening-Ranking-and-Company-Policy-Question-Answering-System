import { JSX, useState, useEffect } from "react";
import {
    Users,
    CheckCircle2,
    Clock,
    AlertTriangle,
    XCircle,
    Video,
    MapPin,
    Phone,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
    getAllInterviews,
    createInterview,
    updateInterview,
    deleteInterview,
    getCandidatesForInterview,
    sendInterviewEmail,
} from "../../services/interviewService";
import { formatPhoneNumber, formatTime12H } from "../../components/rules/rule";
import {
    buildInterviewEmailContent,
    parseInterviewFormatDescription,
    serializeInterviewFormatDescription,
    InterviewConfirmModal,
    InterviewEmailModal,
    InterviewEmailSuccessModal,
    CandidateListColumn,
    ScheduleFormColumn,
    EmailEditorColumn,
    InterviewTableTab,
} from "../../components/interview";
import type { InterviewEmailParams } from "../../components/interview";

// Re-export for backward compatibility
export { formatPhoneNumber, formatTime12H, buildInterviewEmailContent };
export type { InterviewEmailParams };

// ── Helpers ──────────────────────────────────────────────────────────
const statusMap: Record<string, string> = {
    pending: "รอยืนยัน",
    confirmed: "ยืนยันแล้ว",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
    rescheduled: "ขอเลื่อนนัด",
};

const statusStyles: Record<string, string> = {
    "ยืนยันแล้ว": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "รอยืนยัน": "bg-amber-50 text-amber-700 border-amber-200",
    "ขอเลื่อนนัด": "bg-orange-50 text-orange-700 border-orange-200",
    "ยกเลิก": "bg-rose-50 text-rose-700 border-rose-200",
    "เสร็จสิ้น": "bg-sky-50 text-sky-700 border-sky-200",
};

const formatIcons: Record<string, JSX.Element> = {
    online: <Video className="w-4 h-4 text-indigo-500" />,
    onsite: <MapPin className="w-4 h-4 text-rose-500" />,
    phone: <Phone className="w-4 h-4 text-teal-500" />,
};

const formatLabels: Record<string, string> = {
    online: "Online Interview (Google Meet / Microsoft Teams / Zoom)",
    onsite: "Onsite Interview (สถานที่ / บริษัท)",
    phone: "Phone Interview (โทรศัพท์)",
};

function formatThaiDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        const formatted = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
        return formatted.replace(/\s+/g, "\u00A0");
    } catch {
        return dateStr;
    }
}

function formatTime(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) + " น.";
    } catch {
        return dateStr;
    }
}

// ══════════════════════════════════════════════════════════════════
export default function InterviewsPage() {
    // ── Tab state ──
    const [activeTab, setActiveTab] = useState<"create" | "table">("create");
    const [tableFilterStatus, setTableFilterStatus] = useState("ทั้งหมด");

    const handleStatCardClick = (status: string) => {
        setActiveTab("table");
        if (activeTab === "table" && tableFilterStatus === status) {
            setTableFilterStatus("ทั้งหมด");
        } else {
            setTableFilterStatus(status);
        }
    };

    // ── Data from API ──
    const [interviews, setInterviews] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loadingInterviews, setLoadingInterviews] = useState(false);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    // ── Create tab state ──
    const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
    const [interviewDate, setInterviewDate] = useState("");
    const [interviewTime, setInterviewTime] = useState("10:00");
    const [interviewFormat, setInterviewFormat] = useState("online");
    const [interviewLink, setInterviewLink] = useState("");
    const [onsiteAddress, setOnsiteAddress] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [lastSavedInterviewId, setLastSavedInterviewId] = useState<number | null>(null);
    const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
    const [sendingEmail, setSendingEmail] = useState(false);

    // ── Email content (auto-filled after save) ──
    const [emailContent, setEmailContent] = useState("");

    // ── HR Contact & Meeting Info ──
    const { firstName, lastName } = useAuth();
    const hrFullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || "HR Recruitment Team";
    const [meetingId, setMeetingId] = useState("");
    const [passcode, setPasscode] = useState("");
    const hrTel = "02-123-4567";
    const hrMobile = "081-234-5678";
    const hrEmail = "hr@hireai-recruitment.com";

    // ── Modal states ──
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailModalTab, setEmailModalTab] = useState<"edit" | "preview">("edit");
    const [showEmailSentSuccessModal, setShowEmailSentSuccessModal] = useState(false);

    // ── Function รีเซ็ต/สร้างเนื้อหาอีเมลตามแบบร่างสองภาษา (English + Thai) ──
    const handleResetEmailTemplate = (
        targetAppId?: number | null,
        targetFormat?: string,
        targetLink?: string,
        targetDate?: string,
        targetTime?: string,
        targetMeetingId?: string,
        targetPasscode?: string,
        targetOnsiteAddress?: string
    ) => {
        const appId = targetAppId !== undefined ? targetAppId : selectedAppId;
        const app = candidates.find((c) => c.ID === appId) || (selectedAppId === appId ? selectedApp : undefined);
        const cand = app?.Candidate;
        const candName = cand ? `${cand.first_name} ${cand.last_name}` : "ผู้สมัคร";
        const rawCandPhone = cand?.phone || cand?.Phone || "";
        const candPhone = formatPhoneNumber(rawCandPhone);
        const posTitle = app?.JobPosition?.title || app?.position || "ตำแหน่งงาน";
        const appCode = app?.application_code || app?.ApplicationCode || (app?.ID ? `APP-${10000 + app.ID}` : "-");

        const dateVal = targetDate !== undefined ? targetDate : interviewDate;
        const [y, m, d] = (dateVal || "").split("-");
        const displayDate = y && m && d ? `${d}/${m}/${y}` : dateVal || "วว/ดด/ปปปป";

        const timeVal = targetTime !== undefined ? targetTime : interviewTime;
        const formatVal = targetFormat !== undefined ? targetFormat : interviewFormat;
        let linkVal = targetLink !== undefined ? targetLink : interviewLink;
        if (formatVal === "phone") {
            linkVal = formatPhoneNumber(linkVal || candPhone);
        }
        const addressVal = targetOnsiteAddress !== undefined ? targetOnsiteAddress : onsiteAddress;
        const mId = targetMeetingId !== undefined ? targetMeetingId : meetingId;
        const pwd = targetPasscode !== undefined ? targetPasscode : passcode;

        setEmailContent(
            buildInterviewEmailContent({
                candidateName: candName,
                candidatePhone: candPhone,
                position: posTitle,
                appCode: appCode,
                date: displayDate,
                time: timeVal,
                format: formatVal,
                venueLink: linkVal,
                onsiteAddress: addressVal,
                meetingId: mId,
                passcode: pwd,
                hrName: hrFullName,
                hrTel: hrTel,
                hrMobile: hrMobile,
                hrEmail: hrEmail,
            })
        );
    };

    // ── Function เลือกผู้สมัคร พร้อมดึงข้อมูลนัดสัมภาษณ์ที่บันทึกไว้แล้ว (ถ้ามี) ──
    const handleSelectCandidate = (app: any) => {
        if (!app) return;
        setSelectedAppId(app.ID);

        // ค้นหานัดสัมภาษณ์ที่เคยบันทึกไว้แล้วใน interviews ของผู้สมัครรายนี้
        const existingIv = interviews.find((iv) => {
            const ivAppId = iv.application_id || iv.ApplicationID || iv.Application?.ID;
            return ivAppId === app.ID;
        });

        const cand = app.Candidate;
        const candName = cand ? `${cand.first_name} ${cand.last_name}` : "ผู้สมัคร";
        const rawCandPhone = cand?.phone || cand?.Phone || "";
        const candPhone = formatPhoneNumber(rawCandPhone);
        const posTitle = app.JobPosition?.title || app.position || "ตำแหน่งงาน";
        const appCode = app.application_code || app.ApplicationCode || (app.ID ? `APP-${10000 + app.ID}` : "-");

        if (existingIv) {
            // โหลดวันและเวลาจากการนัดหมายที่บันทึกไว้แล้ว
            const dt = new Date(existingIv.interview_datetime);
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, "0");
            const day = String(dt.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;
            const hours = String(dt.getHours()).padStart(2, "0");
            const minutes = String(dt.getMinutes()).padStart(2, "0");
            const timeStr = `${hours}:${minutes}`;

            const formatStr = existingIv.format || "online";
            const rawLinkStr = existingIv.format_description || "";
            const parsed = parseInterviewFormatDescription(rawLinkStr);
            let linkStr = parsed.link;

            if (formatStr === "phone") {
                linkStr = formatPhoneNumber(linkStr) || candPhone;
            }

            setInterviewDate(dateStr);
            setInterviewTime(timeStr);
            setInterviewFormat(formatStr);
            setInterviewLink(linkStr);
            setOnsiteAddress(parsed.address);
            setMeetingId(parsed.meetingId);
            setPasscode(parsed.passcode);
            setEditingInterviewId(existingIv.ID);
            setLastSavedInterviewId(existingIv.ID);
            setSaveSuccess(false);

            setEmailContent(
                buildInterviewEmailContent({
                    candidateName: candName,
                    candidatePhone: candPhone,
                    position: posTitle,
                    appCode: appCode,
                    date: `${day}/${month}/${year}`,
                    time: timeStr,
                    format: formatStr,
                    venueLink: linkStr,
                    onsiteAddress: parsed.address,
                    meetingId: parsed.meetingId,
                    passcode: parsed.passcode,
                    hrName: hrFullName,
                    hrTel: hrTel,
                    hrMobile: hrMobile,
                    hrEmail: hrEmail,
                })
            );
        } else {
            // ยังไม่มีการนัดหมาย -> รีเซ็ตฟอร์มเป็นค่าว่างเพื่อเตรียมกำหนดนัดใหม่
            setEditingInterviewId(null);
            setLastSavedInterviewId(null);
            setInterviewDate("");
            setInterviewTime("10:00");
            setInterviewFormat("online");
            setInterviewLink("");
            setOnsiteAddress("");
            setMeetingId("");
            setPasscode("");
            setSaveSuccess(false);

            handleResetEmailTemplate(app.ID, "online", "", "", "10:00");
        }
    };

    // ── Fetch data ──
    const fetchInterviews = async () => {
        setLoadingInterviews(true);
        try {
            const res = await getAllInterviews();
            if (res?.data) setInterviews(res.data);
        } catch (err) {
            console.error("Failed to fetch interviews:", err);
        } finally {
            setLoadingInterviews(false);
        }
    };

    const fetchCandidates = async () => {
        setLoadingCandidates(true);
        try {
            const res = await getCandidatesForInterview();
            if (res?.data) setCandidates(res.data);
        } catch (err) {
            console.error("Failed to fetch candidates:", err);
        } finally {
            setLoadingCandidates(false);
        }
    };

    useEffect(() => {
        fetchInterviews();
        fetchCandidates();
    }, []);

    const selectedApp = candidates.find((c) => c.ID === selectedAppId) || null;

    // Stats
    const totalCount = interviews.length;
    const confirmedCount = interviews.filter((iv) => iv.interview_status === "confirmed").length;
    const pendingCount = interviews.filter((iv) => iv.interview_status === "pending").length;
    const rescheduleCount = interviews.filter((iv) => iv.interview_status === "rescheduled").length;
    const cancelledCount = interviews.filter((iv) => iv.interview_status === "cancelled").length;

    // ── Handlers ──
    const handleSaveInterview = async () => {
        setShowConfirmModal(false);
        if (!selectedAppId || !interviewDate) {
            alert("กรุณาเลือกผู้สมัครและกำหนดวัน/เวลา");
            return;
        }
        setSaving(true);
        setSaveSuccess(false);
        try {
            const formatDescriptionToSave = serializeInterviewFormatDescription({
                format: interviewFormat,
                interviewLink,
                onsiteAddress,
                meetingId,
                passcode,
            });

            let res;
            if (editingInterviewId) {
                res = await updateInterview(editingInterviewId, {
                    interview_date: interviewDate,
                    interview_time: interviewTime,
                    format: interviewFormat,
                    format_description: formatDescriptionToSave,
                });
            } else {
                res = await createInterview(
                    selectedAppId,
                    interviewDate,
                    interviewTime,
                    interviewFormat,
                    formatDescriptionToSave
                );
            }
            if (res?.data) {
                const savedId = res.data.ID || editingInterviewId;
                setLastSavedInterviewId(savedId);

                const cand = selectedApp?.Candidate;
                const candName = cand ? `${cand.first_name} ${cand.last_name}` : "ผู้สมัคร";
                const candPhone = formatPhoneNumber(cand?.phone || cand?.Phone || "");
                const posTitle = selectedApp?.JobPosition?.title || selectedApp?.position || "ตำแหน่งงาน";
                const appCode = selectedApp?.application_code || selectedApp?.ApplicationCode || (selectedApp?.ID ? `APP-${10000 + selectedApp.ID}` : "-");
                const [y, m, d] = (interviewDate || "").split("-");
                const displayDate = y && m && d ? `${d}/${m}/${y}` : interviewDate;
                const linkVal = interviewFormat === "phone" ? formatPhoneNumber(interviewLink) : interviewLink;

                setEmailContent(
                    buildInterviewEmailContent({
                        candidateName: candName,
                        candidatePhone: candPhone,
                        position: posTitle,
                        appCode: appCode,
                        date: displayDate,
                        time: interviewTime,
                        format: interviewFormat,
                        venueLink: linkVal,
                        onsiteAddress: onsiteAddress,
                        meetingId: meetingId,
                        passcode: passcode,
                        hrName: hrFullName,
                        hrTel: hrTel,
                        hrMobile: hrMobile,
                        hrEmail: hrEmail,
                    })
                );
                setSaveSuccess(true);
                setEditingInterviewId(savedId);
                fetchInterviews();
            }
        } catch (err: any) {
            alert(err.response?.data?.error || "เกิดข้อผิดพลาดในการบันทึกนัดสัมภาษณ์");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (iv: any) => {
        const dt = new Date(iv.interview_datetime);
        const appId = iv.application_id || iv.ApplicationID || iv.Application?.ID;

        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        const day = String(dt.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const hours = String(dt.getHours()).padStart(2, "0");
        const minutes = String(dt.getMinutes()).padStart(2, "0");
        const timeStr = `${hours}:${minutes}`;

        const formatStr = iv.format || "online";
        const rawLinkStr = iv.format_description || "";
        const parsed = parseInterviewFormatDescription(rawLinkStr);
        const cand = iv.application?.Candidate || iv.Application?.Candidate;
        const candPhone = formatPhoneNumber(cand?.phone || cand?.Phone || "");
        const job = iv.application?.JobPosition || iv.Application?.JobPosition;
        const candName = cand ? `${cand.first_name} ${cand.last_name}` : "ผู้สมัคร";
        const posTitle = job?.title || iv.position || "ตำแหน่งงาน";
        const targetApp = iv.application || iv.Application;
        const appCode = targetApp?.application_code || targetApp?.ApplicationCode || (appId ? `APP-${10000 + appId}` : "-");
        
        let linkStr = parsed.link;
        if (formatStr === "phone") {
            linkStr = formatPhoneNumber(linkStr) || candPhone;
        }

        setSelectedAppId(appId);
        setInterviewDate(dateStr);
        setInterviewTime(timeStr);
        setInterviewFormat(formatStr);
        setInterviewLink(linkStr);
        setOnsiteAddress(parsed.address);
        setMeetingId(parsed.meetingId);
        setPasscode(parsed.passcode);
        setEditingInterviewId(iv.ID);
        setLastSavedInterviewId(iv.ID);

        setEmailContent(
            buildInterviewEmailContent({
                candidateName: candName,
                candidatePhone: candPhone,
                position: posTitle,
                appCode: appCode,
                date: `${day}/${month}/${year}`,
                time: timeStr,
                format: formatStr,
                venueLink: linkStr,
                onsiteAddress: parsed.address,
                meetingId: parsed.meetingId,
                passcode: parsed.passcode,
                hrName: hrFullName,
                hrTel: hrTel,
                hrMobile: hrMobile,
                hrEmail: hrEmail,
            })
        );
        setSaveSuccess(false);
        setActiveTab("create");
    };

    const handleDelete = async (id: number) => {
        const targetIv = interviews.find((iv) => iv.ID === id);
        const targetAppId = targetIv?.application_id || targetIv?.ApplicationID || targetIv?.Application?.ID;
        const targetName = targetIv?.application?.Candidate
            ? `${targetIv.application.Candidate.first_name} ${targetIv.application.Candidate.last_name}`
            : "รายการนี้";

        if (!confirm(`ต้องการลบนัดสัมภาษณ์ของ "${targetName}" หรือไม่?`)) return;
        try {
            await deleteInterview(id);

            setInterviews((prev) =>
                prev.filter((iv) => {
                    const ivAppId = iv.application_id || iv.ApplicationID || iv.Application?.ID;
                    return iv.ID !== id && (targetAppId ? ivAppId !== targetAppId : true);
                })
            );

            if (editingInterviewId === id || selectedAppId === targetAppId) {
                setEditingInterviewId(null);
                setLastSavedInterviewId(null);
                setInterviewDate("");
                setInterviewTime("10:00");
                setInterviewFormat("online");
                setInterviewLink("");
                setOnsiteAddress("");
                setMeetingId("");
                setPasscode("");
                setEmailContent("");
                setSaveSuccess(false);
            }

            await fetchInterviews();
            await fetchCandidates();
        } catch (err: any) {
            alert(err.response?.data?.error || "ลบไม่สำเร็จ");
        }
    };

    const handleSendEmail = async () => {
        if (!lastSavedInterviewId) {
            alert("กรุณาบันทึกข้อมูลการนัดสัมภาษณ์ก่อน");
            return;
        }
        setShowEmailModal(false);
        setSendingEmail(true);
        try {
            await sendInterviewEmail(lastSavedInterviewId, emailContent);
            setShowEmailSentSuccessModal(true);
        } catch (err: any) {
            alert(err.response?.data?.error || "ส่งอีเมลไม่สำเร็จ");
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 font-sans">
            {/* ── Statistics Cards (Large & Clickable - matching InterviewResultsPage) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {/* 1. All */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("ทั้งหมด")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        activeTab === "table" && tableFilterStatus === "ทั้งหมด"
                            ? "bg-white border-[#4169E1] ring-2 ring-[#4169E1]/15 shadow-md"
                            : "bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#4169E1] transition-transform group-hover:scale-105">
                            <Users className="w-5 h-5" />
                        </div>
                        {activeTab === "table" && tableFilterStatus === "ทั้งหมด" && (
                            <span className="text-[10px] font-bold text-[#4169E1] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                กำลังดู
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">นัดหมายทั้งหมด</p>
                        <p className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-0.5">{totalCount}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">รายการนัดหมายในระบบทั้งหมด</p>
                    </div>
                </button>

                {/* 2. Confirmed */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("ยืนยันแล้ว")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        activeTab === "table" && tableFilterStatus === "ยืนยันแล้ว"
                            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                            : "bg-white border-slate-100 hover:border-emerald-200 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-105">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        {activeTab === "table" && tableFilterStatus === "ยืนยันแล้ว" && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                กำลังดู
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ยืนยันแล้ว</p>
                        <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight mt-0.5">{confirmedCount}</p>
                        <p className="text-[10px] text-emerald-600/80 font-medium mt-1">ผู้สมัครกดยืนยันนัดหมายแล้ว</p>
                    </div>
                </button>

                {/* 3. Pending */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("รอยืนยัน")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        activeTab === "table" && tableFilterStatus === "รอยืนยัน"
                            ? "bg-white border-amber-400 ring-2 ring-amber-400/20 shadow-md"
                            : "bg-white border-slate-100 hover:border-amber-200 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 transition-transform group-hover:scale-105">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            {pendingCount > 0 && (
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </span>
                            )}
                            {activeTab === "table" && tableFilterStatus === "รอยืนยัน" && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                    กำลังดู
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รอยืนยัน</p>
                        <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight mt-0.5">{pendingCount}</p>
                        <p className="text-[10px] text-amber-600/80 font-medium mt-1">รอผู้สมัครตอบรับการนัด</p>
                    </div>
                </button>

                {/* 4. Rescheduled */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("ขอเลื่อนนัด")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        activeTab === "table" && tableFilterStatus === "ขอเลื่อนนัด"
                            ? "bg-white border-orange-400 ring-2 ring-orange-400/20 shadow-md"
                            : "bg-white border-slate-100 hover:border-orange-200 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 transition-transform group-hover:scale-105">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        {activeTab === "table" && tableFilterStatus === "ขอเลื่อนนัด" && (
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                กำลังดู
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ขอเลื่อนนัด</p>
                        <p className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight mt-0.5">{rescheduleCount}</p>
                        <p className="text-[10px] text-orange-600/80 font-medium mt-1">ผู้สมัครแจ้งขอเปลี่ยนเวลา</p>
                    </div>
                </button>

                {/* 5. Cancelled */}
                <button
                    type="button"
                    onClick={() => handleStatCardClick("ยกเลิก")}
                    className={`p-4 sm:p-5 rounded-3xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        activeTab === "table" && tableFilterStatus === "ยกเลิก"
                            ? "bg-white border-rose-400 ring-2 ring-rose-400/20 shadow-md"
                            : "bg-white border-slate-100 hover:border-rose-200 shadow-sm hover:shadow hover:-translate-y-0.5"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 transition-transform group-hover:scale-105">
                            <XCircle className="w-5 h-5" />
                        </div>
                        {activeTab === "table" && tableFilterStatus === "ยกเลิก" && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                กำลังดู
                            </span>
                        )}
                    </div>
                    <div className="mt-3.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ยกเลิก</p>
                        <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight mt-0.5">{cancelledCount}</p>
                        <p className="text-[10px] text-rose-600/80 font-medium mt-1">ยกเลิกการนัดสัมภาษณ์</p>
                    </div>
                </button>
            </div>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab("create")}
                        className={`flex-1 py-4 text-sm font-bold transition-all cursor-pointer ${
                            activeTab === "create"
                                ? "text-[#4169E1] border-b-2 border-[#4169E1] bg-indigo-50/40"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        สร้างการนัดสัมภาษณ์
                    </button>
                    <button
                        onClick={() => setActiveTab("table")}
                        className={`flex-1 py-4 text-sm font-bold transition-all cursor-pointer ${
                            activeTab === "table"
                                ? "text-[#4169E1] border-b-2 border-[#4169E1] bg-indigo-50/40"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        ตารางการสัมภาษณ์
                    </button>
                </div>

                {/* ═══════════ TAB: CREATE ═══════════════════════════ */}
                {activeTab === "create" && (
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Column 1: Candidate List */}
                            <CandidateListColumn
                                candidates={candidates}
                                loadingCandidates={loadingCandidates}
                                selectedAppId={selectedAppId}
                                onSelectCandidate={handleSelectCandidate}
                                interviews={interviews}
                                statusMap={statusMap}
                                statusStyles={statusStyles}
                            />

                            {/* Column 2: Schedule Form */}
                            <ScheduleFormColumn
                                selectedApp={selectedApp}
                                selectedAppId={selectedAppId}
                                interviewDate={interviewDate}
                                setInterviewDate={setInterviewDate}
                                interviewTime={interviewTime}
                                setInterviewTime={setInterviewTime}
                                interviewFormat={interviewFormat}
                                setInterviewFormat={setInterviewFormat}
                                interviewLink={interviewLink}
                                setInterviewLink={setInterviewLink}
                                onsiteAddress={onsiteAddress}
                                setOnsiteAddress={setOnsiteAddress}
                                meetingId={meetingId}
                                setMeetingId={setMeetingId}
                                passcode={passcode}
                                setPasscode={setPasscode}
                                saving={saving}
                                saveSuccess={saveSuccess}
                                editingInterviewId={editingInterviewId}
                                onOpenConfirmModal={() => setShowConfirmModal(true)}
                                handleResetEmailTemplate={handleResetEmailTemplate}
                                formatLabels={formatLabels}
                                formatIcons={formatIcons}
                            />

                            {/* Column 3: Email Content */}
                            <EmailEditorColumn
                                emailContent={emailContent}
                                setEmailContent={setEmailContent}
                                sendingEmail={sendingEmail}
                                lastSavedInterviewId={lastSavedInterviewId}
                                onOpenEmailModal={() => {
                                    setEmailModalTab("edit");
                                    setShowEmailModal(true);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ═══════════ TAB: TABLE ════════════════════════════ */}
                {activeTab === "table" && (
                    <InterviewTableTab
                        interviews={interviews}
                        loadingInterviews={loadingInterviews}
                        onRefresh={fetchInterviews}
                        onEditInterview={openEditModal}
                        onDeleteInterview={handleDelete}
                        statusMap={statusMap}
                        statusStyles={statusStyles}
                        formatIcons={formatIcons}
                        formatLabels={formatLabels}
                        formatThaiDate={formatThaiDate}
                        formatTime={formatTime}
                        filterStatus={tableFilterStatus}
                        onFilterStatusChange={setTableFilterStatus}
                    />
                )}
            </div>

            {/* ═══════════ MODALS ═════════════════════════════════════ */}
            <InterviewConfirmModal
                open={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleSaveInterview}
                selectedApp={selectedApp}
                interviewDate={interviewDate}
                interviewTime={interviewTime}
                interviewFormat={interviewFormat}
                interviewLink={interviewLink}
                onsiteAddress={onsiteAddress}
                meetingId={meetingId}
                passcode={passcode}
                formatLabels={formatLabels}
                saving={saving}
            />

            <InterviewEmailModal
                open={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                onSend={handleSendEmail}
                sendingEmail={sendingEmail}
                emailContent={emailContent}
                setEmailContent={setEmailContent}
                emailModalTab={emailModalTab}
                setEmailModalTab={setEmailModalTab}
            />

            <InterviewEmailSuccessModal
                open={showEmailSentSuccessModal}
                onClose={() => setShowEmailSentSuccessModal(false)}
                selectedApp={selectedApp}
                interviewDate={interviewDate}
                interviewTime={interviewTime}
            />
        </div>
    );
}
