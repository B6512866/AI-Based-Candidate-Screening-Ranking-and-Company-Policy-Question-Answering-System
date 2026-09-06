import { useState, useEffect } from "react";
import { Search, Sparkles, CheckCircle2, AlertCircle, Eye, RefreshCw, ChevronDown, ChevronUp, X, Award, FileText, BarChart3, Check } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { getalljobs } from "../../services/jobPositionService";

interface SubCriterion {
    id?: string;
    sub_criterion_id?: string;
    title: string;
    description?: string;
    weight: number;
}

interface MainCriterionBreakdown {
    criterion_id: string;
    main_criterion_title: string;
    score: number;
    max_score: number;
    weight: number;
    percentage: number;
    evaluated_level: string;
    reason: string;
    sub_criteria?: SubCriterion[];
}

interface CandidateBasicInfo {
    name?: string;
    email?: string;
    phone?: string;
    age?: string;
    education?: string;
    experience?: string;
}

interface AnalysisDataObj {
    total_score?: number;
    candidate_basic_info?: CandidateBasicInfo;
    main_criteria_breakdown?: MainCriterionBreakdown[];
    raw_markdown?: string;
    analyzed_at?: string;
}

interface CandidateItem {
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    aiScore: number;
    status: string;
    appliedDate: string;
    analysisObj: AnalysisDataObj | null;
    criteriaBreakdown: MainCriterionBreakdown[];
    strengths: string;
    modelUsed: string;
    rawApp: any;
}

const parseScoresFromStrengthsStr = (strengths: string) => {
    const scores: { [key: string]: number } = {};
    if (!strengths) return scores;
    const match = strengths.match(/^\[SCORES:\s*(.*?)\]/);
    if (match) {
        const pairs = match[1].split(",");
        pairs.forEach(p => {
            const [k, v] = p.split("=");
            if (k && v) {
                scores[k] = parseFloat(v);
            }
        });
    }
    return scores;
};

