import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Navbar,
    Hero,
    ProblemSection,
    Features,
    HowItWorks,
    TechStack,
    CTASection,
    Footer,
} from "./landing-components";
import { getalljobs, applyjob, checkApplicationStatus, updateCandidateApplicationInfo, deleteapplication } from "../../services/jobPositionService";
import apiClient from "../../services/apiClient";
import rules from "../../components/rules/rule";
import { openFileInNewTab } from "../../utils/fileViewer";
import { 
    Briefcase, MapPin, DollarSign, Clock, Search, X, Building2, ShieldCheck, 
    Mail, AlertCircle, Upload, CalendarDays, Maximize2, CheckCircle2, Trash2, 
    Edit3, Save, FileText, Check, ArrowLeft, ArrowRight, ExternalLink, RefreshCw 
} from "lucide-react";
import { LoginModal } from "../auth/LoginPage";

interface JobPosition {
    ID: number;
    title: string;
    department: string;
    location: string;
    salary: string;
    type: string;
    benefits: string;
    contact_info: string;
    description: string;
    criteria: any;
    status: string;
    image_url?: string | null;
    image_urls?: string[];
    application_end_date?: string | null;
    CreatedAt: string;
}

const getDateOnly = (value?: string | null) =>
    value ? value.slice(0, 10) : "";

const getDaysUntil = (value?: string | null) => {
    const dateOnly = getDateOnly(value);
    if (!dateOnly) return null;

    const [year, month, day] = dateOnly.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    return Math.round(
        (targetDate.getTime() - todayDate.getTime()) /
            (1000 * 60 * 60 * 24)
    );
};

const formatThaiDate = (value?: string | null) => {
    const dateOnly = getDateOnly(value);
    if (!dateOnly) return "";

    const [year, month, day] = dateOnly.split("-").map(Number);
    return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(year, month - 1, day));
};

function LandingPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPath = location.pathname === "/login";
    const [isLoginOpen, setIsLoginOpen] = useState(isLoginPath);

    // Jobs state
    const [jobs, setJobs] = useState<JobPosition[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDept, setSelectedDept] = useState("all");
    const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
    const [activeDetailJob, setActiveDetailJob] = useState<JobPosition | null>(null);
    const [viewingJobImageUrl, setViewingJobImageUrl] = useState<string | null>(null);
    const [showApplySuccess, setShowApplySuccess] = useState(false);
    const [showApplyForm, setShowApplyForm] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"jobs" | "status">("jobs");
    const [createdApplicationCode, setCreatedApplicationCode] = useState("");
    const [appCodeQuery, setAppCodeQuery] = useState("");
    const [queryResult, setQueryResult] = useState<any | null>(null);
    const [queryLoading, setQueryLoading] = useState(false);
    const [queryError, setQueryError] = useState("");
    const [applyFirstName, setApplyFirstName] = useState("");
    const [applyLastName, setApplyLastName] = useState("");
    const [applyEmail, setApplyEmail] = useState("");
    const [applyPhone, setApplyPhone] = useState("");
    const [applyResumeText, setApplyResumeText] = useState("");
    const [applyResumeUrl, setApplyResumeUrl] = useState("");
    const [applyFileName, setApplyFileName] = useState("");
    const [applyTranscriptUrl, setApplyTranscriptUrl] = useState("");
    const [applyTranscriptFileName, setApplyTranscriptFileName] = useState("");
    const [applyTranscriptText, setApplyTranscriptText] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
    const [submittingApply, setSubmittingApply] = useState(false);
    const [applyError, setApplyError] = useState("");
    const [applyFormErrors, setApplyFormErrors] = useState<{
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        resume?: string;
        transcript?: string;
    }>({});

    // สถานะการแก้ไขและลบข้อมูลใบสมัครในหน้า Status
    const [isEditingStatusInfo, setIsEditingStatusInfo] = useState(false);
    const [statusEditFirstName, setStatusEditFirstName] = useState("");
    const [statusEditLastName, setStatusEditLastName] = useState("");
    const [statusEditPhone, setStatusEditPhone] = useState("");
    const [statusEditEmail, setStatusEditEmail] = useState("");
    const [statusEditErrors, setStatusEditErrors] = useState<{
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
    }>({});
    const [statusSaving, setStatusSaving] = useState(false);
    const [statusActionMsg, setStatusActionMsg] = useState("");
    const [statusActionError, setStatusActionError] = useState("");
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deletingApp, setDeletingApp] = useState(false);

    const getJobImageUrl = (url?: string | null) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
            return url;
        }

        const baseURL = apiClient.defaults.baseURL || "";
        return `${baseURL.replace(/\/api\/?$/, "")}${url}`;
    };

    // ฟังก์ชันเลือกไฟล์ Resume พร้อมตรวจสอบความถูกต้อง
    const handleResumeSelect = (file: File) => {
        if (!file) return;
        const fileVal = rules.file.validate(file, { maxSizeMB: 15 });
        if (!fileVal.isValid) {
            setApplyFormErrors(prev => ({ ...prev, resume: fileVal.error }));
            return;
        }
        setResumeFile(file);
        setApplyFileName(file.name);
        setApplyError("");
        setApplyFormErrors(prev => ({ ...prev, resume: undefined }));
    };

    // ฟังก์ชันเลือกไฟล์ Transcript พร้อมตรวจสอบความถูกต้อง
    const handleTranscriptSelect = (file: File) => {
        if (!file) return;
        const fileVal = rules.file.validate(file, { maxSizeMB: 15 });
        if (!fileVal.isValid) {
            setApplyFormErrors(prev => ({ ...prev, transcript: fileVal.error }));
            return;
        }
        setTranscriptFile(file);
        setApplyTranscriptFileName(file.name);
        setApplyError("");
        setApplyFormErrors(prev => ({ ...prev, transcript: undefined }));
    };

    // ตรวจสอบความถูกต้องของข้อมูลใบสมัครก่อนเปิดโมดอล Review (ตรวจสอบข้อมูลก่อนกดส่ง)
    const handleApplySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: typeof applyFormErrors = {};

        if (!applyFirstName.trim()) {
            errors.firstName = "กรุณากรอกชื่อจริง";
        } else if (!rules.name.validate(applyFirstName)) {
            errors.firstName = rules.name.errorMessage;
        }

        if (!applyLastName.trim()) {
            errors.lastName = "กรุณากรอกนามสกุล";
        } else if (!rules.name.validate(applyLastName)) {
            errors.lastName = rules.name.errorMessage;
        }

        if (!applyEmail.trim()) {
            errors.email = "กรุณากรอกอีเมล";
        } else if (!rules.email.validate(applyEmail)) {
            errors.email = rules.email.errorMessage;
        }

        if (!applyPhone.trim()) {
            errors.phone = "กรุณากรอกหมายเลขโทรศัพท์";
        } else if (!rules.phone.validate(applyPhone)) {
            errors.phone = rules.phone.errorMessage;
        }

        if (!resumeFile && !applyResumeUrl) {
            errors.resume = "กรุณาเลือกไฟล์ Resume ก่อนส่งใบสมัคร";
        }

        if (!transcriptFile && !applyTranscriptUrl) {
            errors.transcript = "กรุณาเลือกไฟล์ Transcript / ใบแสดงผลการศึกษา";
        }

        setApplyFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            setApplyError("กรุณาตรวจสอบข้อมูลและไฟล์ที่ระบุให้ถูกต้องครบถ้วน");
            return;
        }

        setApplyError("");
        // เด้งหน้าต่าง Review ตรวจสอบข้อมูลก่อนกดส่งจริง
        setShowReviewModal(true);
    };

    // ฟังก์ชันยืนยันส่งใบสมัครจริงหลังผ่านการตรวจสอบในหน้า Review Modal
    const handleConfirmedApplySubmit = async () => {
        setSubmittingApply(true);
        setApplyError("");

        try {
            let finalResumeUrl = applyResumeUrl;
            let finalResumeText = applyResumeText;

            // อัปโหลดไฟล์ Resume
            if (resumeFile) {
                const formData = new FormData();
                formData.append("file", resumeFile);
                const res = await apiClient.post("/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                if (res.data && res.data.url) {
                    finalResumeUrl = res.data.url;
                    if (resumeFile.name.toLowerCase().endsWith(".txt")) {
                        finalResumeText = await resumeFile.text();
                    } else {
                        finalResumeText = `ข้อมูลประวัติย่อแบบเอกสาร/รูปภาพ ถูกบันทึกไว้ในระบบ: ${res.data.url}`;
                    }
                } else {
                    throw new Error("ไม่สามารถอัปโหลดไฟล์ Resume ได้");
                }
            }

            let finalTranscriptUrl = applyTranscriptUrl;
            let finalTranscriptText = applyTranscriptText;

            // อัปโหลดไฟล์ Transcript
            if (transcriptFile) {
                const formData = new FormData();
                formData.append("file", transcriptFile);
                const res = await apiClient.post("/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                if (res.data && res.data.url) {
                    finalTranscriptUrl = res.data.url;
                    if (transcriptFile.name.toLowerCase().endsWith(".txt")) {
                        finalTranscriptText = await transcriptFile.text();
                    } else {
                        finalTranscriptText = `ข้อมูลทรานสคริปต์ ถูกบันทึกไว้ในระบบ: ${res.data.url}`;
                    }
                } else {
                    throw new Error("ไม่สามารถอัปโหลดไฟล์ Transcript ได้");
                }
            }

            if (selectedJob) {
                const response = await applyjob(
                    selectedJob.ID,
                    applyFirstName.trim(),
                    applyLastName.trim(),
                    applyEmail.trim(),
                    applyPhone.trim(),
                    finalResumeText,
                    finalResumeUrl,
                    finalTranscriptUrl,
                    finalTranscriptText
                );

                if (response && response.application_code) {
                    setCreatedApplicationCode(response.application_code);
                } else if (response && response.application_id) {
                    setCreatedApplicationCode(`APP-${10000 + response.application_id}`);
                }

                setShowReviewModal(false);
                setShowApplyForm(false);
                setShowApplySuccess(true);
                // เคลียร์ค่าในฟอร์มเมื่อส่งสำเร็จ
                setApplyFirstName("");
                setApplyLastName("");
                setApplyEmail("");
                setApplyPhone("");
                setApplyResumeText("");
                setApplyResumeUrl("");
                setApplyFileName("");
                setApplyTranscriptUrl("");
                setApplyTranscriptFileName("");
                setApplyTranscriptText("");
                setResumeFile(null);
                setTranscriptFile(null);
                setApplyFormErrors({});
            }
        } catch (err: any) {
            setApplyError(err.response?.data?.error || err.message || "เกิดข้อผิดพลาดในการส่งใบสมัคร");
            setShowReviewModal(false);
        } finally {
            setSubmittingApply(false);
        }
    };

    // ฟังก์ชันตรวจสอบสถานะสมัครงานด้วยรหัสใบสมัคร
    const handleStatusQuery = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const code = appCodeQuery.trim();
        if (!code) {
            setQueryError("กรุณากรอกรหัสใบสมัคร เช่น APP-10001");
            return;
        }
        setQueryLoading(true);
        setQueryError("");
        setQueryResult(null);
        setIsEditingStatusInfo(false);
        setStatusActionMsg("");
        setStatusActionError("");
        try {
            const res = await checkApplicationStatus(code);
            if (res && res.data) {
                setQueryResult(res.data);
            } else {
                setQueryError("ไม่พบข้อมูลใบสมัครสำหรับรหัสนี้ กรุณาตรวจสอบรหัสอีกครั้ง");
            }
        } catch (err: any) {
            setQueryError(err.response?.data?.error || "เกิดข้อผิดพลาดในการตรวจสอบสถานะใบสมัคร หรือไม่พบรหัสนี้ในระบบ");
        } finally {
            setQueryLoading(false);
        }
    };

    // เริ่มต้นแก้ไขข้อมูลในหน้า Status
    const handleStartEditStatus = () => {
        if (!queryResult) return;
        setStatusEditFirstName(queryResult.first_name || "");
        setStatusEditLastName(queryResult.last_name || "");
        setStatusEditPhone(queryResult.phone || "");
        setStatusEditEmail(queryResult.email || "");
        setStatusEditErrors({});
        setStatusActionMsg("");
        setStatusActionError("");
        setIsEditingStatusInfo(true);
    };

    // บันทึกและส่งข้อมูลแก้ไขผู้สมัคร (Update Candidate Info)
    const handleSaveStatusInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: typeof statusEditErrors = {};

        if (!statusEditFirstName.trim()) {
            errors.firstName = "กรุณากรอกชื่อจริง";
        } else if (!rules.name.validate(statusEditFirstName)) {
            errors.firstName = rules.name.errorMessage;
        }

        if (!statusEditLastName.trim()) {
            errors.lastName = "กรุณากรอกนามสกุล";
        } else if (!rules.name.validate(statusEditLastName)) {
            errors.lastName = rules.name.errorMessage;
        }

        if (!statusEditEmail.trim()) {
            errors.email = "กรุณากรอกอีเมล";
        } else if (!rules.email.validate(statusEditEmail)) {
            errors.email = rules.email.errorMessage;
        }

        if (!statusEditPhone.trim()) {
            errors.phone = "กรุณากรอกหมายเลขโทรศัพท์";
        } else if (!rules.phone.validate(statusEditPhone)) {
            errors.phone = rules.phone.errorMessage;
        }

        setStatusEditErrors(errors);
        if (Object.keys(errors).length > 0) {
            setStatusActionError("กรุณากรอกข้อมูลให้ถูกต้องตามเงื่อนไข");
            return;
        }

        setStatusSaving(true);
        setStatusActionError("");
        setStatusActionMsg("");

        try {
            const res = await updateCandidateApplicationInfo(queryResult.id, {
                first_name: statusEditFirstName.trim(),
                last_name: statusEditLastName.trim(),
                phone: statusEditPhone.trim(),
                email: statusEditEmail.trim()
            });

            if (res && res.data) {
                setQueryResult((prev: any) => ({
                    ...prev,
                    first_name: res.data.first_name,
                    last_name: res.data.last_name,
                    phone: res.data.phone,
                    email: res.data.email
                }));
            } else {
                setQueryResult((prev: any) => ({
                    ...prev,
                    first_name: statusEditFirstName.trim(),
                    last_name: statusEditLastName.trim(),
                    phone: statusEditPhone.trim(),
                    email: statusEditEmail.trim()
                }));
            }

            setIsEditingStatusInfo(false);
            setStatusActionMsg("อัปเดตและส่งข้อมูลใหม่เข้าสู่ระบบเรียบร้อยแล้ว");
        } catch (err: any) {
            setStatusActionError(err.response?.data?.error || "ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setStatusSaving(false);
        }
    };

    // ลบข้อมูลใบสมัคร (Delete/Withdraw Application)
    const handleDeleteApplication = async () => {
        if (!queryResult || !queryResult.id) return;
        setDeletingApp(true);
        setStatusActionError("");
        try {
            await deleteapplication(queryResult.id);
            setQueryResult(null);
            setShowDeleteConfirmModal(false);
            setStatusActionMsg("ยกเลิกใบสมัครและลบข้อมูลออกจากระบบเรียบร้อยแล้ว");
            setAppCodeQuery("");
        } catch (err: any) {
            setStatusActionError(err.response?.data?.error || "ไม่สามารถลบใบสมัครได้ในขณะนี้");
            setShowDeleteConfirmModal(false);
        } finally {
            setDeletingApp(false);
        }
    };

    useEffect(() => {
        setIsLoginOpen(isLoginPath);
    }, [isLoginPath]);

    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            try {
                const res = await getalljobs();
                if (res && res.data) {
                    // กรองเฉพาะงานที่ "เปิดรับสมัคร" เท่านั้น
                    const openJobs = res.data.filter((j: JobPosition) => j.status === "เปิดรับสมัคร");
                    setJobs(openJobs);
                }
            } catch (err) {
                console.error("Failed to fetch jobs:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const handleLoginOpenChange = (open: boolean) => {
        setIsLoginOpen(open);
        if (!open && isLoginPath) {
            navigate("/");
        }
    };

    // Filter logic
    const departments = Array.from(new Set(jobs.map(j => j.department).filter(Boolean)));
    
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (job.department && job.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesDept = selectedDept === "all" || job.department === selectedDept;
        
        return matchesSearch && matchesDept;
    });

    const detailImageUrls = activeDetailJob?.image_urls?.length
        ? activeDetailJob.image_urls
        : activeDetailJob?.image_url
            ? [activeDetailJob.image_url]
            : [];

    // Helper คำนวณขั้นตอนสถานะปัจจุบัน (1 to 4)
    const getStatusStepInfo = (status?: string) => {
        const s = (status || "").toLowerCase();
        if (s.includes("ผ่านการคัดเลือก") || s.includes("approved")) {
            return {
                step: 4,
                title: "ผ่านการคัดเลือก",
                subTitle: "ยินดีด้วย! คุณผ่านการคัดเลือกในตำแหน่งนี้",
                desc: "ทางฝ่ายทรัพยากรบุคคลจะติดต่อกลับทางอีเมลหรือโทรศัพท์เพื่อแจ้งขั้นตอนการเริ่มงานและเอกสารที่ต้องใช้",
                badgeClass: "bg-emerald-50 text-emerald-600 border border-emerald-200"
            };
        }
        if (s.includes("ปฏิเสธ") || s.includes("rejected")) {
            return {
                step: 4,
                title: "ไม่ผ่านการคัดเลือกในรอบนี้",
                subTitle: "ขอขอบคุณสำหรับความสนใจร่วมงานกับเรา",
                desc: "เนื่องจากมีผู้สมัครที่มีคุณสมบัติตรงกับตำแหน่งงานเป็นจำนวนมาก ทางบริษัทจึงขอเก็บประวัติของคุณไว้ในระบบสำหรับการพิจารณาตำแหน่งอื่นๆ ในอนาคต",
                badgeClass: "bg-rose-50 text-rose-600 border border-rose-200"
            };
        }
        if (s.includes("สัมภาษณ์") || s.includes("interview")) {
            return {
                step: 3,
                title: "นัดสัมภาษณ์งาน",
                subTitle: "คุณผ่านเข้าสู่รอบสัมภาษณ์",
                desc: "ฝ่ายทรัพยากรบุคคลได้จัดส่งกำหนดการหรือคำเชิญสัมภาษณ์แล้ว กรุณาตรวจสอบอีเมลหรือติดต่อ HR เพื่อยืนยันการเข้าร่วม",
                badgeClass: "bg-blue-50 text-[#4169E1] border border-blue-200"
            };
        }
        if (s.includes("คัดกรอง") || s.includes("screening") || s.includes("กำลังพิจารณา")) {
            return {
                step: 2,
                title: "กำลังคัดกรองคุณสมบัติ",
                subTitle: "อยู่ระหว่างการตรวจทานข้อมูลและเอกสาร",
                desc: "ระบบและฝ่ายบุคคลกำลังทำการตรวจสอบคุณสมบัติ ผลการเรียน และประสบการณ์ทำงานของคุณอย่างละเอียด",
                badgeClass: "bg-amber-50 text-amber-600 border border-amber-200"
            };
        }
        return {
            step: 1,
            title: "ยื่นใบสมัครสำเร็จ (รอพิจารณา)",
            subTitle: "ระบบได้รับข้อมูลใบสมัครของคุณเรียบร้อยแล้ว",
            desc: "ใบสมัครของคุณถูกบันทึกเข้าสู่ระบบอย่างสมบูรณ์ และกำลังรอการจัดคิวเข้าสู่กระบวนการคัดกรองคุณสมบัติเบื้องต้น",
            badgeClass: "bg-slate-100 text-slate-700 border border-slate-200"
        };
    };

    // Component แสดงผลส่วนเช็คสถานะ, แก้ไขข้อมูล, และลบข้อมูล
    const renderStatusTrackerContent = (isModal = false) => {
        const stepInfo = queryResult ? getStatusStepInfo(queryResult.status) : null;
        const steps = [
            { num: 1, label: "ยื่นใบสมัคร", desc: "Submitted" },
            { num: 2, label: "คัดกรองคุณสมบัติ", desc: "Screening" },
            { num: 3, label: "นัดสัมภาษณ์", desc: "Interview" },
            { num: 4, label: "ผลการพิจารณา", desc: "Result" },
        ];

        return (
            <div className={`space-y-6 text-left ${isModal ? "p-1" : "bg-white/95 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-xl max-w-2xl mx-auto animate-fadeIn"}`}>
                <div className="space-y-2 text-center md:text-left">
                    <h4 className="font-extrabold text-slate-800 text-lg">ตรวจสอบสถานะการสมัครของคุณ</h4>
                    <p className="text-slate-400 text-xs font-semibold">กรอกรหัสใบสมัครงานที่คุณได้รับ เช่น APP-10001 เพื่อติดตามสถานะ อัปเดตข้อมูล หรือถอนใบสมัคร</p>
                </div>

                {/* Form ค้นหาสถานะ */}
                <form onSubmit={handleStatusQuery} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="ระบุรหัสใบสมัคร เช่น APP-10001"
                            value={appCodeQuery}
                            onChange={e => setAppCodeQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-mono"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={queryLoading}
                        className="bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-100 active:scale-95 shrink-0 flex items-center justify-center gap-2"
                    >
                        {queryLoading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                กำลังตรวจสอบ...
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" />
                                ตรวจสอบสถานะ
                            </>
                        )}
                    </button>
                </form>

                {/* ข้อความแจ้งเตือนผลลัพธ์ Action */}
                {statusActionMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2 animate-fadeIn">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        <span>{statusActionMsg}</span>
                    </div>
                )}

                {statusActionError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2 animate-fadeIn">
                        <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                        <span>{statusActionError}</span>
                    </div>
                )}

                {queryError && (
                    <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-500 font-semibold flex items-center gap-2 animate-fadeIn">
                        <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                        <span>{queryError}</span>
                    </div>
                )}

                {/* รายละเอียดสถานะเมื่อค้นพบ */}
                {queryResult && stepInfo && (
                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-6 animate-scaleUp">
                        {/* Header ข้อมูลงาน & รหัส */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-200 pb-4">
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ตำแหน่งงานที่สมัคร</span>
                                <h4 className="font-extrabold text-slate-800 text-base leading-snug">{queryResult.position_title}</h4>
                                <span className="text-xs text-slate-500 font-medium">{queryResult.department || "General"}</span>
                            </div>
                            <div className="flex flex-col sm:items-end gap-1.5">
                                <span className="text-xs font-mono font-black text-[#4169E1] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 self-start sm:self-auto">
                                    {queryResult.code}
                                </span>
                                <span className={`text-xs font-black px-3 py-1.5 rounded-lg text-center uppercase tracking-wider ${stepInfo.badgeClass}`}>
                                    {stepInfo.title}
                                </span>
                            </div>
                        </div>

                        {/* Visual 4-Step Stepper (แจ้งสถานะ) */}
                        <div className="space-y-3 pt-2">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ลำดับขั้นตอนการพิจารณา (4 ขั้นตอน)</span>
                            <div className="relative">
                                {/* เส้นเชื่อมต่อระหว่าง Step */}
                                <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 -z-0">
                                    <div
                                        className="h-full bg-[#4169E1] transition-all duration-500"
                                        style={{
                                            width: `${((stepInfo.step - 1) / 3) * 100}%`
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-4 gap-2 relative z-10 text-center">
                                    {steps.map(s => {
                                        const isCompleted = stepInfo.step > s.num;
                                        const isCurrent = stepInfo.step === s.num;

                                        return (
                                            <div key={s.num} className="flex flex-col items-center">
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                                                        isCompleted
                                                            ? "bg-[#4169E1] text-white ring-4 ring-blue-50"
                                                            : isCurrent
                                                            ? "bg-[#4169E1] text-white ring-4 ring-blue-100 animate-pulse"
                                                            : "bg-white text-slate-400 border-2 border-slate-200"
                                                    }`}
                                                >
                                                    {isCompleted ? <Check className="w-5 h-5" /> : s.num}
                                                </div>
                                                <span className={`text-xs font-bold mt-2 ${isCurrent || isCompleted ? "text-slate-800" : "text-slate-400"}`}>
                                                    {s.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                                                    {s.desc}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* กล่องอธิบายสถานะปัจจุบันอย่างละเอียด */}
                            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100/80 text-xs text-slate-700 space-y-1">
                                <div className="font-bold text-[#4169E1] flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-[#4169E1]" />
                                    <span>{stepInfo.subTitle}</span>
                                </div>
                                <p className="text-slate-600 leading-relaxed pl-5">{stepInfo.desc}</p>
                            </div>
                        </div>

                        {/* โหมดแสดงข้อมูล / โหมดแก้ไขข้อมูล (ส่งข้อมูล, แก้ไขข้อมูล) */}
                        {!isEditingStatusInfo ? (
                            <div className="space-y-4 pt-2 border-t border-slate-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ข้อมูลส่วนตัวและเอกสารที่ยื่นไว้</span>
                                    <button
                                        type="button"
                                        onClick={handleStartEditStatus}
                                        className="text-xs font-bold text-[#4169E1] hover:text-[#3152c4] flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-all"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        แก้ไขข้อมูลติดต่อ
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs bg-white p-4 rounded-xl border border-slate-200/80">
                                    <div>
                                        <span className="text-slate-400 font-bold block mb-0.5">ชื่อ-นามสกุล</span>
                                        <span className="text-slate-800 font-bold text-sm">{queryResult.first_name} {queryResult.last_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block mb-0.5">เบอร์โทรศัพท์</span>
                                        <span className="text-slate-800 font-mono font-bold text-sm">{queryResult.phone || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block mb-0.5">อีเมล</span>
                                        <span className="text-slate-800 font-mono font-medium text-sm">{queryResult.email || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block mb-0.5">วันที่ยื่นสมัคร</span>
                                        <span className="text-slate-600 font-medium text-sm">
                                            {new Date(queryResult.created_at).toLocaleDateString("th-TH", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })} น.
                                        </span>
                                    </div>
                                </div>

                                {/* เอกสารแนบ (Resume / Transcript) */}
                                {(queryResult.resume_url || queryResult.transcript_url) && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {queryResult.resume_url && (
                                            <button
                                                type="button"
                                                onClick={() => openFileInNewTab(queryResult.resume_url, "Resume.pdf")}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#4169E1] hover:text-[#4169E1] text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-[#4169E1]" />
                                                เปิดดู Resume
                                                <ExternalLink className="w-3 h-3 text-slate-400" />
                                            </button>
                                        )}
                                        {queryResult.transcript_url && (
                                            <button
                                                type="button"
                                                onClick={() => openFileInNewTab(queryResult.transcript_url, "Transcript.pdf")}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#4169E1] hover:text-[#4169E1] text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-[#4169E1]" />
                                                เปิดดู Transcript
                                                <ExternalLink className="w-3 h-3 text-slate-400" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* ปุ่มถอน/ยกเลิกใบสมัคร (ลบข้อมูล) */}
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirmModal(true)}
                                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        ถอนใบสมัคร / ลบข้อมูลการสมัคร
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ฟอร์มแก้ไขข้อมูลผู้สมัคร (ส่งข้อมูล / บันทึก) */
                            <form onSubmit={handleSaveStatusInfo} className="space-y-4 pt-2 border-t border-slate-200 bg-white p-5 rounded-2xl border border-blue-100 shadow-sm animate-fadeIn">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                        <Edit3 className="w-4 h-4 text-[#4169E1]" />
                                        แก้ไขและส่งข้อมูลติดต่อใหม่
                                    </h5>
                                    <span className="text-[10px] text-slate-400">* ตรวจสอบความถูกต้องก่อนกดส่ง</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">ชื่อจริง *</label>
                                        <input
                                            type="text"
                                            value={statusEditFirstName}
                                            onChange={e => setStatusEditFirstName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                        />
                                        {statusEditErrors.firstName && (
                                            <p className="text-red-500 text-[10px] mt-1">{statusEditErrors.firstName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">นามสกุล *</label>
                                        <input
                                            type="text"
                                            value={statusEditLastName}
                                            onChange={e => setStatusEditLastName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                        />
                                        {statusEditErrors.lastName && (
                                            <p className="text-red-500 text-[10px] mt-1">{statusEditErrors.lastName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">อีเมลติดต่อ *</label>
                                        <input
                                            type="email"
                                            value={statusEditEmail}
                                            onChange={e => setStatusEditEmail(rules.email.sanitize(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-mono"
                                        />
                                        {statusEditErrors.email && (
                                            <p className="text-red-500 text-[10px] mt-1">{statusEditErrors.email}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">เบอร์โทรศัพท์ (เริ่มต้นด้วย 0) *</label>
                                        <input
                                            type="tel"
                                            value={statusEditPhone}
                                            onKeyDown={e => rules.phone.onKeyDown(e, statusEditPhone)}
                                            onChange={e => setStatusEditPhone(rules.phone.format(e.target.value))}
                                            maxLength={12}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-mono"
                                        />
                                        {statusEditErrors.phone && (
                                            <p className="text-red-500 text-[10px] mt-1">{statusEditErrors.phone}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingStatusInfo(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={statusSaving}
                                        className="bg-[#4169E1] hover:bg-[#3152c4] text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md shadow-blue-100 flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {statusSaving ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                กำลังบันทึก...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-3.5 h-3.5" />
                                                ส่งข้อมูล / บันทึกข้อมูล
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen font-sans flex flex-col text-slate-900 scroll-smooth">
            <Navbar onCheckStatusClick={() => {
                setActiveTab("status");
                setTimeout(() => {
                    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
                }, 50);
            }} />
            <main className="grow">
                <section id="hero" className="animate-fadeIn">
                    <Hero 
                        jobBoardContent={
                            <div className="text-left space-y-6">
                                {/* Tab selector */}
                                <div className="flex gap-2 border-b border-slate-200 pb-2">
                                    <button
                                        onClick={() => setActiveTab("jobs")}
                                        className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${
                                            activeTab === "jobs"
                                                ? "border-[#4169E1] text-[#4169E1] font-extrabold"
                                                : "border-transparent text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        ตำแหน่งงานที่เปิดรับสมัคร
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("status")}
                                        className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${
                                            activeTab === "status"
                                                ? "border-[#4169E1] text-[#4169E1] font-extrabold"
                                                : "border-transparent text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        เช็คสถานะสมัครงาน
                                    </button>
                                </div>

                                {activeTab === "jobs" ? (
                                    <div className="space-y-6 animate-fadeIn">
                                        {/* Search and Filters */}
                                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-4 mb-4">
                                            <div className="flex-1 relative">
                                                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    placeholder="ค้นหาชื่อตำแหน่งงาน คีย์เวิร์ด หรือแผนก..."
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200/50 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-sans"
                                                />
                                            </div>
                                            <div className="w-full md:w-60">
                                                <select
                                                    value={selectedDept}
                                                    onChange={e => setSelectedDept(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-sans"
                                                >
                                                    <option value="all">ทุกแผนก / ฝ่าย</option>
                                                    {departments.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Jobs Grid */}
                                        {loading ? (
                                            <div className="py-12 text-center text-slate-400 text-sm">กำลังโหลดข้อมูลตำแหน่งงานว่าง...</div>
                                        ) : filteredJobs.length === 0 ? (
                                            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center gap-3">
                                                <Briefcase className="w-10 h-10 text-slate-300 animate-pulse" />
                                                <p className="text-slate-500 font-bold">ไม่พบตำแหน่งงานที่คุณค้นหาในขณะนี้</p>
                                                <p className="text-slate-300 text-xs">กรุณาลองระบุคำค้นหาใหม่อีกครั้ง</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {filteredJobs.map(job => (
                                                    <div
                                                        key={job.ID}
                                                        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all p-6 flex flex-col justify-between animate-fadeIn"
                                                    >
                                                        <div className="space-y-4">
                                                            {/* Category & Status */}
                                                            <div className="flex items-center justify-between">
                                                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-[#4169E1]">
                                                                    {job.department || "General"}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                                                    เปิดรับสมัคร
                                                                </span>
                                                            </div>

                                                            {/* Job Title */}
                                                            <div>
                                                                <h3 className="font-extrabold text-slate-800 text-base leading-snug line-clamp-2 min-h-[44px]">
                                                                    {job.title}
                                                                </h3>
                                                            </div>

                                                            {/* Metadata */}
                                                            <div className="space-y-2 text-xs text-slate-500 font-medium pt-2">
                                                                {job.location && (
                                                                    <div className="flex items-center gap-2">
                                                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                                                        <span className="truncate">{job.location}</span>
                                                                    </div>
                                                                )}
                                                                {job.salary && (
                                                                    <div className="flex items-center gap-2">
                                                                        <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                                                                        <span>เงินเดือน: {job.salary}</span>
                                                                    </div>
                                                                )}
                                                                {job.type && (
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                                                        <span>{job.type}</span>
                                                                    </div>
                                                                )}
                                                                {job.application_end_date && (
                                                                    <div className="flex items-center gap-2">
                                                                        <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                                                                        <span>
                                                                            สิ้นสุดรับสมัคร: {formatThaiDate(job.application_end_date)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {job.application_end_date && (() => {
                                                                    const daysRemaining = getDaysUntil(job.application_end_date);
                                                                    if (daysRemaining === null) return null;

                                                                    return (
                                                                        <div className={`flex items-center gap-2 font-bold ${
                                                                            daysRemaining < 0
                                                                                ? "text-rose-500"
                                                                                : daysRemaining <= 7
                                                                                    ? "text-amber-600"
                                                                                    : "text-emerald-600"
                                                                        }`}>
                                                                            <Clock className="w-4 h-4 shrink-0" />
                                                                            <span>
                                                                                {daysRemaining < 0
                                                                                    ? "หมดเขตรับสมัครแล้ว"
                                                                                    : `เหลือ ${daysRemaining} วัน`}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>

                                                        {/* CTA Button */}
                                                        <div className="pt-6">
                                                            <button
                                                                onClick={() => {
                                                                    setActiveDetailJob(job);
                                                                }}
                                                                className="w-full bg-slate-50 hover:bg-[#4169E1] hover:text-white text-[#4169E1] font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                                                            >
                                                                ดูรายละเอียด & สมัครงาน
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    renderStatusTrackerContent(false)
                                )}
                            </div>
                        }
                    />
                </section>

                <section id="solution">
                    <ProblemSection />
                </section>

                <section id="features">
                    <Features />
                </section>

                



                <section id="how-it-works">
                    <HowItWorks />
                </section>

                <TechStack />

                <section id="cta">
                    <CTASection />
                </section>
            </main>
            <Footer />
            <LoginModal open={isLoginOpen} onOpenChange={handleLoginOpenChange} />

            {/* 📌 MODAL: รายละเอียดตำแหน่งงานว่าง (สไตล์ JobThai) */}
            {activeDetailJob && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#4169E1] to-[#3a5ec7] text-white p-6 relative shrink-0">
                            <button
                                onClick={() => setActiveDetailJob(null)}
                                className="absolute right-4 top-4 text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="space-y-2 pr-10">
                                <span className="inline-block px-3 py-1 rounded bg-white/20 text-xs font-bold tracking-wide">
                                    {activeDetailJob.department || "General"}
                                </span>
                                <h3 className="text-xl md:text-2xl font-black">{activeDetailJob.title}</h3>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/90 font-medium pt-2">
                                    {activeDetailJob.location && (
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-white/75 shrink-0" />
                                            {activeDetailJob.location}
                                        </span>
                                    )}
                                    {activeDetailJob.salary && (
                                        <span className="flex items-center gap-1.5">
                                            <DollarSign className="w-4 h-4 text-white/75 shrink-0" />
                                            เงินเดือน: {activeDetailJob.salary}
                                        </span>
                                    )}
                                    {activeDetailJob.type && (
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-white/75 shrink-0" />
                                            {activeDetailJob.type}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50 font-sans">
                            {detailImageUrls.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {detailImageUrls.map((imageUrl, index) => (
                                        <div
                                            key={`${imageUrl}-${index}`}
                                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewingJobImageUrl(
                                                        getJobImageUrl(imageUrl)
                                                    )
                                                }
                                                className="group relative block w-full cursor-zoom-in"
                                                title="คลิกเพื่อดูรูปเต็ม"
                                            >
                                                <img
                                                    src={getJobImageUrl(imageUrl)}
                                                    alt={`รูปประกาศงาน ${activeDetailJob.title} ${index + 1}`}
                                                    className="h-64 w-full object-contain bg-white transition-transform group-hover:scale-[1.02]"
                                                />
                                                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/70 px-2.5 py-1.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                    <Maximize2 className="w-3.5 h-3.5" />
                                                    ดูรูปเต็ม
                                                </span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Section: ลักษณะงาน */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
                                    <Briefcase className="w-4.5 h-4.5 text-[#4169E1]" />
                                    รายละเอียดงาน / หน้าที่ความรับผิดชอบ
                                </h4>
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                    {activeDetailJob.description || "ไม่มีรายละเอียดลักษณะงาน"}
                                </p>
                            </div>

                            {/* Section: สวัสดิการ */}
                            {activeDetailJob.benefits && (
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
                                        <Building2 className="w-4.5 h-4.5 text-[#4169E1]" />
                                        สวัสดิการพนักงาน
                                    </h4>
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {activeDetailJob.benefits}
                                    </p>
                                </div>
                            )}

                            {/* Section: ข้อมูลการติดต่อ */}
                            {activeDetailJob.contact_info && (
                                <div className="bg-white p-6 rounded-2xl border border-indigo-100/50 shadow-sm space-y-3 bg-blue-50/10">
                                    <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2 border-b border-blue-50/50 pb-2">
                                        <Mail className="w-4.5 h-4.5 text-[#4169E1]" />
                                        ข้อมูลการติดต่อสมัครงาน
                                    </h4>
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {activeDetailJob.contact_info}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <span className="text-[11px] text-slate-400">
                                โพสต์เมื่อ: {new Date(activeDetailJob.CreatedAt).toLocaleDateString("th-TH")}
                            </span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setActiveDetailJob(null)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-sm font-sans"
                                >
                                    ปิดหน้าต่าง
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        // เปิดฟอร์มส่งประวัติย่อแบบด่วนในหน้าต่างโมดอลใหม่แทน
                                        setActiveDetailJob(null);
                                        // ตั้งรหัสตำแหน่งงานที่เลือกไว้
                                        setSelectedJob(activeDetailJob);
                                        // สั่งเปิดโมดอลฟอร์มสมัครงาน
                                        setShowApplyForm(true);
                                    }}
                                    className="bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-blue-100 active:scale-95 font-sans"
                                >
                                    สมัครงานทันที
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewingJobImageUrl && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
                    onClick={() => setViewingJobImageUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setViewingJobImageUrl(null)}
                        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                        title="ปิดรูปเต็ม"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={viewingJobImageUrl}
                        alt="Job Announcement Full Size"
                        className="max-h-[92vh] max-w-[95vw] object-contain"
                        onClick={(event) => event.stopPropagation()}
                    />
                </div>
            )}

            {/* 📌 SUCCESS MODAL: ขอบคุณการสมัครงาน */}
            {showApplySuccess && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-center space-y-4 animate-scaleUp">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-500">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">ส่งใบสมัครสำเร็จ!</h3>
                        
                        {createdApplicationCode && (
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 my-2 text-center space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">รหัสใบสมัครงานของคุณคือ</span>
                                <span className="text-2xl font-black text-[#4169E1] tracking-wide select-all font-mono block">{createdApplicationCode}</span>
                                <span className="text-[10px] text-slate-400 font-medium block">* ระบบได้จำลองส่งรหัสใบสมัครนี้ไปยังอีเมลของคุณเรียบร้อยแล้ว</span>
                            </div>
                        )}

                        <p className="text-slate-500 text-xs leading-relaxed">
                            โปรดเซฟบันทึกรหัสใบสมัครนี้ไว้ใช้สืบค้นและติดตามผลการประกาศรับสมัครงานในรอบถัดไป
                        </p>
                        <button
                            onClick={() => {
                                setShowApplySuccess(false);
                                setSelectedJob(null);
                                setCreatedApplicationCode("");
                            }}
                            className="w-full bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-100 font-sans"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            )}

            {/* 📌 MODAL: ฟอร์มสมัครงานและอัปโหลด Resume */}
            {showApplyForm && selectedJob && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <form
                        onSubmit={handleApplySubmit}
                        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp flex flex-col font-sans"
                    >
                        <div className="bg-[#4169E1] text-white p-5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="font-black text-lg">ส่งใบสมัครงาน</h3>
                                <p className="text-white/80 text-xs mt-0.5">สำหรับตำแหน่ง: {selectedJob.title}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowApplyForm(false);
                                    setApplyError("");
                                }}
                                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                            {applyError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-500 font-semibold flex items-center gap-2">
                                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                                    <span>{applyError}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">ชื่อจริง *</label>
                                    <input
                                        type="text"
                                        required
                                        value={applyFirstName}
                                        onChange={e => {
                                            setApplyFirstName(e.target.value);
                                            if (applyFormErrors.firstName) setApplyFormErrors(prev => ({ ...prev, firstName: undefined }));
                                        }}
                                        className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:bg-white transition-all ${
                                            applyFormErrors.firstName ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:ring-[#4169E1]/20"
                                        }`}
                                    />
                                    {applyFormErrors.firstName && (
                                        <p className="text-red-500 text-[11px] mt-1 font-medium">{applyFormErrors.firstName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">นามสกุล *</label>
                                    <input
                                        type="text"
                                        required
                                        value={applyLastName}
                                        onChange={e => {
                                            setApplyLastName(e.target.value);
                                            if (applyFormErrors.lastName) setApplyFormErrors(prev => ({ ...prev, lastName: undefined }));
                                        }}
                                        className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:bg-white transition-all ${
                                            applyFormErrors.lastName ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:ring-[#4169E1]/20"
                                        }`}
                                    />
                                    {applyFormErrors.lastName && (
                                        <p className="text-red-500 text-[11px] mt-1 font-medium">{applyFormErrors.lastName}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">อีเมลติดต่อ *</label>
                                <input
                                    type="email"
                                    required
                                    value={applyEmail}
                                    onChange={e => {
                                        setApplyEmail(rules.email.sanitize(e.target.value));
                                        if (applyFormErrors.email) setApplyFormErrors(prev => ({ ...prev, email: undefined }));
                                    }}
                                    placeholder="example@company.com"
                                    className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:bg-white transition-all font-sans ${
                                        applyFormErrors.email ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:ring-[#4169E1]/20"
                                    }`}
                                />
                                {applyFormErrors.email && (
                                    <p className="text-red-500 text-[11px] mt-1 font-medium">{applyFormErrors.email}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">เบอร์โทรศัพท์ (เริ่มต้นด้วย 0) *</label>
                                <input
                                    type="tel"
                                    required
                                    value={applyPhone}
                                    onKeyDown={e => rules.phone.onKeyDown(e, applyPhone)}
                                    onChange={e => {
                                        setApplyPhone(rules.phone.format(e.target.value));
                                        if (applyFormErrors.phone) setApplyFormErrors(prev => ({ ...prev, phone: undefined }));
                                    }}
                                    placeholder="08X-XXX-XXXX"
                                    maxLength={12}
                                    className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:bg-white transition-all font-mono ${
                                        applyFormErrors.phone ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:ring-[#4169E1]/20"
                                    }`}
                                />
                                {applyFormErrors.phone && (
                                    <p className="text-red-500 text-[11px] mt-1 font-medium">{applyFormErrors.phone}</p>
                                )}
                            </div>

                            {/* Upload Resume Box */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase">อัปโหลด Resume (.pdf, .txt, รูปภาพ) *</label>
                                <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-slate-50/50 ${
                                    applyFormErrors.resume ? "border-red-300 hover:border-red-400 bg-red-50/20" : "border-slate-200 hover:border-[#4169E1]"
                                }`}>
                                    <input
                                        type="file"
                                        accept=".txt,.pdf,image/*,.doc,.docx"
                                        id="resume-uploader"
                                        className="hidden"
                                        onChange={e => e.target.files?.[0] && handleResumeSelect(e.target.files[0])}
                                    />
                                    <label htmlFor="resume-uploader" className="cursor-pointer block space-y-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-[#4169E1]">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        {applyFileName ? (
                                            <div>
                                                <p className="text-xs font-bold text-[#4169E1]">{applyFileName}</p>
                                                <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ เลือกไฟล์สำเร็จ</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs font-bold text-slate-600">คลิกที่นี่เพื่อเลือกไฟล์ Resume</p>
                                                <p className="text-[10px] text-slate-400 mt-1">รองรับ PDF, Word, TXT หรือรูปภาพ (ไม่เกิน 15 MB)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                {applyFormErrors.resume && (
                                    <p className="text-red-500 text-[11px] mt-1 font-medium">{applyFormErrors.resume}</p>
                                )}
                            </div>
                            
                            {/* Upload Transcript Box */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase">อัปโหลด Transcript / ใบแสดงผลการศึกษา *</label>
                                <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-slate-50/50 ${
                                    applyFormErrors.transcript ? "border-red-300 hover:border-red-400 bg-red-50/20" : "border-slate-200 hover:border-[#4169E1]"
                                }`}>
                                    <input
                                        type="file"
                                        accept=".txt,.pdf,image/*,.doc,.docx"
                                        id="transcript-uploader"
                                        className="hidden"
                                        onChange={e => e.target.files?.[0] && handleTranscriptSelect(e.target.files[0])}
                                    />
                                    <label htmlFor="transcript-uploader" className="cursor-pointer block space-y-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-[#4169E1]">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        {applyTranscriptFileName ? (
                                            <div>
                                                <p className="text-xs font-bold text-[#4169E1]">{applyTranscriptFileName}</p>
                                                <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ เลือกไฟล์สำเร็จ</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs font-bold text-slate-600">คลิกที่นี่เพื่อเลือกไฟล์ Transcript</p>
                                                <p className="text-[10px] text-slate-400 mt-1">รองรับ PDF, Word, TXT หรือรูปภาพ (ไม่เกิน 15 MB)</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                {applyFormErrors.transcript && (
                                    <p className="text-red-500 text-[11px] mt-1 font-medium">{applyFormErrors.transcript}</p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/30">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowApplyForm(false);
                                    setApplyError("");
                                    setApplyFormErrors({});
                                }}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 text-xs"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                className="bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-100 flex items-center gap-1.5 active:scale-95"
                            >
                                <span>ตรวจสอบข้อมูลก่อนส่ง</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 📌 MODAL: ตรวจสอบข้อมูลก่อนกดส่ง (Review Modal ก่อนส่งจริง) */}
            {showReviewModal && selectedJob && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp flex flex-col font-sans border border-slate-100">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#4169E1] to-[#3152c4] text-white p-6 text-center space-y-1">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 text-white">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <h3 className="font-black text-xl">ตรวจสอบข้อมูลก่อนส่งใบสมัคร</h3>
                            <p className="text-white/80 text-xs">กรุณาตรวจสอบความถูกต้องของข้อมูลส่วนตัวและเอกสารแนบก่อนกดยืนยัน</p>
                        </div>

                        {/* รายละเอียดสำหรับตรวจสอบ */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-1">
                                <span className="text-[10px] font-bold text-[#4169E1] uppercase tracking-wider block">ตำแหน่งงานที่สมัคร</span>
                                <h4 className="font-extrabold text-slate-800 text-base">{selectedJob.title}</h4>
                                <span className="text-xs text-slate-500 font-semibold">{selectedJob.department || "General"} • {selectedJob.location || "สำนักงานใหญ่"}</span>
                            </div>

                            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3 text-xs">
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                                    <span className="text-slate-400 font-bold">ชื่อ - นามสกุล:</span>
                                    <span className="text-slate-800 font-bold">{applyFirstName} {applyLastName}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                                    <span className="text-slate-400 font-bold">อีเมลติดต่อ:</span>
                                    <span className="text-slate-800 font-mono font-medium">{applyEmail}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                                    <span className="text-slate-400 font-bold">เบอร์โทรศัพท์:</span>
                                    <span className="text-slate-800 font-mono font-bold">{applyPhone}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                                    <span className="text-slate-400 font-bold">ไฟล์ Resume:</span>
                                    <span className="text-[#4169E1] font-semibold truncate max-w-[200px]" title={applyFileName || "ไฟล์แนบ"}>
                                        {applyFileName || (resumeFile ? resumeFile.name : "มีไฟล์แนบ")}
                                        {resumeFile && <span className="text-slate-400 ml-1 text-[10px]">({(resumeFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-400 font-bold">ไฟล์ Transcript:</span>
                                    <span className="text-[#4169E1] font-semibold truncate max-w-[200px]" title={applyTranscriptFileName || "ไฟล์แนบ"}>
                                        {applyTranscriptFileName || (transcriptFile ? transcriptFile.name : "มีไฟล์แนบ")}
                                        {transcriptFile && <span className="text-slate-400 ml-1 text-[10px]">({(transcriptFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>หากข้อมูลถูกต้องครบถ้วนแล้ว ให้กดปุ่ม <strong>"ยืนยันส่งใบสมัคร"</strong> ด้านล่าง หรือหากต้องการแก้ไขสามารถกด <strong>"กลับไปแก้ไข"</strong> ได้ทันที</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setShowReviewModal(false)}
                                disabled={submittingApply}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 text-xs transition-all flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                กลับไปแก้ไข
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmedApplySubmit}
                                disabled={submittingApply}
                                className="bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-100 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submittingApply ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        กำลังส่งใบสมัคร...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        ยืนยันส่งใบสมัคร
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📌 MODAL: ยืนยันการถอน/ลบข้อมูลใบสมัคร (Delete Confirm Modal) */}
            {showDeleteConfirmModal && queryResult && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-center space-y-4 animate-scaleUp font-sans">
                        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-slate-800">ยืนยันการถอนใบสมัครและลบข้อมูล?</h3>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                คุณแน่ใจหรือไม่ว่าต้องการถอนใบสมัครรหัส <strong className="text-rose-600 font-mono font-bold">{queryResult.code}</strong> สำหรับตำแหน่ง <strong className="text-slate-700">{queryResult.position_title}</strong>? ข้อมูลใบสมัคร ประวัติ และเอกสารแนบทั้งหมดจะถูกลบออกจากระบบอย่างถาวร
                            </p>
                        </div>

                        <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-[11px] text-rose-700 text-left flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>การกระทำนี้ไม่สามารถย้อนกลับได้ หากคุณต้องการสมัครใหม่อีกครั้งจะต้องกรอกข้อมูลและส่งเอกสารใหม่</span>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirmModal(false)}
                                disabled={deletingApp}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteApplication}
                                disabled={deletingApp}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-rose-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {deletingApp ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        กำลังลบข้อมูล...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        ยืนยันการลบ
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📌 MODAL: ตรวจสอบสถานะการสมัครงาน (Popup version) */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleUp flex flex-col font-sans max-h-[90vh]">
                        <div className="bg-[#4169E1] text-white p-5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="font-black text-lg">ตรวจสอบสถานะการสมัครงาน</h3>
                                <p className="text-white/80 text-xs mt-0.5">ค้นหาข้อมูลใบสมัคร ติดตามผล และจัดการข้อมูลของคุณแบบเรียลไทม์</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowStatusModal(false);
                                    setAppCodeQuery("");
                                    setQueryResult(null);
                                    setQueryError("");
                                    setIsEditingStatusInfo(false);
                                    setStatusActionMsg("");
                                    setStatusActionError("");
                                }}
                                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {renderStatusTrackerContent(true)}
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/30">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowStatusModal(false);
                                    setAppCodeQuery("");
                                    setQueryResult(null);
                                    setQueryError("");
                                    setIsEditingStatusInfo(false);
                                    setStatusActionMsg("");
                                    setStatusActionError("");
                                }}
                                className="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 text-xs"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LandingPage;
