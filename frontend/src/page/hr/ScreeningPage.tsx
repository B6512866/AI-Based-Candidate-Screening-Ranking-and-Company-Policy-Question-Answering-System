import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Upload, FileText, Briefcase, Sparkles, X, ChevronDown, ChevronUp, Wifi, WifiOff, RefreshCw, Eye, FileCheck } from "lucide-react";
import { getalljobs, getapplications, updateApplicationScreening } from "../../services/jobPositionService";
import apiClient from "../../services/apiClient";

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

    // ── Batch Screening states ──────────────────────────────────────
    const [activeMode, setActiveMode] = useState<"single" | "batch">("single");
    const [batchRoles, setBatchRoles] = useState<string[]>([]);
    const [selectedBatchRole, setSelectedBatchRole] = useState<string>("");
    const [batchResults, setBatchResults] = useState<any[]>([]);
    const [batchLoading, setBatchLoading] = useState(false);

    // GORM integration states
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [analyzingStates, setAnalyzingStates] = useState<{ [key: number]: "idle" | "ocr" | "ai" | "saving" | "done" | "error" }>({});
    const [openRawText, setOpenRawText] = useState<{ [key: number]: boolean }>({});
    const activeJobIdRef = useRef<string>("");

    const parseCriteria = (text: string) => {
        const criteriaMap: { [key: string]: { name: string; max: number } } = {};
        if (!text) {
            return { cat_1: { name: "ความเหมาะสมโดยรวม", max: 100 } };
        }
        const lines = text.split("\n");
        let count = 1;
        for (const line of lines) {
            const m = line.match(/(\d+\..+?)\s*\((\d+)\s*(คะแนน|คะแนนเต็ม)\)/);
            if (m) {
                criteriaMap[`cat_${count}`] = { name: m[1].trim(), max: parseInt(m[2]) };
                count++;
            }
        }
        if (Object.keys(criteriaMap).length === 0) {
            return { cat_1: { name: "ความเหมาะสมโดยรวม", max: 100 } };
        }
        return criteriaMap;
    };

    const parseBreakdownFromStrengths = (strengths: string, criteriaMap: any) => {
        const scores: { [key: string]: number } = {};
        const match = strengths?.match(/^\[SCORES:\s*(.*?)\]/);
        
        if (match) {
            const pairs = match[1].split(",");
            pairs.forEach(p => {
                const [k, v] = p.split("=");
                if (k && v) {
                    scores[k] = parseFloat(v);
                }
            });
        }
        
        const breakdown: { [key: string]: { score: number; max: number } } = {};
        Object.keys(criteriaMap).forEach(key => {
            const info = criteriaMap[key];
            breakdown[info.name] = {
                score: scores[key] !== undefined ? scores[key] : Math.round(info.max * (match ? 0 : 0.5)),
                max: info.max
            };
        });
        return breakdown;
    };

    const getCleanStrengths = (strengths: string) => {
        return strengths ? strengths.replace(/^\[SCORES:\s*.*?\]\s*/, "") : "";
    };

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
        const loadBatchRoles = async () => {
            try {
                const res = await fetch(`${TYPHOON_API}/api/roles`);
                if (res.ok) {
                    const data = await res.json();
                    setBatchRoles(data);
                    if (data.length > 0) {
                        setSelectedBatchRole(data[0]);
                    }
                }
            } catch {
                // ignore
            }
        };
        loadJobs();
        loadBatchRoles();
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

    useEffect(() => {
        activeJobIdRef.current = selectedJobId;
    }, [selectedJobId]);

    const runSingleAnalysis = async (app: any) => {
        let resumeText = app.ResumeText || app.resume_text || "";
        
        try {
            if (!resumeText && app.resume_url) {
                setAnalyzingStates(prev => ({ ...prev, [app.ID]: "ocr" }));
                
                const response = await apiClient.get(app.resume_url, {
                    responseType: "blob"
                });
                const blob = response.data;
                const filename = app.resume_url.split("/").pop() || "resume.pdf";
                const file = new File([blob], filename, { type: blob.type });
                
                const formData = new FormData();
                formData.append("file", file);
                
                const ocrRes = await fetch(`${TYPHOON_API}/ocr`, {
                    method: "POST",
                    body: formData
                });
                if (!ocrRes.ok) throw new Error("OCR แปลงข้อความไม่สำเร็จ");
                const ocrData = await ocrRes.json();
                resumeText = ocrData.text || "";
            }

            if (!resumeText) {
                throw new Error("ไม่มีข้อความ Resume หรือไฟล์แนบ");
            }

            setAnalyzingStates(prev => ({ ...prev, [app.ID]: "ai" }));

            const matchedJob = jobs.find(j => j.ID.toString() === selectedJobId);
            const jdText = matchedJob?.description || "";
            const criteriaText = matchedJob?.criteria || "";
            const criteriaMap = parseCriteria(criteriaText);

            const scoreRes = await fetch(`${TYPHOON_API}/api/score`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resume_text: resumeText,
                    jd_text: jdText,
                    criteria_map: criteriaMap
                })
            });

            if (!scoreRes.ok) throw new Error("AI ประเมินคะแนนไม่สำเร็จ");
            const scoreData = await scoreRes.json();

            let totalScore = 0;
            const breakdown = scoreData.scores || {};
            Object.keys(criteriaMap).forEach(key => {
                const info = criteriaMap[key];
                const val = breakdown[key] || 0;
                totalScore += Math.min(val, info.max);
            });

            setAnalyzingStates(prev => ({ ...prev, [app.ID]: "saving" }));

            const scoresStr = `[SCORES: ${Object.keys(breakdown).map(k => `${k}=${breakdown[k]}`).join(",")}]`;
            const strengthsText = `${scoresStr}\n\nจุดเด่น:\n${scoreData.strengths || ""}\n\nบทสรุป:\n${scoreData.summary || ""}`;

            await updateApplicationScreening(app.ID, totalScore, strengthsText, "typhoon2.5-qwen3-4b", resumeText);

            setApplicants(prev => prev.map(a => {
                if (a.ID === app.ID) {
                    return {
                        ...a,
                        ResumeText: resumeText,
                        resume_text: resumeText,
                        AIScreening: {
                            skill_score: totalScore,
                            strengths: strengthsText,
                            model_used: "typhoon2.5-qwen3-4b"
                        }
                    };
                }
                return a;
            }));

            setAnalyzingStates(prev => ({ ...prev, [app.ID]: "done" }));
        } catch (err: any) {
            console.error(`Error screening application ${app.ID}:`, err);
            setAnalyzingStates(prev => ({ ...prev, [app.ID]: "error" }));
        }
    };

    const analyzeSequentially = async (pendingApps: any[]) => {
        for (const app of pendingApps) {
            if (activeJobIdRef.current !== selectedJobId) break;
            await runSingleAnalysis(app);
        }
    };

    useEffect(() => {
        if (activeMode === "batch" && selectedJobId && selectedJobId !== "custom") {
            const loadApplicants = async () => {
                setLoadingApplicants(true);
                try {
                    const res = await getapplications(parseInt(selectedJobId));
                    if (res && res.data) {
                        setApplicants(res.data);
                        
                        const pending = res.data.filter((a: any) => !a.AIScreening);
                        if (pending.length > 0) {
                            analyzeSequentially(pending);
                        }
                    }
                } catch (e) {
                    console.error("Failed to load applicants", e);
                } finally {
                    setLoadingApplicants(false);
                }
            };
            loadApplicants();
        }
    }, [selectedJobId, activeMode]);

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

    const runBatchAnalysis = async () => {
        if (!selectedBatchRole) return;
        setBatchLoading(true);
        setBatchResults([]);
        try {
            const res = await fetch(`${TYPHOON_API}/api/analyze?role=${selectedBatchRole}`);
            if (!res.ok) throw new Error("ไม่สามารถประเมินผลลัพธ์แบบกลุ่มได้");
            const data = await res.json();
            if (data && data.results) {
                setBatchResults(data.results);
            }
        } catch (err: any) {
            alert(err.message || "เกิดข้อผิดพลาดในการประเมินผลลัพธ์แบบกลุ่ม");
        } finally {
            setBatchLoading(false);
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

            {/* Tabs for Mode */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-px">
                <button
                    onClick={() => setActiveMode("single")}
                    className={`px-6 py-3 border-b-2 font-bold text-sm transition-all font-sans ${activeMode === "single"
                        ? "border-[#4169E1] text-[#4169E1]"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                >
                    วิเคราะห์เดี่ยว (Single Resume)
                </button>
                <button
                    onClick={() => setActiveMode("batch")}
                    className={`px-6 py-3 border-b-2 font-bold text-sm transition-all font-sans ${activeMode === "batch"
                        ? "border-[#4169E1] text-[#4169E1]"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                >
                    วิเคราะห์กลุ่ม (Batch Screening)
                </button>
            </div>

            {activeMode === "single" ? (
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
            ) : (
                /* ── Batch Screening Mode (GORM Integration) ── */
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 font-sans">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-800 text-sm">การคัดกรองเรซูเม่แยกตามตำแหน่งงาน (GORM Role Screening)</h3>
                                <p className="text-slate-400 text-xs">เลือกตำแหน่งงานด้านขวา ระบบจะดึงเรซูเม่ของผู้สมัครทุกคนและรันการวิเคราะห์คะแนนอัตโนมัติทันที</p>
                            </div>
                            <div className="min-w-[280px]">
                                <select
                                    value={selectedJobId}
                                    onChange={e => handleJobChange(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 font-sans"
                                >
                                    <option value="">-- เลือกตำแหน่งงานขององค์กร --</option>
                                    {jobs.map(job => (
                                        <option key={job.ID} value={job.ID.toString()}>{job.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Loading state for fetching applicants */}
                    {loadingApplicants && (
                        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-sm font-sans">
                            <div className="flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-100 border-t-[#4169E1]"></div>
                            </div>
                            <p className="text-slate-400 text-xs">กำลังโหลดรายชื่อผู้สมัครและไฟล์ Resume...</p>
                        </div>
                    )}

                    {/* Results cards rendering */}
                    {!loadingApplicants && selectedJobId && selectedJobId !== "custom" && (
                        <>
                            {applicants.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-100 shadow-sm font-sans">
                                    ยังไม่มีผู้สมัครส่งใบสมัครเข้ามาในตำแหน่งงานนี้
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {applicants.map((app, idx) => {
                                        const candidateName = app.Candidate 
                                            ? `${app.Candidate.first_name} ${app.Candidate.last_name}` 
                                            : "ไม่ระบุชื่อผู้สมัคร";
                                        
                                        const resumeName = app.resume_url 
                                            ? app.resume_url.split("/").pop() 
                                            : "Resume.pdf";

                                        const hasScore = !!app.AIScreening;
                                        const score = app.AIScreening?.skill_score || 0;
                                        const status = analyzingStates[app.ID] || (hasScore ? "done" : "idle");

                                        const scoreColor = score >= 80 
                                            ? "text-emerald-500" 
                                            : score >= 50 
                                                ? "text-amber-500" 
                                                : "text-rose-500";

                                        // Parse criteria
                                        const matchedJob = jobs.find(j => j.ID.toString() === selectedJobId);
                                        const criteriaMap = parseCriteria(matchedJob?.criteria || "");
                                        const breakdown = parseBreakdownFromStrengths(app.AIScreening?.strengths, criteriaMap);
                                        const cleanStrengths = getCleanStrengths(app.AIScreening?.strengths);
                                        
                                        return (
                                            <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all font-sans flex flex-col space-y-4 relative">
                                                
                                                {/* Header */}
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3 col-span-2">
                                                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-[#4169E1] shrink-0">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-slate-800 text-sm truncate max-w-[200px]" title={candidateName}>
                                                                {candidateName}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 truncate max-w-[200px]" title={resumeName}>
                                                                {resumeName}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        {status === "ocr" && (
                                                            <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> OCR สแกนไฟล์...
                                                            </span>
                                                        )}
                                                        {status === "ai" && (
                                                            <span className="text-xs text-blue-500 font-bold flex items-center gap-1">
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> AI คัดกรอง...
                                                            </span>
                                                        )}
                                                        {status === "saving" && (
                                                            <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังบันทึก...
                                                            </span>
                                                        )}
                                                        {status === "error" && (
                                                            <span className="text-xs text-red-500 font-bold">
                                                                เกิดข้อผิดพลาด
                                                            </span>
                                                        )}
                                                        {status === "idle" && (
                                                            <span className="text-xs text-slate-400 font-medium">
                                                                รอการวิเคราะห์...
                                                            </span>
                                                        )}
                                                        {status === "done" && (
                                                            <span className={`text-lg font-black ${scoreColor}`}>
                                                                {Math.round(score)} <span className="text-xs font-semibold">PTS</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Panel for individual candidate */}
                                                <div className="flex items-center gap-2 pt-1">
                                                    {app.resume_url && (
                                                        <a
                                                            href={(apiClient.defaults.baseURL || "").replace("/api", "") + app.resume_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-600 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                                        >
                                                            เปิดไฟล์ Resume
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => runSingleAnalysis(app)}
                                                        disabled={status === "ocr" || status === "ai" || status === "saving"}
                                                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                                    >
                                                        <RefreshCw className={`w-3 h-3 ${status === "ocr" || status === "ai" ? "animate-spin" : ""}`} /> วิเคราะห์ใหม่
                                                    </button>
                                                </div>

                                                {status !== "done" ? (
                                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center text-slate-400 text-xs font-sans mt-2">
                                                        {status === "ocr" && "⏳ กำลังสแกนไฟล์ด้วย OCR..."}
                                                        {status === "ai" && "🧠 กำลังประเมินข้อมูลและให้คะแนนด้วย AI..."}
                                                        {status === "saving" && "💾 กำลังบันทึกผลการคัดกรอง..."}
                                                        {status === "error" && "⚠️ เกิดข้อผิดพลาดในการประเมินผลลัพธ์"}
                                                        {status === "idle" && "⏳ รอการวิเคราะห์ (กำลังจัดเตรียมคิวประมวลผล...)"}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Criteria progress bars */}
                                                        <div className="space-y-3 pt-3 border-t border-slate-50">
                                                            {Object.entries(breakdown).map(([cName, info]: any, cIdx) => {
                                                                const percent = info.max > 0 ? (info.score / info.max) * 100 : 0;
                                                                const colorClass = percent >= 80 
                                                                    ? "emerald" 
                                                                    : percent >= 50 
                                                                        ? "amber" 
                                                                        : "rose";

                                                                const barStyles = {
                                                                    emerald: {
                                                                        bar: "bg-emerald-500",
                                                                        border: "border-emerald-500/30",
                                                                        bg: "bg-emerald-50/20"
                                                                    },
                                                                    amber: {
                                                                        bar: "bg-amber-500",
                                                                        border: "border-amber-500/30",
                                                                        bg: "bg-amber-50/20"
                                                                    },
                                                                    rose: {
                                                                        bar: "bg-rose-500",
                                                                        border: "border-rose-500/30",
                                                                        bg: "bg-rose-50/20"
                                                                    }
                                                                }[colorClass];
                                                                
                                                                return (
                                                                    <div key={cIdx} className="space-y-1">
                                                                        <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                                                            <span>{cIdx + 1}. {cName}</span>
                                                                            <span>{info.score}/{info.max} PTS</span>
                                                                        </div>
                                                                        <div className={`w-full ${barStyles.bg} border ${barStyles.border} h-3.5 rounded-full overflow-hidden p-0.5`}>
                                                                            <div 
                                                                                className={`h-full rounded-full transition-all duration-500 ${barStyles.bar}`}
                                                                                style={{ width: `${percent}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Text OCR raw display collapsible */}
                                                        <div className="pt-1">
                                                            <details className="text-[11px] border border-slate-100 rounded-xl p-2 bg-slate-50/50 cursor-pointer">
                                                                <summary className="font-bold text-slate-500 select-none">ดูข้อความดิบจากการสแกน (OCR Raw Text)</summary>
                                                                <textarea
                                                                    readOnly
                                                                    value={app.ResumeText || app.resume_text || ""}
                                                                    rows={4}
                                                                    className="w-full bg-white border border-slate-100 rounded-lg p-2 mt-2 font-mono text-[9px] resize-none outline-none leading-normal text-slate-600"
                                                                />
                                                            </details>
                                                        </div>

                                                        {/* Strengths & Summary */}
                                                        {cleanStrengths && (
                                                            <div className="pt-2 border-t border-slate-50 text-xs leading-relaxed whitespace-pre-wrap text-slate-600 font-sans">
                                                                {cleanStrengths}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* Empty initial state */}
                    {(!selectedJobId || selectedJobId === "custom") && (
                        <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-100 shadow-sm font-sans">
                            กรุณาเลือกตำแหน่งงานขององค์กรด้านบนเพื่อรันการคัดกรอง Resume ทั้งหมด
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
