import { JSX, useState, useEffect, useRef } from "react";
import {
    Users, Calendar, CheckCircle2, Clock, AlertTriangle,
    Search, Video, MapPin, Phone, Link as LinkIcon,
    Trash2, Edit3, Send, CalendarDays, Save, Loader2,
    X, Filter, Eye, Mail, Sparkles, XCircle, Check
} from "lucide-react";
import {
    getAllInterviews, createInterview, updateInterview,
    deleteInterview, getCandidatesForInterview, sendInterviewEmail
} from "../../services/interviewService";

// ── Helper ──────────────────────────────────────────────────────────
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
    "ขอเลื่อนนัด": "bg-rose-50 text-rose-700 border-rose-200",
    "เสร็จสิ้น": "bg-sky-50 text-sky-700 border-sky-200",
    "ยกเลิก": "bg-slate-50 text-slate-500 border-slate-200",
};

const formatIcons: Record<string, JSX.Element> = {
    online: <Video className="w-4 h-4 text-indigo-500" />,
    onsite: <MapPin className="w-4 h-4 text-rose-500" />,
    phone: <Phone className="w-4 h-4 text-teal-500" />,
};

const formatLabels: Record<string, string> = {
    online: "Video Call",
    onsite: "On-site",
    phone: "Phone Interview",
};

function formatThaiDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
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
// ── Modal Component ─────────────────────────────────────────────
function Modal({ open, onClose, children, title, maxWidth = "max-w-lg", footer }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    maxWidth?: string;
    footer?: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" />
            {/* Modal */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[85vh] flex flex-col my-auto overflow-hidden animate-[slideUp_0.3s_ease] z-10`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header (fixed) */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                    <h3 className="text-base font-black text-slate-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* Body — scrollable */}
                <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
                    {children}
                </div>
                {/* Footer (fixed) */}
                {footer && (
                    <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex-shrink-0">
                        {footer}
                    </div>
                )}
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

// ══════════════════════════════════════════════════════════════════
export default function InterviewsPage() {
    // ── Tab state ──
    const [activeTab, setActiveTab] = useState<"create" | "table">("create");

    // ── Data from API ──
    const [interviews, setInterviews] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loadingInterviews, setLoadingInterviews] = useState(false);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    // ── Create tab state ──
    const [searchCandidate, setSearchCandidate] = useState("");
    const [filterPosition, setFilterPosition] = useState("ทั้งหมด");
    const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
    const [interviewDate, setInterviewDate] = useState("");
    const [interviewTime, setInterviewTime] = useState("10:00");
    const [interviewFormat, setInterviewFormat] = useState("online");
    const [interviewLink, setInterviewLink] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [lastSavedInterviewId, setLastSavedInterviewId] = useState<number | null>(null);
    const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
    const [sendingEmail, setSendingEmail] = useState(false);

    // ── Email content (auto-filled after save) ──
    const [emailContent, setEmailContent] = useState("");

    // ── Table tab state ──
    const [filterStatus, setFilterStatus] = useState("ทั้งหมด");

    // ── Modal states ──
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailModalTab, setEmailModalTab] = useState<"edit" | "preview">("edit");
    const [showEmailSentSuccessModal, setShowEmailSentSuccessModal] = useState(false);

    // ── Date & Time picker refs and state ──
    const dateInputRef = useRef<HTMLInputElement>(null);
    const [openTimeDropdown, setOpenTimeDropdown] = useState<"hour" | "minute" | null>(null);
    const timeRef = useRef<HTMLDivElement>(null);

    // ── Position filter dropdown ref and state ──
    const [openPositionDropdown, setOpenPositionDropdown] = useState(false);
    const positionDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
                setOpenTimeDropdown(null);
            }
            if (positionDropdownRef.current && !positionDropdownRef.current.contains(e.target as Node)) {
                setOpenPositionDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    // ── Derived: unique positions for filter ──
    const positionList = Array.from(new Set(
        candidates.map(app => app.JobPosition?.title || app.position || "").filter(Boolean)
    ));

    // ── Derived: filtered candidates ──
    const filteredCandidates = candidates.filter(app => {
        const name = `${app.Candidate?.first_name || ""} ${app.Candidate?.last_name || ""}`.toLowerCase();
        const pos = (app.JobPosition?.title || app.position || "").toLowerCase();
        const q = searchCandidate.toLowerCase();
        const matchSearch = name.includes(q) || pos.includes(q);
        const matchPosition = filterPosition === "ทั้งหมด" || (app.JobPosition?.title || app.position || "") === filterPosition;
        return matchSearch && matchPosition;
    });

    const filteredInterviews = filterStatus === "ทั้งหมด"
        ? interviews
        : interviews.filter(iv => {
            const thaiStatus = statusMap[iv.interview_status] || iv.interview_status;
            return thaiStatus === filterStatus;
        });

    const selectedApp = candidates.find(c => c.ID === selectedAppId) || null;

    // Stats
    const totalCount = interviews.length;
    const confirmedCount = interviews.filter(iv => iv.interview_status === "confirmed").length;
    const pendingCount = interviews.filter(iv => iv.interview_status === "pending").length;
    const rescheduleCount = interviews.filter(iv => iv.interview_status === "rescheduled").length;
    const cancelledCount = interviews.filter(iv => iv.interview_status === "cancelled").length;

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
            let res;
            if (editingInterviewId) {
                // อัปเดต interview ที่มีอยู่
                res = await updateInterview(editingInterviewId, {
                    interview_date: interviewDate,
                    interview_time: interviewTime,
                    format: interviewFormat,
                    format_description: interviewLink,
                });
            } else {
                // สร้าง interview ใหม่
                res = await createInterview(
                    selectedAppId,
                    interviewDate,
                    interviewTime,
                    interviewFormat,
                    interviewLink
                );
            }
            if (res?.data) {
                const savedId = res.data.ID || editingInterviewId;
                setLastSavedInterviewId(savedId);
                // Auto-fill email content
                const cand = selectedApp?.Candidate;
                const candName = cand ? `${cand.first_name} ${cand.last_name}` : "ผู้สมัคร";
                const posTitle = selectedApp?.JobPosition?.title || selectedApp?.position || "ตำแหน่งงาน";
                const appCode = selectedApp?.ID ? `APP-${10000 + selectedApp.ID}` : "-";
                const [y, m, d] = (interviewDate || "").split("-");
                const displayDate = y && m && d ? `${d}/${m}/${y}` : interviewDate;
                setEmailContent(
`เรียน คุณ${candName}

ทางบริษัทขอเรียนเชิญท่านเข้าสัมภาษณ์งาน ตำแหน่ง ${posTitle} ตามรายละเอียดดังนี้:

📋 รหัสใบสมัคร: ${appCode}
📅 วันที่: ${displayDate}
🕐 เวลา: ${interviewTime} น.
📹 รูปแบบ: ${formatLabels[interviewFormat] || interviewFormat}
🔗 ลิงก์/สถานที่: ${interviewLink || "-"}

กรุณายืนยันการเข้าร่วมโดยกดปุ่มในอีเมลที่ส่ง

ขอแสดงความนับถือ
ฝ่ายทรัพยากรบุคคล`
                );
                setSaveSuccess(true);
                setEditingInterviewId(null);
                fetchInterviews();
            }
        } catch (err: any) {
            alert(err.response?.data?.error || "เกิดข้อผิดพลาดในการบันทึกนัดสัมภาษณ์");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (iv: any) => {
        // เปลี่ยนไป tab สร้าง และ prefill ข้อมูลจาก interview ที่เลือก
        const dt = new Date(iv.interview_datetime);
        const appId = iv.application_id || iv.ApplicationID || iv.Application?.ID;
        
        // ใช้วันและเวลาท้องถิ่น ป้องกันปัญหา Timezone เลื่อนวัน
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        const day = String(dt.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const hours = String(dt.getHours()).padStart(2, "0");
        const minutes = String(dt.getMinutes()).padStart(2, "0");
        const timeStr = `${hours}:${minutes}`;

        const formatStr = iv.format || "online";
        const linkStr = iv.format_description || "";
        const cand = iv.application?.Candidate || iv.Application?.Candidate;
        const job = iv.application?.JobPosition || iv.Application?.JobPosition;
        const candName = cand ? `${cand.first_name} ${cand.last_name}` : "ผู้สมัคร";
        const posTitle = job?.title || iv.position || "ตำแหน่งงาน";
        const appCode = appId ? `APP-${10000 + appId}` : "-";

        setSelectedAppId(appId);
        setInterviewDate(dateStr);
        setInterviewTime(timeStr);
        setInterviewFormat(formatStr);
        setInterviewLink(linkStr);
        setEditingInterviewId(iv.ID);
        setLastSavedInterviewId(iv.ID);

        setEmailContent(
`เรียน คุณ${candName}

ทางบริษัทขอเรียนเชิญท่านเข้าสัมภาษณ์งาน ตำแหน่ง ${posTitle} ตามรายละเอียดดังนี้:

📋 รหัสใบสมัคร: ${appCode}
📅 วันที่: ${day}/${month}/${year}
🕐 เวลา: ${timeStr} น.
📹 รูปแบบ: ${formatLabels[formatStr] || formatStr}
🔗 ลิงก์/สถานที่: ${linkStr || "-"}

กรุณายืนยันการเข้าร่วมโดยกดปุ่มในอีเมลที่ส่ง

ขอแสดงความนับถือ
ฝ่ายทรัพยากรบุคคล`
        );
        setSaveSuccess(false);
        setActiveTab("create");
    };



    const handleDelete = async (id: number) => {
        if (!confirm("ต้องการลบนัดสัมภาษณ์นี้หรือไม่?")) return;
        try {
            await deleteInterview(id);
            fetchInterviews();
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

            {/* ── Statistics Cards ────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-[#4169E1]" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xl font-black text-slate-800 leading-tight">{totalCount}</p>
                        <p className="text-xs text-slate-400 font-semibold truncate">นัดหมายทั้งหมด</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xl font-black text-slate-800 leading-tight">{confirmedCount}</p>
                        <p className="text-xs text-slate-400 font-semibold truncate">ยืนยันแล้ว</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xl font-black text-slate-800 leading-tight">{pendingCount}</p>
                        <p className="text-xs text-slate-400 font-semibold truncate">รอยืนยัน</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xl font-black text-slate-800 leading-tight">{rescheduleCount}</p>
                        <p className="text-xs text-slate-400 font-semibold truncate">ขอเลื่อนนัด</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xl font-black text-slate-800 leading-tight">{cancelledCount}</p>
                        <p className="text-xs text-slate-400 font-semibold truncate">ยกเลิก</p>
                    </div>
                </div>
            </div>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab("create")}
                        className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === "create"
                            ? "text-[#4169E1] border-b-2 border-[#4169E1] bg-indigo-50/40"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        สร้างการนัดสัมภาษณ์
                    </button>
                    <button
                        onClick={() => setActiveTab("table")}
                        className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === "table"
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

                            {/* ── Column 1: Candidate List ───────── */}
                            <div className="lg:col-span-3 bg-slate-50/80 rounded-2xl border border-slate-100 p-4 space-y-3">
                                <h3 className="text-sm font-black text-slate-700">เลือกผู้สมัคร</h3>

                                {/* Filter ตำแหน่งงาน (Custom Dropdown ไม่ล้นกรอบ) */}
                                <div ref={positionDropdownRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setOpenPositionDropdown(!openPositionDropdown)}
                                        className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all text-left flex items-center justify-between cursor-pointer"
                                    >
                                        <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <span className="truncate">{filterPosition}</span>
                                        <span className="text-[9px] text-slate-400 absolute right-3 pointer-events-none">▼</span>
                                    </button>

                                    {openPositionDropdown && (
                                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-56 overflow-y-auto divide-y divide-slate-50 animate-[fadeIn_0.15s_ease]">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFilterPosition("ทั้งหมด");
                                                    setOpenPositionDropdown(false);
                                                }}
                                                className={`w-full px-3 py-2 text-xs text-left font-medium transition-colors flex items-center justify-between ${
                                                    filterPosition === "ทั้งหมด"
                                                        ? "bg-indigo-50/70 text-[#4169E1] font-bold"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                <span className="truncate">ทั้งหมด</span>
                                                {filterPosition === "ทั้งหมด" && <Check className="w-3.5 h-3.5 text-[#4169E1] flex-shrink-0" />}
                                            </button>
                                            {positionList.map(pos => (
                                                <button
                                                    key={pos}
                                                    type="button"
                                                    onClick={() => {
                                                        setFilterPosition(pos);
                                                        setOpenPositionDropdown(false);
                                                    }}
                                                    title={pos}
                                                    className={`w-full px-3 py-2 text-xs text-left font-medium transition-colors flex items-center justify-between ${
                                                        filterPosition === pos
                                                            ? "bg-indigo-50/70 text-[#4169E1] font-bold"
                                                            : "text-slate-700 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <span className="truncate pr-2">{pos}</span>
                                                    {filterPosition === pos && <Check className="w-3.5 h-3.5 text-[#4169E1] flex-shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาผู้สมัคร..."
                                        value={searchCandidate}
                                        onChange={e => setSearchCandidate(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                    />
                                </div>

                                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                                    {loadingCandidates ? (
                                        <p className="text-xs text-slate-400 text-center py-6">กำลังโหลดข้อมูล...</p>
                                    ) : filteredCandidates.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-6">ไม่พบผู้สมัคร</p>
                                    ) : (
                                        filteredCandidates.map(app => (
                                            <label
                                                key={app.ID}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                                    selectedAppId === app.ID
                                                        ? "bg-[#4169E1]/10 border border-[#4169E1]/30 shadow-sm"
                                                        : "hover:bg-white border border-transparent"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="candidate"
                                                    checked={selectedAppId === app.ID}
                                                    onChange={() => setSelectedAppId(app.ID)}
                                                    className="accent-[#4169E1] w-4 h-4"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <p className="text-sm font-bold text-slate-800 truncate">
                                                            {app.Candidate?.first_name} {app.Candidate?.last_name}
                                                        </p>
                                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-[#4169E1] border border-indigo-100/80 flex-shrink-0">
                                                            APP-{10000 + app.ID}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 font-medium truncate">
                                                        {app.JobPosition?.title || app.position || "-"}
                                                    </p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* ── Column 2: Schedule Form ────────── */}
                            <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-5">
                                <h3 className="text-sm font-black text-slate-700">กำหนดวันและเวลาการนัดสัมภาษณ์</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">วันสัมภาษณ์ (วัน/เดือน/ปี)</label>
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
                                            <span className={`text-sm select-none ${interviewDate ? "text-slate-800 font-bold" : "text-slate-400 font-medium"}`}>
                                                {interviewDate ? (() => {
                                                    const [y, m, d] = interviewDate.split("-");
                                                    return `${d}/${m}/${y}`;
                                                })() : "วว/ดด/ปปปป"}
                                            </span>
                                            <CalendarDays className="w-4 h-4 text-[#4169E1] ml-auto flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity" />
                                            <input
                                                ref={dateInputRef}
                                                type="date"
                                                value={interviewDate}
                                                onChange={e => setInterviewDate(e.target.value)}
                                                className="sr-only"
                                                tabIndex={-1}
                                            />
                                        </div>
                                    </div>

                                    {/* ── เวลานัดหมาย (พิมพ์เองได้ + มีปุ่ม dropdown) ── */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">เวลานัดหมาย</label>
                                        <div ref={timeRef} className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-[#4169E1]/20 transition-all">
                                            <Clock className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                                            <div className="flex items-center gap-2 flex-1">
                                                {/* ชั่วโมง (พิมพ์เองได้ + มีปุ่ม dropdown) */}
                                                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg focus-within:bg-white focus-within:border-[#4169E1] transition-colors">
                                                    <input
                                                        type="text"
                                                        maxLength={2}
                                                        value={interviewTime.split(":")[0] ?? "10"}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/\D/g, "");
                                                            const m = interviewTime.split(":")[1] || "00";
                                                            setInterviewTime(`${val}:${m}`);
                                                        }}
                                                        onBlur={e => {
                                                            let val = e.target.value.replace(/\D/g, "");
                                                            let num = parseInt(val, 10);
                                                            if (isNaN(num)) num = 10;
                                                            if (num < 0) num = 0;
                                                            if (num > 23) num = 23;
                                                            const h = String(num).padStart(2, "0");
                                                            const m = interviewTime.split(":")[1] || "00";
                                                            setInterviewTime(`${h}:${m}`);
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
                                                            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(h => (
                                                                <button
                                                                    key={h}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const m = interviewTime.split(":")[1] || "00";
                                                                        setInterviewTime(`${h}:${m}`);
                                                                        setOpenTimeDropdown(null);
                                                                    }}
                                                                    className={`w-full px-3 py-1.5 text-xs text-center font-bold transition-colors ${
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

                                                {/* นาที (พิมพ์เองได้ + มีปุ่ม dropdown) */}
                                                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg focus-within:bg-white focus-within:border-[#4169E1] transition-colors">
                                                    <input
                                                        type="text"
                                                        maxLength={2}
                                                        value={interviewTime.split(":")[1] ?? "00"}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/\D/g, "");
                                                            const h = interviewTime.split(":")[0] || "10";
                                                            setInterviewTime(`${h}:${val}`);
                                                        }}
                                                        onBlur={e => {
                                                            let val = e.target.value.replace(/\D/g, "");
                                                            let num = parseInt(val, 10);
                                                            if (isNaN(num)) num = 0;
                                                            if (num < 0) num = 0;
                                                            if (num > 59) num = 59;
                                                            const m = String(num).padStart(2, "0");
                                                            const h = interviewTime.split(":")[0] || "10";
                                                            setInterviewTime(`${h}:${m}`);
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
                                                            {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(m => (
                                                                <button
                                                                    key={m}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const h = interviewTime.split(":")[0] || "10";
                                                                        setInterviewTime(`${h}:${m}`);
                                                                        setOpenTimeDropdown(null);
                                                                    }}
                                                                    className={`w-full px-3 py-1.5 text-xs text-center font-bold transition-colors ${
                                                                        (interviewTime.split(":")[1] || "00") === m
                                                                            ? "bg-[#4169E1] text-white"
                                                                            : "text-slate-700 hover:bg-indigo-50 hover:text-[#4169E1]"
                                                                    }`}
                                                                >
                                                                    {m}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <span className="text-xs text-slate-500 font-bold ml-1">น.</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">รูปแบบสัมภาษณ์</label>
                                        <select
                                            value={interviewFormat}
                                            onChange={e => setInterviewFormat(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                        >
                                            <option value="online">Video Call (Google Meet)</option>
                                            <option value="onsite">On-site (สถานที่จริง)</option>
                                            <option value="phone">Phone Interview (โทรศัพท์)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">
                                            ลิงก์เข้าสัมภาษณ์ / สถานที่ / เบอร์โทร
                                        </label>
                                        <div className="relative">
                                            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder={interviewFormat === "online" ? "https://meet.google.com/..." : interviewFormat === "phone" ? "02-xxx-xxxx" : "ห้องประชุม A ชั้น 3"}
                                                value={interviewLink}
                                                onChange={e => setInterviewLink(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Card */}
                                {selectedApp && interviewDate && (
                                    <div className="mt-4 bg-white border border-indigo-100 rounded-xl p-4 space-y-2">
                                        <p className="text-xs font-bold text-[#4169E1] uppercase tracking-wider">ตัวอย่าง</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            {selectedApp.Candidate?.first_name} {selectedApp.Candidate?.last_name}
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {interviewDate}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {interviewTime} น.</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                            {formatIcons[interviewFormat]}
                                            <span>{formatLabels[interviewFormat]}</span>
                                        </div>
                                        {interviewLink && <p className="text-xs text-indigo-600 font-medium break-all">{interviewLink}</p>}
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
                                    onClick={() => setShowConfirmModal(true)}
                                    className="group w-full mt-2 relative overflow-hidden bg-gradient-to-r from-[#4169E1] via-[#5B7FFF] to-[#7C3AED] text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2"
                                >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : <Sparkles className="w-5 h-5 relative z-10" />}
                                    <span className="relative z-10">{saving ? "กำลังบันทึก..." : editingInterviewId ? "อัปเดตข้อมูลการนัดสัมภาษณ์" : "บันทึกข้อมูลการนัดสัมภาษณ์"}</span>
                                </button>
                            </div>

                            {/* ── Column 3: Email Content ────────── */}
                            <div className="lg:col-span-4 bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-4 flex flex-col">
                                <h3 className="text-sm font-black text-slate-700">เนื้อหาจดหมายเชิญผู้สมัคร</h3>

                                {!emailContent && (
                                    <div className="flex-1 flex items-center justify-center text-center p-6">
                                        <div className="space-y-2">
                                            <Send className="w-10 h-10 text-slate-200 mx-auto" />
                                            <p className="text-sm text-slate-400 font-medium">กรุณาบันทึกข้อมูลการนัดสัมภาษณ์ก่อน</p>
                                            <p className="text-xs text-slate-300">ระบบจะสร้างเนื้อหาจดหมายเชิญให้อัตโนมัติ</p>
                                        </div>
                                    </div>
                                )}

                                {emailContent && (
                                    <>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">คำเชิญ</label>
                                            <textarea
                                                rows={14}
                                                value={emailContent}
                                                onChange={e => setEmailContent(e.target.value)}
                                                className="w-full h-full min-h-[280px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 resize-none transition-all leading-relaxed"
                                            />
                                        </div>

                                        {/* ── ปุ่มส่งคำเชิญ (เปิด popup ดูเนื้อหาก่อน) ── */}
                                        <button
                                            className="group w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-300/50 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={sendingEmail || !lastSavedInterviewId}
                                            onClick={() => {
                                                setEmailModalTab("edit");
                                                setShowEmailModal(true);
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                                            {sendingEmail ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : <Mail className="w-5 h-5 relative z-10" />}
                                            <span className="relative z-10">{sendingEmail ? "กำลังส่ง..." : "ดูตัวอย่างและส่งคำเชิญ"}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════ TAB: TABLE ════════════════════════════ */}
                {activeTab === "table" && (
                    <div className="p-6 space-y-6">

                        {/* Header + Filter */}
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <h3 className="text-lg font-black text-slate-800">ตารางเวลาสัมภาษณ์</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 font-semibold">กรองด้วยสถานะสัมภาษณ์</span>
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all cursor-pointer"
                                >
                                    <option>ทั้งหมด</option>
                                    <option>ยืนยันแล้ว</option>
                                    <option>รอยืนยัน</option>
                                    <option>ขอเลื่อนนัด</option>
                                    <option>ยกเลิก</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้สมัคร / ตำแหน่ง</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">วันสัมภาษณ์</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">เวลานัดหมาย</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">รูปแบบสัมภาษณ์</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">ลิงก์ / สถานที่</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loadingInterviews ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm font-medium">กำลังโหลดข้อมูล...</td></tr>
                                    ) : filteredInterviews.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm font-medium">ไม่พบข้อมูลนัดสัมภาษณ์</td></tr>
                                    ) : (
                                        filteredInterviews.map(iv => {
                                            const cand = iv.application?.Candidate || iv.Application?.Candidate;
                                            const job = iv.application?.JobPosition || iv.Application?.JobPosition;
                                            const thaiStatus = statusMap[iv.interview_status] || iv.interview_status;
                                            return (
                                                <tr key={iv.ID} className="hover:bg-indigo-50/30 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <p className="text-sm font-bold text-slate-800">
                                                            {cand?.first_name} {cand?.last_name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 font-medium">
                                                            {job?.title || "-"}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                                                            <Calendar className="w-4 h-4 text-slate-400" />
                                                            {formatThaiDate(iv.interview_datetime)}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-slate-700 font-medium">
                                                        {formatTime(iv.interview_datetime)}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                                            {formatIcons[iv.format] || <Video className="w-4 h-4 text-slate-400" />}
                                                            <span>{formatLabels[iv.format] || iv.format}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {iv.format === "online" ? (
                                                            <a href={iv.format_description} target="_blank" rel="noopener noreferrer" className="text-[#4169E1] text-sm font-medium hover:underline break-all">
                                                                {iv.format_description || "-"}
                                                            </a>
                                                        ) : (
                                                            <span className="text-sm text-slate-700 font-medium">{iv.format_description || "-"}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold border ${statusStyles[thaiStatus] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                                            {thaiStatus === "ยืนยันแล้ว" && <CheckCircle2 className="w-3 h-3" />}
                                                            {thaiStatus === "รอยืนยัน" && <Clock className="w-3 h-3" />}
                                                            {thaiStatus === "ขอเลื่อนนัด" && <AlertTriangle className="w-3 h-3" />}
                                                            {thaiStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => openEditModal(iv)}
                                                                className="p-2 rounded-lg bg-indigo-50 text-[#4169E1] hover:bg-indigo-100 transition-all"
                                                                title="แก้ไข"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(iv.ID)}
                                                                className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════ MODAL: ยืนยันก่อนบันทึก ═══════════════════ */}
            <Modal
                open={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="ยืนยันการบันทึกนัดสัมภาษณ์"
                footer={
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowConfirmModal(false)}
                            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSaveInterview}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#7C3AED] text-white font-bold text-sm shadow-lg shadow-indigo-200/50 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            ยืนยันบันทึก
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
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#4169E1] flex items-center justify-center text-white font-black text-sm">
                                    {(selectedApp.Candidate?.first_name || "?")[0]}
                                </div>
                                <div>
                                    <p className="text-base font-black text-slate-800">
                                        {selectedApp.Candidate?.first_name} {selectedApp.Candidate?.last_name}
                                    </p>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {selectedApp.JobPosition?.title || selectedApp.position || "-"}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/80 rounded-lg p-3">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase">📅 วันที่</p>
                                    <p className="text-sm font-bold text-slate-800">{interviewDate}</p>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase">🕐 เวลา</p>
                                    <p className="text-sm font-bold text-slate-800">{interviewTime} น.</p>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase">📹 รูปแบบ</p>
                                    <p className="text-sm font-bold text-slate-800">{formatLabels[interviewFormat]}</p>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase">🔗 สถานที่/ลิงก์</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{interviewLink || "-"}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* ═══════════ MODAL: ดูเนื้อหาจดหมายก่อนส่ง ════════════ */}
            <Modal
                open={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                title="ตัวอย่างจดหมายเชิญสัมภาษณ์"
                maxWidth="max-w-2xl"
                footer={
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowEmailModal(false)}
                            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSendEmail}
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
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
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
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
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
                                onChange={e => setEmailContent(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 resize-none transition-all leading-relaxed"
                                placeholder="พิมพ์ข้อความเชิญสัมภาษณ์ที่นี่..."
                            />
                        </div>
                    ) : (
                        /* Email Preview */
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gradient-to-r from-[#4169E1] to-[#3152c4] text-white px-5 py-4 text-center">
                                <p className="font-black text-lg">HireAI Recruitment</p>
                                <p className="text-xs opacity-90">แจ้งนัดหมายเข้ารับการสัมภาษณ์งาน</p>
                            </div>
                            <div className="px-5 py-4">
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{emailContent}</pre>
                                </div>
                            </div>
                            {/* ปุ่มตัวอย่างในอีเมล */}
                            <div className="px-5 pb-3 flex flex-wrap items-center justify-center gap-2">
                                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-sm">✅ ยืนยันเข้าร่วม</span>
                                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold shadow-sm">📅 ขอเลื่อนนัด</span>
                                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold shadow-sm">❌ ปฏิเสธ</span>
                            </div>
                            <p className="text-center text-[11px] text-slate-400 pb-3">
                                ⬆️ ปุ่มเหล่านี้จะปรากฏในอีเมลจริง ผู้สมัครกดแล้วสถานะจะอัปเดตอัตโนมัติ
                            </p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* ═══════════ MODAL: ส่งอีเมลสำเร็จ (Clean & Airy Design) ════════════ */}
            {showEmailSentSuccessModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
                    onClick={() => setShowEmailSentSuccessModal(false)}
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" />
                    <div 
                        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[slideUp_0.3s_ease] z-10 border border-slate-100 p-6 sm:p-7"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowEmailSentSuccessModal(false)}
                            className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Clean Header with Soft Icon */}
                        <div className="text-center pt-2 pb-4">
                            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-emerald-600 shadow-sm">
                                <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">ส่งอีเมลเชิญสัมภาษณ์สำเร็จ!</h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                ระบบได้ส่งจดหมายพร้อมปุ่มตอบกลับไปยังผู้สมัครเรียบร้อยแล้ว
                            </p>
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
                                        APP-{10000 + (selectedApp?.ID || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-0.5">
                                    <span className="text-slate-400 font-semibold">ตำแหน่ง</span>
                                    <span className="text-slate-700 font-medium truncate max-w-[200px]" title={selectedApp?.JobPosition?.title || selectedApp?.position || "-"}>
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
                                        {interviewDate ? (() => {
                                            const [y, m, d] = interviewDate.split("-");
                                            return `${d}/${m}/${y}`;
                                        })() : "-"} ({interviewTime} น.)
                                    </span>
                                </div>
                            </div>

                            {/* Clean subtle note */}
                            <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-xl p-3 flex items-start gap-2.5">
                                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                                    ในอีเมลจะมีปุ่ม <b>ยืนยันเข้าร่วม</b>, <b>ขอเลื่อนนัด</b> และ <b>ปฏิเสธ</b> เมื่อผู้สมัครกดตอบกลับและยืนยัน สถานะในตารางจะอัปเดตอัตโนมัติ
                                </p>
                            </div>

                            {/* Clean Solid Button */}
                            <button
                                type="button"
                                onClick={() => setShowEmailSentSuccessModal(false)}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow active:scale-[0.99] transition-all cursor-pointer"
                            >
                                ตกลง / รับทราบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
