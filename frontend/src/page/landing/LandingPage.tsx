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
import { getalljobs, applyjob } from "../../services/jobPositionService";
import apiClient from "../../services/apiClient";
import { Briefcase, MapPin, DollarSign, Clock, Search, X, Building2, ShieldCheck, Mail, AlertCircle, Upload } from "lucide-react";
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
    criteria: string;
    status: string;
    CreatedAt: string;
}

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
    const [showApplySuccess, setShowApplySuccess] = useState(false);
    const [showApplyForm, setShowApplyForm] = useState(false);
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
    const [submittingApply, setSubmittingApply] = useState(false);
    const [applyError, setApplyError] = useState("");

    // ฟังก์ชันอัปโหลดไฟล์ Resume ไปที่ Go Backend
    const handleResumeUpload = async (file: File) => {
        if (!file) return;
        setApplyFileName(file.name + " (กำลังอัปโหลด...)");
        setApplyError("");
        setApplyResumeText("");
        setApplyResumeUrl("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            
            // อัปโหลดไฟล์ไปที่ Go Backend
            const res = await apiClient.post("/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            
            if (res.data && res.data.url) {
                setApplyResumeUrl(res.data.url);
                setApplyFileName(file.name + " (อัปโหลดสำเร็จ)");
                
                // สำหรับไฟล์ข้อความดึงมาใส่ Text ด้วยเพื่อรักษา Compatibility
                if (file.name.toLowerCase().endsWith(".txt")) {
                    const reader = new FileReader();
                    reader.onload = e => {
                        setApplyResumeText(e.target?.result as string || "");
                    };
                    reader.readAsText(file, "utf-8");
                } else {
                    // หากเป็น PDF/รูปภาพ เก็บเป็นลิงก์และใส่ข้อมูลจำลองไว้เพื่อไม่ให้เช็คข้อความว่างผ่านยาก
                    setApplyResumeText(`ข้อมูลประวัติย่อแบบเอกสาร/รูปภาพ ถูกบันทึกไว้ในระบบ: ${res.data.url}`);
                }
            } else {
                throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");
            }
        } catch (err: any) {
            setApplyError(err.response?.data?.error || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
            setApplyFileName("");
            setApplyResumeUrl("");
        }
    };

    // ฟังก์ชันอัปโหลดไฟล์ Transcript ไปที่ Go Backend
    const handleTranscriptUpload = async (file: File) => {
        if (!file) return;
        setApplyTranscriptFileName(file.name + " (กำลังอัปโหลด...)");
        setApplyError("");
        setApplyTranscriptText("");
        setApplyTranscriptUrl("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            
            // อัปโหลดไฟล์ไปที่ Go Backend
            const res = await apiClient.post("/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            
            if (res.data && res.data.url) {
                setApplyTranscriptUrl(res.data.url);
                setApplyTranscriptFileName(file.name + " (อัปโหลดสำเร็จ)");
                
                if (file.name.toLowerCase().endsWith(".txt")) {
                    const reader = new FileReader();
                    reader.onload = e => {
                        setApplyTranscriptText(e.target?.result as string || "");
                    };
                    reader.readAsText(file, "utf-8");
                } else {
                    setApplyTranscriptText(`ข้อมูลทรานสคริปต์ ถูกบันทึกไว้ในระบบ: ${res.data.url}`);
                }
            } else {
                throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");
            }
        } catch (err: any) {
            setApplyError(err.response?.data?.error || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์ Transcript");
            setApplyTranscriptFileName("");
            setApplyTranscriptUrl("");
        }
    };

    // ฟังก์ชันยิง API ส่งข้อมูลใบสมัครไปบันทึกที่หลังบ้าน
    const handleApplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!applyFirstName.trim() || !applyLastName.trim() || !applyEmail.trim() || !applyPhone.trim() || !applyResumeText.trim() || !applyTranscriptUrl.trim()) {
            setApplyError("กรุณากรอกข้อมูลให้ครบถ้วน อัปโหลดไฟล์ Resume และไฟล์ Transcript");
            return;
        }
        setSubmittingApply(true);
        setApplyError("");
        try {
            if (selectedJob) {
                await applyjob(
                    selectedJob.ID,
                    applyFirstName,
                    applyLastName,
                    applyEmail,
                    applyPhone,
                    applyResumeText,
                    applyResumeUrl,
                    applyTranscriptUrl,
                    applyTranscriptText
                );
                setShowApplySuccess(true);
                setShowApplyForm(false); // ปิดฟอร์มสมัครงาน
                // เคลียร์ค่าในฟอร์มเมื่อส่งสำเร็จ
                setApplyFirstName("");
                setApplyLastName("");
                setApplyEmail("");
                setApplyPhone("");
                setApplyResumeText("");
                setApplyFileName("");
                setApplyTranscriptUrl("");
                setApplyTranscriptFileName("");
                setApplyTranscriptText("");
            }
        } catch (err: any) {
            setApplyError(err.response?.data?.error || "เกิดข้อผิดพลาดในการส่งใบสมัคร");
        } finally {
            setSubmittingApply(false);
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

    return (
        <div className="bg-[#f8fafc] min-h-screen font-sans flex flex-col text-slate-900 scroll-smooth">
            <Navbar />
            <main className="grow">
                <section id="hero" className="animate-fadeIn">
                    <Hero 
                        jobBoardContent={
                            <div className="text-left space-y-6">
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
                                                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all p-6 flex flex-col justify-between"
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
                                                                <span>{job.salary}</span>
                                                            </div>
                                                        )}
                                                        {job.type && (
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                                                <span>{job.type}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="pt-6 mt-6 border-t border-slate-100">
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

                            {/* Section: คุณสมบัติ */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-2">
                                    <ShieldCheck className="w-4.5 h-4.5 text-[#4169E1]" />
                                    คุณสมบัติผู้สมัคร / เกณฑ์คัดเลือก
                                </h4>
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                    {activeDetailJob.criteria || "ไม่มีรายละเอียดคุณสมบัติ"}
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

            {/* 📌 SUCCESS MODAL: ขอบคุณการสมัครงาน */}
            {showApplySuccess && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-center space-y-4 animate-scaleUp">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-500">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">ส่งใบสมัครสำเร็จ!</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            ระบบได้รับใบสมัครงานของคุณแล้ว เพื่อความรวดเร็วในการพิจารณา กรุณาส่ง Resume และเอกสารเพิ่มเติมตามรายละเอียดการติดต่อที่ระบุในประกาศรับสมัครงาน
                        </p>
                        <button
                            onClick={() => {
                                setShowApplySuccess(false);
                                setSelectedJob(null);
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
                                        onChange={e => setApplyFirstName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">นามสกุล *</label>
                                    <input
                                        type="text"
                                        required
                                        value={applyLastName}
                                        onChange={e => setApplyLastName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">อีเมลติดต่อ *</label>
                                <input
                                    type="email"
                                    required
                                    value={applyEmail}
                                    onChange={e => setApplyEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">เบอร์โทรศัพท์ *</label>
                                <input
                                    type="tel"
                                    required
                                    value={applyPhone}
                                    onChange={e => setApplyPhone(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all"
                                />
                            </div>
                            {/* Upload Resume Box */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase">อัปโหลด Resume (.pdf, .txt, รูปภาพ) *</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[#4169E1] transition-all bg-slate-50/50">
                                    <input
                                        type="file"
                                        accept=".txt,.pdf,image/*"
                                        required
                                        id="resume-uploader"
                                        className="hidden"
                                        onChange={e => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
                                    />
                                    <label htmlFor="resume-uploader" className="cursor-pointer block space-y-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-[#4169E1]">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        {applyFileName ? (
                                            <div>
                                                <p className="text-xs font-bold text-[#4169E1]">{applyFileName}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">คลิกเพื่อเปลี่ยนไฟล์</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs font-bold text-slate-600">คลิกที่นี่เพื่อเลือกไฟล์ Resume</p>
                                                <p className="text-[10px] text-slate-400 mt-1">รองรับไฟล์ PDF, TXT หรือรูปภาพ</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                            
                            {/* Upload Transcript Box */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 uppercase">อัปโหลด Transcript / ใบแสดงผลการศึกษา *</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[#4169E1] transition-all bg-slate-50/50">
                                    <input
                                        type="file"
                                        accept=".txt,.pdf,image/*"
                                        required
                                        id="transcript-uploader"
                                        className="hidden"
                                        onChange={e => e.target.files?.[0] && handleTranscriptUpload(e.target.files[0])}
                                    />
                                    <label htmlFor="transcript-uploader" className="cursor-pointer block space-y-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-[#4169E1]">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        {applyTranscriptFileName ? (
                                            <div>
                                                <p className="text-xs font-bold text-[#4169E1]">{applyTranscriptFileName}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">คลิกเพื่อเปลี่ยนไฟล์</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs font-bold text-slate-600">คลิกที่นี่เพื่อเลือกไฟล์ Transcript</p>
                                                <p className="text-[10px] text-slate-400 mt-1">รองรับไฟล์ PDF, TXT หรือรูปภาพ</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/30">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowApplyForm(false);
                                    setApplyError("");
                                }}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 text-xs"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={submittingApply}
                                className="bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                            >
                                {submittingApply ? "กำลังส่งใบสมัคร..." : "ส่งใบสมัครเลย"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default LandingPage;