const parseMarkdownTableRows = (text: string) => {
    if (!text) return [];
    const lines = text.split("\n");
    const rows: { name: string; score: number; max: number; reason: string }[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("|")) continue;

        const cols = trimmed.split("|").map(c => c.trim()).filter(c => c !== "");
        if (cols.length < 2) continue;

        const name = cols[0].replace(/\*\*/g, "").replace(/^[-#*:]+/g, "").trim();
        if (!name || name.startsWith("---") || name.includes("เกณฑ์") || name.toLowerCase().includes("criterion")) {
            continue;
        }

        const scoreStr = cols[1].replace(/\*\*/g, "").trim();
        const reason = cols[2] ? cols[2].replace(/\*\*/g, "").trim() : "";
        const scoreMatch = scoreStr.match(/(\d+(?:\.\d+)?)\s*(?:[\/|\s-–—]+\s*(\d+(?:\.\d+)?))?/);
        if (scoreMatch) {
            const scoreVal = parseFloat(scoreMatch[1]);
            const maxVal = scoreMatch[2] ? parseFloat(scoreMatch[2]) : 100;
            const isTotal = name.includes("รวม") || name.includes("Total") || name.includes("สรุป");
            if (!isTotal) {
                rows.push({ name, score: scoreVal, max: maxVal, reason });
            }
        }
    }
    return rows;
};

const getLevelRatio = (levelStr: string, currentScore: number, maxScore: number) => {
    if (levelStr) {
        const clean = levelStr.toLowerCase();
        if (clean.includes("100%") || (clean.includes("ดี") && !clean.includes("แย่"))) {
            return 1.0;
        }
        if (clean.includes("50%") || clean.includes("ปานกลาง")) {
            return 0.5;
        }
        if (clean.includes("0%") || clean.includes("แย่")) {
            return 0.0;
        }
    }
    const ratio = maxScore > 0 ? currentScore / maxScore : 0;
    if (ratio >= 0.75) return 1.0;
    if (ratio >= 0.25) return 0.5;
    return 0.0;
};

export default function CandidatesPage() {
    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<string>("ทั้งหมด");
    
    // UI Expand and Modal states
    const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
    const [selectedCandidateModal, setSelectedCandidateModal] = useState<CandidateItem | null>(null);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const [resCandidates, resJobs] = await Promise.all([
                apiClient.get("/interviews/candidates").catch(() => ({ data: { data: [] } })),
                getalljobs().catch(() => ({ data: [] }))
            ]);

            const jobsList = resJobs?.data || resJobs || [];
            const jobsMap: Record<string, any> = {};
            if (Array.isArray(jobsList)) {
                jobsList.forEach((j: any) => {
                    const jId = j.ID?.toString() || j.id?.toString();
                    if (jId) jobsMap[jId] = j;
                });
            }

            if (resCandidates.data && resCandidates.data.data) {
                const list: CandidateItem[] = resCandidates.data.data.map((app: any) => {
                    const cand = app.Candidate || app.candidate || {};
                    const aiScreening = app.AIScreening || app.ai_screening || {};
                    const analysisDataRaw = aiScreening.analysis_data || aiScreening.AnalysisData || "";
                    
                    let parsedAnalysisObj: AnalysisDataObj | null = null;
                    if (analysisDataRaw) {
                        try {
                            parsedAnalysisObj = typeof analysisDataRaw === "string" ? JSON.parse(analysisDataRaw) : analysisDataRaw;
                        } catch (e) {
                            console.warn("Failed to parse analysis_data JSON:", e);
                        }
                    }

                    // 1. Resolve AIScore accurately
                    let score = 0;
                    if (aiScreening.skill_score !== undefined && aiScreening.skill_score !== null && aiScreening.skill_score > 0) {
                        score = aiScreening.skill_score;
                    } else if (app.AIScore && app.AIScore > 0) {
                        score = app.AIScore;
                    } else if (app.ai_score && app.ai_score > 0) {
                        score = app.ai_score;
                    } else if (parsedAnalysisObj?.total_score && parsedAnalysisObj.total_score > 0) {
                        score = parsedAnalysisObj.total_score;
                    }

                    // 2. Clean up Candidate Name display
                    let rawFirstName = cand.first_name || cand.FirstName || "";
                    let rawLastName = cand.last_name || cand.LastName || "";
                    let name = `${rawFirstName} ${rawLastName}`.trim();

                    if (!name || name.includes("ผู้สมัครชื่อ") || name.startsWith("test")) {
                        if (parsedAnalysisObj?.candidate_basic_info?.name) {
                            name = parsedAnalysisObj.candidate_basic_info.name;
                        }
                    }
                    name = name.replace(/^ผู้สมัครชื่อ\s*/, "").replace(/^คุณ\s*/, "").replace(/^ชื่อ\s*/, "");
                    if (name.includes(" เป็น")) name = name.split(" เป็น")[0].trim();
                    if (name.includes(" โดย")) name = name.split(" โดย")[0].trim();
                    if (!name) name = "ไม่ระบุชื่อ";

                    // 3. Find matched job position
                    const jobId = app.JobPositionID || app.job_position_id || app.JobPosition?.ID || app.JobPosition?.id;
                    const matchedJob = app.JobPosition || jobsMap[jobId?.toString()];
                    const jobCriteria = matchedJob?.criteria || matchedJob?.Criteria || [];

                    // 4. Extract Criteria & SubCriteria breakdown
                    let rawBreakdown: MainCriterionBreakdown[] = parsedAnalysisObj?.main_criteria_breakdown || [];

                    const strengthsText = aiScreening.strengths || aiScreening.Strengths || parsedAnalysisObj?.raw_markdown || "";
                    const catScores = parseScoresFromStrengthsStr(strengthsText);
                    const parsedTableRows = parseMarkdownTableRows(strengthsText);

                    // Fallback Level 2: Map from JobPosition.criteria + catScores / parsedTableRows
                    if ((!rawBreakdown || rawBreakdown.length === 0) && Array.isArray(jobCriteria) && jobCriteria.length > 0) {
                        rawBreakdown = jobCriteria.map((c: any, idx: number) => {
                            const title = c.title || c.Title || `เกณฑ์ที่ ${idx + 1}`;
                            const maxScore = c.weight || c.Weight || 25;
                            const catKey = `cat_${idx + 1}`;

                            let currentScore = catScores[catKey] !== undefined ? catScores[catKey] : catScores[c.id];

                            // Extract intelligent reason
                            let reason = "";
                            const matchedRow = parsedTableRows.find(r => 
                                r.name.toLowerCase().includes(title.toLowerCase()) || 
                                title.toLowerCase().includes(r.name.toLowerCase())
                            ) || parsedTableRows[idx];

                            if (matchedRow && matchedRow.reason && matchedRow.reason.length > 2) {
                                reason = matchedRow.reason;
                            }

                            if (currentScore === undefined) {
                                if (matchedRow) {
                                    currentScore = matchedRow.score;
                                } else {
                                    currentScore = Math.round(maxScore * (score / 100));
                                }
                            }

                            // Try searching strengthsText bullet points if reason is still empty
                            if (!reason && strengthsText) {
                                const cleanStrengths = strengthsText.replace(/^\[SCORES:\s*.*?\]\s*/, "");
                                const lines = cleanStrengths.split("\n");
                                const keywords = title.split(/[\s&/]+/);
                                for (const line of lines) {
                                    const trimmed = line.replace(/^[-*•\d.\s#]+/, "").trim();
                                    if (trimmed.length > 8 && !trimmed.startsWith("|") && !trimmed.startsWith("---")) {
                                        if (keywords.some((kw: string) => kw.length > 3 && trimmed.toLowerCase().includes(kw.toLowerCase()))) {
                                            reason = trimmed;
                                            break;
                                        }
                                    }
                                }
                            }

                            let levelStr = "";
                            if (matchedRow && matchedRow.max && matchedRow.max > 0) {
                                const rRatio = matchedRow.score / matchedRow.max;
                                levelStr = rRatio >= 0.75 ? "ดี (100%)" : rRatio >= 0.25 ? "ปานกลาง (50%)" : "แย่ (0%)";
                            } else if (catScores[catKey] !== undefined) {
                                const catRatio = maxScore > 0 ? catScores[catKey] / maxScore : 0;
                                levelStr = catRatio >= 0.75 ? "ดี (100%)" : catRatio >= 0.25 ? "ปานกลาง (50%)" : "แย่ (0%)";
                            } else {
                                const ratio = maxScore > 0 ? currentScore / maxScore : 0;
                                levelStr = ratio >= 0.75 ? "ดี (100%)" : ratio >= 0.25 ? "ปานกลาง (50%)" : "แย่ (0%)";
                            }

                            const rawSubCriteria = c.sub_criteria || c.SubCriteria || [];
                            const subCriteria = rawSubCriteria.map((sc: any) => ({
                                id: sc.id || sc.SubCriterionID,
                                title: sc.title || sc.Title || "",
                                description: sc.description || sc.Description || "",
                                weight: sc.weight || sc.Weight || 0
                            }));

                            return {
                                criterion_id: c.id || c.CriterionID || `c_${idx + 1}`,
                                main_criterion_title: title,
                                score: currentScore,
                                max_score: maxScore,
                                weight: maxScore,
                                percentage: 0,
                                evaluated_level: levelStr,
                                reason: reason,
                                sub_criteria: subCriteria
                            };
                        });
                    }

                    // Fallback Level 3: Construct criteria breakdown directly from parsed markdown table rows
                    if ((!rawBreakdown || rawBreakdown.length === 0) && parsedTableRows.length > 0) {
                        rawBreakdown = parsedTableRows.map((r, idx) => {
                            const ratio = r.max > 0 ? r.score / r.max : 0;
                            const level = ratio >= 0.75 ? "ดี (100%)" : ratio >= 0.25 ? "ปานกลาง (50%)" : "แย่ (0%)";
                            return {
                                criterion_id: `crit_row_${idx + 1}`,
                                main_criterion_title: r.name,
                                score: r.score,
                                max_score: r.max,
                                weight: r.max,
                                percentage: Math.round(ratio * 100),
                                evaluated_level: level,
                                reason: r.reason || "สกัดข้อมูลผลประเมินจากสรุป AI",
                                sub_criteria: []
                            };
                        });
                    }

                    // 🌟 CRITICAL SCORE RE-CALCULATION RULE:
                    // Main Criterion Score = Math.round(Main Criterion Weight * Sub-Criteria Evaluated Level %)
                    // E.g., Level แย่ (0%) * Weight 35% = 0 / 35
                    // E.g., Level ปานกลาง (50%) * Weight 35% = Math.round(35 * 0.5) = 18 / 35
                    // E.g., Level ดี (100%) * Weight 35% = 35 / 35
                    const criteriaBreakdown: MainCriterionBreakdown[] = rawBreakdown.map((crit, idx) => {
                        const maxScore = crit.max_score || crit.weight || 25;
                        const levelRatio = getLevelRatio(crit.evaluated_level, crit.score, maxScore);
                        const calculatedScore = Math.round(maxScore * levelRatio);
                        const levelLabel = levelRatio === 1.0 ? "ดี (100%)" : levelRatio === 0.5 ? "ปานกลาง (50%)" : "แย่ (0%)";

                        let reason = crit.reason;
                        const isGenericReason = !reason || 
                            reason.trim() === "" || 
                            reason.includes("คะแนนประเมินเฉพาะเกณฑ์") || 
                            reason.includes("สกัดข้อมูลผลประเมิน");

                        if (isGenericReason) {
                            const title = crit.main_criterion_title || "";
                            const matchedRow = parsedTableRows.find(r => 
                                r.name.toLowerCase().includes(title.toLowerCase()) || 
                                title.toLowerCase().includes(r.name.toLowerCase())
                            ) || parsedTableRows[idx];

                            if (matchedRow && matchedRow.reason && matchedRow.reason.trim().length > 2) {
                                reason = matchedRow.reason;
                            }
                        }

                        if (!reason || reason.trim() === "" || reason.includes("คะแนนประเมินเฉพาะเกณฑ์") || reason.includes("สกัดข้อมูลผลประเมิน")) {
                            if (strengthsText) {
                                const cleanStrengths = strengthsText.replace(/^\[SCORES:\s*.*?\]\s*/, "");
                                const lines = cleanStrengths.split("\n");
                                const titleKeywords = (crit.main_criterion_title || "").split(/[\s&/]+/);
                                for (const line of lines) {
                                    const trimmed = line.replace(/^[-*•\d.\s#]+/, "").trim();
                                    if (trimmed.length > 8 && !trimmed.startsWith("|") && !trimmed.startsWith("---")) {
                                        if (titleKeywords.some((kw: string) => kw.length > 3 && trimmed.toLowerCase().includes(kw.toLowerCase()))) {
                                            reason = trimmed;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        if (!reason || reason.trim() === "" || reason.includes("คะแนนประเมินเฉพาะเกณฑ์") || reason.includes("สกัดข้อมูลผลประเมิน")) {
                            if (levelRatio === 1.0) {
                                reason = `มีทักษะและประสบการณ์อยู่ในระดับดีเยี่ยม ตรงตามข้อกำหนดเกณฑ์ (${calculatedScore}/${maxScore} คะแนน)`;
                            } else if (levelRatio === 0.5) {
                                reason = `มีทักษะและประสบการณ์ในระดับปานกลาง ครอบคลุมพื้นฐานเกณฑ์ (${calculatedScore}/${maxScore} คะแนน)`;
                            } else {
                                reason = `ยังมีทักษะหรือประสบการณ์ไม่ตรงตามข้อกำหนดหลักของเกณฑ์ (${calculatedScore}/${maxScore} คะแนน)`;
                            }
                        }

                        return {
                            ...crit,
                            score: calculatedScore,
                            max_score: maxScore,
                            weight: maxScore,
                            percentage: Math.round(levelRatio * 100),
                            evaluated_level: levelLabel,
                            reason: reason
                        };
                    });

                    // Total PTS = sum of normalized main criteria scores
                    let finalPTS = score;
                    if (criteriaBreakdown.length > 0) {
                        finalPTS = criteriaBreakdown.reduce((sum, item) => sum + item.score, 0);
                    }

                    const dateStr = app.created_at || app.CreatedAt
                        ? new Date(app.created_at || app.CreatedAt).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                        })
                        : "ไม่ระบุ";

                    return {
                        id: app.ID ? app.ID.toString() : app.id?.toString() || "0",
                        name: name,
                        email: cand.email || parsedAnalysisObj?.candidate_basic_info?.email || "-",
                        phone: cand.phone || parsedAnalysisObj?.candidate_basic_info?.phone || "-",
                        position: matchedJob?.title || app.position || "ไม่ระบุตำแหน่ง",
                        aiScore: Math.round(finalPTS),
                        status: app.status || "รอพิจารณา",
                        appliedDate: dateStr,
                        analysisObj: parsedAnalysisObj,
                        criteriaBreakdown: criteriaBreakdown,
                        strengths: aiScreening.strengths || aiScreening.Strengths || "",
                        modelUsed: aiScreening.model_used || aiScreening.ModelUsed || "typhoon2.5-qwen3-4b",
                        rawApp: app
                    };
                });

                // จัดลำดับ PTS (คะแนน AI) จากมากไปน้อย
                list.sort((a, b) => b.aiScore - a.aiScore);

                setCandidates(list);
            }
        } catch (err) {
            console.error("Error fetching candidates:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    const filtered = candidates.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                            c.position.toLowerCase().includes(search.toLowerCase()) || 
                            c.email.toLowerCase().includes(search.toLowerCase());
        const matchTab = activeTab === "ทั้งหมด" || c.status === activeTab;
        return matchSearch && matchTab;
    });

    const toggleExpandRow = (id: string) => {
        setExpandedCandidateId(prev => prev === id ? null : id);
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">จัดลำดับและโปรไฟล์ผู้สมัคร (PTS Ranking)</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        รายชื่อผู้สมัครทั้งหมด เรียงลำดับตามคะแนน PTS พร้อมรายละเอียดเกณฑ์การประเมิน (Criteria, Sub-Criteria & Weights)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCandidates}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        รีเฟรชข้อมูล
                    </button>
                    <Link
                        to="/hr/screening"
                        className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-200 text-sm"
                    >
                        <Sparkles className="w-4 h-4" />
                        คัดกรอง Resume ด้วย AI
                    </Link>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
                    {["ทั้งหมด", "รอพิจารณา", "ผ่านการคัดเลือก", "interview", "ปฏิเสธ"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeTab === tab
                                    ? "bg-indigo-50 text-[#4169E1] border border-indigo-100"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                        >
                            {tab === "interview" ? "นัดสัมภาษณ์แล้ว" : tab}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหาชื่อ, ตำแหน่ง, อีเมล..."
                        className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 w-52"
                    />
                </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden font-sans">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider font-bold">
                                <th className="py-3.5 px-4 w-12 text-center">#</th>
                                <th className="py-3.5 px-6">ผู้สมัคร & คะแนน Criteria ย่อย</th>
                                <th className="py-3.5 px-6">ตำแหน่งที่สมัคร</th>
                                <th className="py-3.5 px-6">คะแนน PTS (0-100)</th>
                                <th className="py-3.5 px-6">สถานะ</th>
                                <th className="py-3.5 px-6">วันที่ยื่นสมัคร</th>
                                <th className="py-3.5 px-6 text-right">รายละเอียดคะแนน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        กำลังโหลดข้อมูลผู้สมัครและคะแนนประเมิน...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        ยังไม่มีข้อมูลผู้สมัครในระบบ
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((c, index) => {
                                    const isExpanded = expandedCandidateId === c.id;
                                    return (
                                        <>
                                            <tr 
                                                key={c.id} 
                                                className={`transition-all hover:bg-slate-50/70 ${isExpanded ? "bg-indigo-50/20" : ""}`}
                                            >
                                                <td className="py-4 px-4 text-center font-mono font-bold text-slate-400">
                                                    #{index + 1}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="space-y-1.5">
                                                        <p className="font-bold text-slate-800 text-base">{c.name}</p>
                                                        <p className="text-slate-400 text-xs">{c.email} • {c.phone}</p>
                                                        
                                                        {/* 🌟 Display inline Criteria Score Badges (ดึงจากการวิเคราะห์ Resume) */}
                                                        {c.criteriaBreakdown && c.criteriaBreakdown.length > 0 && (
                                                            <div className="flex flex-wrap items-center gap-1.5 pt-1 max-w-xl">
                                                                {c.criteriaBreakdown.map((crit, cIdx) => {
                                                                    const percent = crit.max_score > 0 ? (crit.score / crit.max_score) * 100 : 0;
                                                                    const badgeColor = percent >= 80 
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" 
                                                                        : percent >= 50 
                                                                            ? "bg-amber-50 text-amber-700 border-amber-200/80" 
                                                                            : "bg-rose-50 text-rose-700 border-rose-200/80";

                                                                    return (
                                                                        <div key={cIdx} className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 shadow-2xs ${badgeColor}`}>
                                                                            <span className="text-slate-600 font-normal truncate max-w-[130px]">{crit.main_criterion_title}:</span>
                                                                            <span className="font-bold font-mono">{crit.score}/{crit.max_score}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-slate-600 font-semibold">{c.position}</td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-24 bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-100">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    c.aiScore >= 80 
                                                                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                                                                        : c.aiScore >= 50 
                                                                            ? "bg-gradient-to-r from-amber-500 to-amber-400" 
                                                                            : c.aiScore > 0 
                                                                                ? "bg-gradient-to-r from-rose-500 to-rose-400" 
                                                                                : "bg-slate-300"
                                                                }`}
                                                                style={{ width: `${c.aiScore}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-extrabold text-sm font-mono ${
                                                            c.aiScore >= 80 
                                                                ? "text-emerald-600" 
                                                                : c.aiScore >= 50 
                                                                    ? "text-amber-600" 
                                                                    : c.aiScore > 0 
                                                                        ? "text-rose-600" 
                                                                        : "text-slate-400"
                                                        }`}>
                                                            {c.aiScore} PTS
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                                        c.status === "ผ่านการคัดเลือก"
                                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                            : c.status === "interview" || c.status === "นัดสัมภาษณ์แล้ว"
                                                                ? "bg-indigo-50 text-[#4169E1] border border-indigo-100"
                                                                : c.status === "ปฏิเสธ"
                                                                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                                                                    : "bg-amber-50 text-amber-600 border border-amber-100"
                                                    }`}>
                                                        {c.status === "ผ่านการคัดเลือก" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                                        {c.status === "interview" ? "นัดสัมภาษณ์แล้ว" : c.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-slate-400 text-xs">{c.appliedDate}</td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => toggleExpandRow(c.id)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                                                isExpanded 
                                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                                                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                                                            }`}
                                                            title="ดูคะแนน Criteria & Sub-Criteria"
                                                        >
                                                            <BarChart3 className="w-3.5 h-3.5" />
                                                            <span>คะแนน Criteria</span>
                                                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        </button>
                                                        
                                                        <button
                                                            onClick={() => setSelectedCandidateModal(c)}
                                                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-[#4169E1] hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                                            title="ดูรายละเอียดฉบับเต็ม"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expandable Criteria & SubCriteria Breakdown Row */}
                                            {isExpanded && (
                                                <tr key={`expand-${c.id}`} className="bg-slate-50/60 border-b border-slate-100">
                                                    <td colSpan={7} className="p-6">
                                                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                                                            {/* Title Header */}
                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2.5 bg-indigo-50 rounded-xl text-[#4169E1]">
                                                                        <Award className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="font-bold text-slate-800 text-base">
                                                                            สรุปคะแนนตาม Criteria และ Sub-Criteria (พร้อมค่าน้ำหนัก)
                                                                        </h3>
                                                                        <p className="text-slate-400 text-xs">
                                                                            วิเคราะห์สำหรับผู้สมัคร: <span className="font-semibold text-slate-700">{c.name}</span> ({c.position})
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-xs text-slate-400 block font-medium">คะแนนรวม PTS</span>
                                                                    <span className="text-xl font-black font-mono text-[#4169E1]">{c.aiScore} / 100</span>
                                                                </div>
                                                            </div>

                                                            {/* Criteria Cards */}
                                                            {c.criteriaBreakdown.length === 0 ? (
                                                                <div className="py-8 text-center space-y-3">
                                                                    <p className="text-slate-400 text-sm">
                                                                        ผู้สมัครรายนี้ยังไม่ได้ทำการสกัดคะแนน Criteria ด้วย AI
                                                                    </p>
                                                                    <Link
                                                                        to="/hr/screening"
                                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#4169E1] hover:bg-[#3152c4] transition-all shadow-sm shadow-indigo-100"
                                                                    >
                                                                        <Sparkles className="w-3.5 h-3.5" />
                                                                        คัดกรอง Resume ด้วย AI ในหน้า Screening
                                                                    </Link>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {c.criteriaBreakdown.map((crit, idx) => {
                                                                        const level = crit.evaluated_level || "ปานกลาง (50%)";
                                                                        const isGood = level.includes("ดี") || level.includes("100%");
                                                                        const isPoor = level.includes("แย่") || level.includes("0%");

                                                                        return (
                                                                            <div key={idx} className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                                                                                {/* Header */}
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="bg-indigo-100 text-[#4169E1] font-bold text-xs px-2 py-0.5 rounded-md font-mono">
                                                                                                Crit #{idx + 1}
                                                                                            </span>
                                                                                            <h4 className="font-bold text-slate-800 text-sm">
                                                                                                {crit.main_criterion_title}
                                                                                            </h4>
                                                                                        </div>
                                                                                    </div>
                                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                                                                                        isGood
                                                                                            ? "bg-emerald-100 text-emerald-700"
                                                                                            : isPoor
                                                                                                ? "bg-rose-100 text-rose-700"
                                                                                                : "bg-amber-100 text-amber-700"
                                                                                    }`}>
                                                                                        {level}
                                                                                    </span>
                                                                                </div>

                                                                                {/* Scores & Weights Bar */}
                                                                                <div className="bg-white rounded-lg p-2.5 border border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                                                                                    <span>คะแนนที่ได้: <strong className="text-slate-900 font-mono">{crit.score} / {crit.max_score}</strong></span>
                                                                                    <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                                                                                        ค่าน้ำหนัก: {crit.weight || crit.max_score}%
                                                                                    </span>
                                                                                </div>

                                                                                {/* Sub-Criteria List */}
                                                                                {crit.sub_criteria && crit.sub_criteria.length > 0 && (
                                                                                    <div className="space-y-1.5 pt-1">
                                                                                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                                                                                            เกณฑ์ย่อย (Sub-Criteria):
                                                                                        </p>
                                                                                        <div className="space-y-1">
                                                                                            {crit.sub_criteria.map((sc, sIdx) => (
                                                                                                <div key={sIdx} className="bg-white rounded-lg p-2 border border-slate-100 text-xs flex items-start justify-between gap-2">
                                                                                                    <div className="flex items-start gap-1.5">
                                                                                                        <Check className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                                                                                        <div>
                                                                                                            <span className="font-semibold text-slate-800">{sc.title}</span>
                                                                                                            {sc.description && (
                                                                                                                <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">{sc.description}</p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                                                                                        น้ำหนัก {sc.weight}%
                                                                                                    </span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* AI Reason */}
                                                                                {crit.reason && (
                                                                                    <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-100 text-xs space-y-1">
                                                                                        <span className="font-bold text-indigo-700 flex items-center gap-1.5">
                                                                                            <Sparkles className="w-3.5 h-3.5 text-[#4169E1]" />
                                                                                            ผลประเมินและการวิเคราะห์ของ AI:
                                                                                        </span>
                                                                                        <p className="text-slate-700 leading-relaxed font-medium">
                                                                                            {crit.reason}
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Candidate Detail Modal */}
            {selectedCandidateModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4169E1] flex items-center justify-center font-black text-xl shadow-sm">
                                    {selectedCandidateModal.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">{selectedCandidateModal.name}</h2>
                                    <p className="text-slate-500 text-sm">{selectedCandidateModal.position} • ยื่นสมัครเมื่อ {selectedCandidateModal.appliedDate}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{selectedCandidateModal.email} | {selectedCandidateModal.phone}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCandidateModal(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Top Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl p-4 border border-indigo-100 text-center">
                                <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider block">คะแนน PTS สรุป</span>
                                <span className="text-3xl font-black text-[#4169E1] font-mono mt-1 block">{selectedCandidateModal.aiScore} / 100</span>
                                <span className="text-xs text-slate-500 mt-1 block font-medium">คำนวณจากค่าน้ำหนัก Criteria</span>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">สถานะการคัดเลือก</span>
                                <span className="text-base font-bold text-slate-800 mt-2 block">{selectedCandidateModal.status}</span>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">โมเดล AI ที่ใช้วิเคราะห์</span>
                                <span className="text-sm font-semibold text-slate-700 mt-2 block">{selectedCandidateModal.modelUsed}</span>
                            </div>
                        </div>

                        {/* Criteria & SubCriteria Detailed Breakdown */}
                        <div className="space-y-4">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-[#4169E1]" />
                                รายละเอียดคะแนนในแต่ละ Criteria & Sub-Criteria พร้อมค่าน้ำหนัก
                            </h3>

                            {selectedCandidateModal.criteriaBreakdown.length === 0 ? (
                                <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 text-sm">
                                    ยังไม่มีข้อมูล Criteria breakdown ที่ถูกประเมินโดย AI
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {selectedCandidateModal.criteriaBreakdown.map((crit, idx) => {
                                        const level = crit.evaluated_level || "ปานกลาง (50%)";
                                        const isGood = level.includes("ดี") || level.includes("100%");
                                        const isPoor = level.includes("แย่") || level.includes("0%");

                                        return (
                                            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                                                {/* Criterion Title Header */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                                    <div>
                                                        <span className="text-xs font-bold text-[#4169E1] bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                            เกณฑ์หลัก #{idx + 1}
                                                        </span>
                                                        <h4 className="text-base font-bold text-slate-800 mt-1">
                                                            {crit.main_criterion_title}
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <span className="text-xs text-slate-400 block font-medium">ค่าน้ำหนัก</span>
                                                            <span className="text-sm font-bold text-indigo-600 font-mono">{crit.weight || crit.max_score}%</span>
                                                        </div>
                                                        <div className="text-right pl-3 border-l border-slate-200">
                                                            <span className="text-xs text-slate-400 block font-medium">คะแนนที่ได้</span>
                                                            <span className="text-base font-extrabold text-slate-800 font-mono">{crit.score} / {crit.max_score}</span>
                                                        </div>
                                                        <span className={`ml-2 px-3 py-1 rounded-xl text-xs font-bold ${
                                                            isGood ? "bg-emerald-100 text-emerald-700" : isPoor ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                                                        }`}>
                                                            {level}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Sub Criteria section */}
                                                {crit.sub_criteria && crit.sub_criteria.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                            เกณฑ์ย่อยที่ใช้คำนวณ (Sub-Criteria)
                                                        </h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {crit.sub_criteria.map((sc, sIdx) => (
                                                                <div key={sIdx} className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                                            <Check className="w-3.5 h-3.5 text-indigo-500" />
                                                                            {sc.title}
                                                                        </span>
                                                                        <span className="text-[11px] font-extrabold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                                            น้ำหนัก {sc.weight}%
                                                                        </span>
                                                                    </div>
                                                                    {sc.description && (
                                                                        <p className="text-slate-500 text-xs leading-relaxed pl-5">
                                                                            {sc.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Reason Box */}
                                                {crit.reason && (
                                                    <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-100 text-xs space-y-1">
                                                        <span className="font-bold text-indigo-700 flex items-center gap-1.5">
                                                            <Sparkles className="w-3.5 h-3.5 text-[#4169E1]" />
                                                            ผลประเมินและการวิเคราะห์ของ AI:
                                                        </span>
                                                        <p className="text-slate-700 leading-relaxed font-medium">
                                                            {crit.reason}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Additional Strengths / Analysis Text */}
                        {selectedCandidateModal.strengths && (
                            <div className="space-y-2 border-t border-slate-100 pt-4">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                    ผลสรุปการประเมินโดยละเอียด (AI Markdown Output)
                                </h3>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-600 max-h-60 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed">
                                    {selectedCandidateModal.strengths.replace(/^\[SCORES:\s*.*?\]\s*/, "")}
                                </div>
                            </div>
                        )}

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                            <button
                                onClick={() => setSelectedCandidateModal(null)}
                                className="px-5 py-2.5 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-sm transition-all"
                            >
                                ปิดหน้าต่าง
                            </button>
                            <Link
                                to="/hr/screening"
                                className="px-5 py-2.5 rounded-xl text-white bg-[#4169E1] hover:bg-[#3152c4] font-bold text-sm transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                ไปหน้าคัดกรอง AI
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
