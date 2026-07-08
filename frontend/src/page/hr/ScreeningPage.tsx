import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Upload, FileText, Briefcase, Sparkles, X, ChevronDown, ChevronUp, Wifi, WifiOff } from "lucide-react";
import { getalljobs } from "../../services/jobPositionService";

const TYPHOON_API = import.meta.env.VITE_TYPHOON_API_URL || "http://localhost:8000";

const SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญด้าน HR วิเคราะห์ Resume ภาษาไทย กรุณาวิเคราะห์อย่างละเอียดครอบคลุม:

1. **ข้อมูลผู้สมัคร** — ชื่อ, ประสบการณ์, การศึกษา, ทักษะ
2. **คะแนนรวม (0-100)** — พร้อมเหตุผล
3. **จุดเด่น** — ทักษะและประสบการณ์ที่โดดเด่น  
4. **จุดที่ควรพัฒนา** — สิ่งที่ยังขาดหรือควรปรับปรุง
5. **ความเหมาะสมกับตำแหน่ง** — ถ้ามี JD ให้เทียบกับ JD และเปรียบเทียบกับเกณฑ์การคัดเลือก (Criteria)
6. **ข้อแนะนำ** — สำหรับ HR ในการตัดสินใจ

ตอบเป็นภาษาไทย ใช้ headers และ bullet points ให้ชัดเจน`;

interface AnalysisResult {
    resumeName: string;
    content: string;
    streaming: boolean;
}

export default function ScreeningPage() {
    const location = useLocation();
    const [resumeText, setResumeText] = useState("");
    const [jobDesc, setJobDesc] = useState("");
    const [jobCriteria, setJobCriteria] = useState("");
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>("");
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [jdOpen, setJdOpen] = useState(false);
    const [online, setOnline] = useState<boolean | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Check Typhoon status ─────────────────────────────────────────
    const checkOnline = async () => {
        try {
            const r = await fetch(`${TYPHOON_API}/health`, { signal: AbortSignal.timeout(3000) });
            const d = await r.json();
            setOnline(d.chat_model === true);
        } catch {
            setOnline(false);
        }
    };

    // Load jobs & check online status on mount
    useEffect(() => {
        checkOnline();
        const loadJobs = async () => {
            try {
                const data = await getalljobs();
                if (data && data.data) {
                    setJobs(data.data);
                }
            } catch {
                // ignore
            }
        };
        loadJobs();
    }, []);

    // ── Auto-populate from navigation state (when HR clicks screening from PositionsPage) ──
    useEffect(() => {
        if (location.state && jobs.length > 0) {
            const { resumeText: stateResume, jobId: stateJobId } = location.state as { resumeText?: string; jobId?: number };
            if (stateResume) {
                setResumeText(stateResume);
            }
            if (stateJobId) {
                const matchedJob = jobs.find(j => j.ID === stateJobId);
                if (matchedJob) {
                    setSelectedJobId(stateJobId.toString());
                    setJobDesc(matchedJob.description || "");
                    setJobCriteria(matchedJob.criteria || "");
                    setJdOpen(true);
                }
            }
        }
    }, [location.state, jobs]);

    const handleJobChange = (jobId: string) => {
        setSelectedJobId(jobId);
        if (jobId === "custom") {
            setJobDesc("");
            setJobCriteria("");
        } else {
            const job = jobs.find(j => j.ID.toString() === jobId);
            if (job) {
                setJobDesc(job.description);
                setJobCriteria(job.criteria);
                setJdOpen(true); // Auto-open collapsible
            }
        }
    };

    // ── Handle file upload (txt, pdf, images) ────────────────────────
    const handleFile = async (file: File) => {
        if (!file) return;
        const fileExt = file.name.toLowerCase();
        
        // 1. ถ้าเป็นไฟล์ .txt ดึงข้อความได้ทันที
        if (fileExt.endsWith(".txt")) {
            const reader = new FileReader();
            reader.onload = e => setResumeText(e.target?.result as string || "");
            reader.readAsText(file, "utf-8");
        } 
        // 2. ถ้าเป็นไฟล์ PDF หรือรูปภาพ ส่งไปประมวลผลด้วย OCR ของ AI
        else if (fileExt.endsWith(".pdf") || file.type.startsWith("image/")) {
            setOcrLoading(true);
            setResumeText("กำลังสแกนและแปลงข้อความด้วย OCR... กรุณารอสักครู่");
            try {
                const formData = new FormData();
                formData.append("file", file);
                
                const res = await fetch(`${TYPHOON_API}/ocr`, {
                    method: "POST",
                    body: formData
                });
                
                if (!res.ok) throw new Error("ไม่สามารถประมวลผลไฟล์นี้ได้");
                
                const data = await res.json();
                if (data && data.text) {
                    setResumeText(data.text);
                } else {
                    throw new Error("แกะข้อความจากไฟล์ล้มเหลว");
                }
            } catch (err: any) {
                alert(err.message || "เกิดข้อผิดพลาดในการดึงข้อความ");
                setResumeText("");
            } finally {
                setOcrLoading(false);
            }
        } else {
            alert("รองรับเฉพาะไฟล์ .txt, .pdf หรือรูปภาพของ Resume เท่านั้น");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    // ── Analyze resume ───────────────────────────────────────────────
    const analyze = async () => {
        if (!resumeText.trim()) return;
        setLoading(true);

        let userContent = `วิเคราะห์ Resume นี้อย่างละเอียด:\n\n${resumeText}`;
        if (jobDesc.trim()) {
            userContent += `\n\n=== ตำแหน่งงาน / JD ===\n${jobDesc}`;
        }
        if (jobCriteria.trim()) {
            userContent += `\n\n=== เกณฑ์ในการคัดเลือก (Criteria) ===\n${jobCriteria}`;
        }

        setResult({ resumeName: "Resume", content: "", streaming: true });

        try {
            const response = await fetch(`${TYPHOON_API}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: userContent }],
                    system_prompt: SYSTEM_PROMPT,
                    max_new_tokens: 2048,
                }),
            });

            if (!response.ok) throw new Error("AI ไม่ตอบสนอง");

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let full = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                full += decoder.decode(value, { stream: true });
                setResult(prev => prev ? { ...prev, content: full } : null);
            }

            setResult(prev => prev ? { ...prev, streaming: false } : null);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "เชื่อมต่อ Typhoon ไม่ได้";
            setResult({ resumeName: "Resume", content: `❌ ${msg}`, streaming: false });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">คัดกรอง Resume</h1>
                    <p className="text-slate-400 text-sm mt-1">วิเคราะห์ Resume ด้วย Typhoon AI</p>
                </div>
                {/* AI Status */}
                <button
                    onClick={checkOnline}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${online === true
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : online === false
                            ? "bg-red-50 text-red-500 border-red-100"
                            : "bg-slate-50 text-slate-400 border-slate-100"
                        }`}
                >
                    {online === true
                        ? <><Wifi className="w-4 h-4" /> AI พร้อมใช้</>
                        : online === false
                            ? <><WifiOff className="w-4 h-4" /> AI ออฟไลน์</>
                            : <><Sparkles className="w-4 h-4" /> ตรวจสอบ...</>}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Input panel */}
                <div className="space-y-4">
                    {/* Resume input */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#4169E1]" />
                                <h3 className="font-bold text-slate-700 text-sm">ข้อความ Resume</h3>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={ocrLoading}
                                className="flex items-center gap-1.5 text-xs text-[#4169E1] font-semibold hover:underline disabled:opacity-50"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {ocrLoading ? "กำลังวิเคราะห์ OCR..." : "อัปโหลดไฟล์ (.txt, .pdf, รูปภาพ)"}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,.pdf,image/*"
                                className="hidden"
                                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                        </div>

                        {/* Drag & drop area */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            className="p-4"
                        >
                            <textarea
                                value={resumeText}
                                onChange={e => setResumeText(e.target.value)}
                                placeholder={ocrLoading ? "กำลังประมวลผลข้อความด้วย OCR..." : "วางข้อความ Resume ที่นี่ หรือลากไฟล์ .txt, .pdf, รูปภาพ มาวาง..."}
                                disabled={ocrLoading}
                                rows={14}
                                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 resize-none leading-relaxed disabled:opacity-60"
                            />
                        </div>
                    </div>

                    {/* Job Position Dropdown */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                        <label className="block text-slate-700 font-bold text-sm">
                            เลือกตำแหน่งงานที่รับสมัคร
                        </label>
                        <select
                            value={selectedJobId}
                            onChange={e => handleJobChange(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 font-sans"
                        >
                            <option value="custom">-- กำหนดลักษณะงานและเกณฑ์คัดสรรเอง --</option>
                            {jobs.map(job => (
                                <option key={job.ID} value={job.ID.toString()}>{job.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* JD collapsible */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setJdOpen(!jdOpen)}
                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-400" />
                                <span className="font-bold text-slate-700 text-sm">ลักษณะงาน / เกณฑ์คัดเลือก</span>
                                <span className="text-xs text-slate-400">(ไม่บังคับ)</span>
                            </div>
                            {jdOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                        {jdOpen && (
                            <div className="px-5 pb-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                        ลักษณะงานที่ทำ (Job Description):
                                    </label>
                                    <textarea
                                        value={jobDesc}
                                        onChange={e => setJobDesc(e.target.value)}
                                        placeholder="วาง Job Description เพื่อให้ AI เทียบความเหมาะสม..."
                                        rows={5}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 resize-none leading-relaxed font-sans"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                        เกณฑ์ในการคัดเลือก (Criteria):
                                    </label>
                                    <textarea
                                        value={jobCriteria}
                                        onChange={e => setJobCriteria(e.target.value)}
                                        placeholder="วางเกณฑ์คัดสรรผู้สมัครเพื่อใช้ในการประเมินและให้คะแนน..."
                                        rows={5}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 resize-none leading-relaxed font-sans"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Analyze button */}
                    <button
                        onClick={analyze}
                        disabled={loading || ocrLoading || !resumeText.trim() || resumeText.startsWith("กำลังอ่านประมวลผลไฟล์")}
                        className="w-full flex items-center justify-center gap-2 bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold py-4 rounded-2xl shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                AI กำลังวิเคราะห์...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                วิเคราะห์ Resume ด้วย AI
                            </>
                        )}
                    </button>
                </div>

                {/* Right: Result panel */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#4169E1]" />
                            <h3 className="font-bold text-slate-700 text-sm">ผลการวิเคราะห์</h3>
                        </div>
                        {result && !result.streaming && (
                            <button
                                onClick={() => setResult(null)}
                                className="text-slate-300 hover:text-slate-500 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                        {!result ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                    <Sparkles className="w-7 h-7 text-[#4169E1]" />
                                </div>
                                <p className="text-slate-500 font-semibold text-sm">
                                    วาง Resume แล้วกด "วิเคราะห์"
                                </p>
                                <p className="text-slate-300 text-xs">AI จะวิเคราะห์คะแนน จุดเด่น และข้อแนะนำ</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {result.streaming && (
                                    <div className="flex items-center gap-2 mb-4 text-xs text-[#4169E1] font-semibold">
                                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        กำลังวิเคราะห์...
                                    </div>
                                )}
                                <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                                    {result.content}
                                    {result.streaming && (
                                        <span className="inline-block w-0.5 h-4 bg-[#4169E1] ml-1 animate-pulse align-middle" />
                                    )}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
