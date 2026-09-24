import { useState, useEffect } from "react";
import { Search, Sparkles, Eye, RefreshCw, ChevronDown, ChevronUp, X, Award, FileText, BarChart3, Check, Briefcase, ExternalLink, Download, Edit3, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient, { getBackendBaseUrl } from "../../services/apiClient";
import { getalljobs, updateApplicationStatus, updateApplicationScreening } from "../../services/jobPositionService";
import rules from "../../components/rules/rule";

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
    resumeUrl: string;
    resumeText: string;
    transcriptUrl: string;
    transcriptText: string;
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
    const [selectedPosition, setSelectedPosition] = useState<string>("ทั้งหมด");

    // UI Expand and Modal states
    const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
    const [selectedCandidateModal, setSelectedCandidateModal] = useState<CandidateItem | null>(null);
    const [viewingResumeModal, setViewingResumeModal] = useState<CandidateItem | null>(null);
    const [activeDocTab, setActiveDocTab] = useState<"resume" | "transcript">("resume");
    const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
    const [editingScoreValue, setEditingScoreValue] = useState<number | string>(0);

    const getCleanFileUrl = (url: string) => {
        if (!url) return "";
        let clean = url.replace(/\\/g, "/");
        if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
            if (!clean.startsWith("/")) clean = "/" + clean;
            return `${getBackendBaseUrl()}${clean}`;
        }
        return clean;
    };

    const handleStatusChange = async (candidateId: string, newStatus: string) => {
        try {
            await updateApplicationStatus(candidateId, newStatus);
            setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));
            if (selectedCandidateModal && selectedCandidateModal.id === candidateId) {
                setSelectedCandidateModal(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (err) {
            console.error("Failed to update candidate status:", err);
            alert("เกิดข้อผิดพลาดในการอัปเดตสถานะผู้สมัคร");
        }
    };

    const handleScoreChange = async (candidateId: string, newScore: number) => {
        const target = candidates.find(c => c.id === candidateId);
        if (!target) return;

        const validScore = Math.max(0, Math.min(100, Math.round(newScore)));
        try {
            await updateApplicationScreening(
                parseInt(candidateId),
                validScore,
                target.strengths || "",
                target.modelUsed || "typhoon2.5-qwen3-4b",
                target.resumeText || ""
            );

            setCandidates(prev => {
                const updated = prev.map(c => c.id === candidateId ? { ...c, aiScore: validScore } : c);
                updated.sort((a, b) => b.aiScore - a.aiScore);
                return updated;
            });

            if (selectedCandidateModal && selectedCandidateModal.id === candidateId) {
                setSelectedCandidateModal(prev => prev ? { ...prev, aiScore: validScore } : null);
            }
        } catch (err) {
            console.error("Failed to update PTS score:", err);
            alert("เกิดข้อผิดพลาดในการบันทึกคะแนน PTS");
        }
    };

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

                    let rUrl = app.resume_url || app.ResumeURL || app.resumeUrl || cand.resume_url || cand.ResumeURL || cand.resumeUrl || "";

                    if (!rUrl && Array.isArray(app.documents) && app.documents.length > 0) {
                        const resumeDoc = app.documents.find((d: any) =>
                            (d.document_type && d.document_type.toLowerCase().includes("resume")) ||
                            (d.file_name && d.file_name.toLowerCase().includes("resume")) ||
                            (d.title && d.title.toLowerCase().includes("resume"))
                        ) || app.documents[0];
                        if (resumeDoc && (resumeDoc.file_url || resumeDoc.FileURL)) {
                            rUrl = resumeDoc.file_url || resumeDoc.FileURL;
                        }
                    }

                    let rText = app.resume_text || app.ResumeText || app.resumeText || cand.resume_text || cand.ResumeText || cand.resumeText || aiScreening.ocr_text || aiScreening.OCRText || "";

                    if (!rText && (aiScreening.strengths || parsedAnalysisObj?.raw_markdown)) {
                        rText = (aiScreening.strengths || parsedAnalysisObj?.raw_markdown || "").replace(/^\[SCORES:\s*.*?\]\s*/, "");
                    }

                    let tUrl = app.transcript_url || app.TranscriptURL || app.transcriptUrl || cand.transcript_url || cand.TranscriptURL || cand.transcriptUrl || "";

                    if (!tUrl && Array.isArray(app.documents) && app.documents.length > 0) {
                        const transcriptDoc = app.documents.find((d: any) =>
                            (d.document_type && (d.document_type.toLowerCase().includes("transcript") || d.document_type.includes("ใบแสดงผล"))) ||
                            (d.file_name && (d.file_name.toLowerCase().includes("transcript") || d.file_name.includes("ใบแสดงผล") || d.file_name.includes("ผลการเรียน"))) ||
                            (d.title && (d.title.toLowerCase().includes("transcript") || d.title.includes("ใบแสดงผล") || d.title.includes("ผลการเรียน")))
                        );
                        if (transcriptDoc && (transcriptDoc.file_url || transcriptDoc.FileURL)) {
                            tUrl = transcriptDoc.file_url || transcriptDoc.FileURL;
                        }
                    }

                    let tText = app.transcript_text || app.TranscriptText || app.transcriptText || cand.transcript_text || cand.TranscriptText || cand.transcriptText || "";

                    return {
                        id: app.ID ? app.ID.toString() : app.id?.toString() || "0",
                        name: name,
                        email: rules.email.sanitize(cand.email || parsedAnalysisObj?.candidate_basic_info?.email || "-"),
                        phone: rules.phone.format(cand.phone || parsedAnalysisObj?.candidate_basic_info?.phone || "-") || (cand.phone || "-"),
                        position: matchedJob?.title || app.position || "ไม่ระบุตำแหน่ง",
                        aiScore: Math.round(finalPTS),
                        status: app.status || "รอพิจารณา",
                        appliedDate: dateStr,
                        analysisObj: parsedAnalysisObj,
                        criteriaBreakdown: criteriaBreakdown,
                        strengths: aiScreening.strengths || aiScreening.Strengths || "",
                        modelUsed: aiScreening.model_used || aiScreening.ModelUsed || "typhoon2.5-qwen3-4b",
                        rawApp: app,
                        resumeUrl: rUrl,
                        resumeText: rText,
                        transcriptUrl: tUrl,
                        transcriptText: tText
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

    const uniquePositions = Array.from(new Set(candidates.map(c => c.position).filter(Boolean)));

    const filtered = candidates.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.position.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase());
        const matchTab = activeTab === "ทั้งหมด" ||
            c.status === activeTab ||
            (activeTab === "ผ่าน" && (c.status === "ผ่าน" || c.status === "ผ่านการคัดเลือก" || c.status === "approved" || c.status === "accepted" || c.status === "passed" || c.status === "pass")) ||
            (activeTab === "รอพิจารณา" && (c.status === "รอพิจารณา" || c.status === "pending" || c.status === "waiting")) ||
            (activeTab === "ไม่ผ่าน" && (c.status === "ไม่ผ่าน" || c.status === "ปฏิเสธ" || c.status === "rejected" || c.status === "failed" || c.status === "fail")) ||
            (activeTab === "รอนัดสัมภาษณ์" && (c.status === "shortlisted" || c.status === "รอนัดสัมภาษณ์")) ||
            (activeTab === "นัดสัมภาษณ์แล้ว" && (c.status === "interview" || c.status === "นัดสัมภาษณ์แล้ว" || c.status === "interviewed"));
        const matchPosition = selectedPosition === "ทั้งหมด" || c.position === selectedPosition;
        return matchSearch && matchTab && matchPosition;
    });

    const toggleExpandRow = (id: string) => {
        setExpandedCandidateId(prev => prev === id ? null : id);
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">จัดลำดับและโปรไฟล์ผู้สมัคร (PTS Ranking)</h1>
                        <span className="bg-indigo-50 text-[#4169E1] text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                            {candidates.length} ผู้สมัคร
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        รายชื่อผู้สมัครทั้งหมด เรียงลำดับตามคะแนน PTS พร้อมรายละเอียดเกณฑ์การประเมิน (Criteria, Sub-Criteria & Weights)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCandidates}
                        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-200/80 transition-all text-sm shadow-2xs cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                        รีเฟรชข้อมูล
                    </button>
                    <Link
                        to="/hr/screening"
                        className="flex items-center gap-2 bg-gradient-to-r from-[#4169E1] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200 text-sm cursor-pointer"
                    >
                        <Sparkles className="w-4 h-4" />
                        คัดกรอง Resume ด้วย AI
                    </Link>
                </div>
            </div>

            {/* KPI Executive Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">ผู้สมัครทั้งหมด</span>
                        <span className="text-2xl font-black text-slate-800 font-mono mt-0.5 block">{candidates.length} คน</span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4169E1] flex items-center justify-center font-bold">
                        <Briefcase className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">ผ่านการคัดเลือก</span>
                        <span className="text-2xl font-black text-emerald-600 font-mono mt-0.5 block">
                            {candidates.filter(c => c.status === "ผ่าน" || c.status === "ผ่านการคัดเลือก" || c.status === "approved" || c.status === "accepted" || c.status === "passed" || c.status === "pass").length} คน
                        </span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        <Check className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">รอพิจารณา / รอ</span>
                        <span className="text-2xl font-black text-amber-600 font-mono mt-0.5 block">
                            {candidates.filter(c => c.status === "รอพิจารณา" || c.status === "pending" || c.status === "waiting").length} คน
                        </span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">ไม่ผ่าน / ปฏิเสธ</span>
                        <span className="text-2xl font-black text-rose-600 font-mono mt-0.5 block">
                            {candidates.filter(c => c.status === "ไม่ผ่าน" || c.status === "ปฏิเสธ" || c.status === "rejected" || c.status === "failed" || c.status === "fail").length} คน
                        </span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold">
                        <X className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                {/* Left: Position Category Dropdown & Filter Status Tabs */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Dropdown จัดหมวดหมู่งานผู้สมัคร */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 font-bold shadow-xs">
                        <Briefcase className="w-4 h-4 text-[#4169E1] shrink-0" />
                        <span className="text-slate-400 font-normal shrink-0">หมวดหมู่งาน:</span>
                        <select
                            value={selectedPosition}
                            onChange={e => setSelectedPosition(e.target.value)}
                            className="bg-transparent outline-none cursor-pointer text-slate-800 font-bold max-w-[220px] truncate"
                        >
                            <option value="ทั้งหมด">ตำแหน่งงานทั้งหมด ({candidates.length} คน)</option>
                            {uniquePositions.map((pos, idx) => {
                                const count = candidates.filter(c => c.position === pos).length;
                                return (
                                    <option key={idx} value={pos}>
                                        {pos} ({count} คน)
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Filter Status Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
                        {["ทั้งหมด", "ผ่าน", "รอพิจารณา", "ไม่ผ่าน", "รอนัดสัมภาษณ์", "นัดสัมภาษณ์แล้ว"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === tab
                                        ? "bg-indigo-50 text-[#4169E1] border border-indigo-100 shadow-xs"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                    }`}
                            >
                                {tab === "interview" ? "นัดสัมภาษณ์แล้ว" : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Search Input */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 shrink-0">
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
                                <th className="py-3.5 px-6">ผู้สมัคร</th>
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
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-slate-600 font-semibold">{c.position}</td>
                                                <td className="py-4 px-6">
                                                    {editingScoreId === c.id ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                value={editingScoreValue}
                                                                onChange={e => setEditingScoreValue(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === "Enter") {
                                                                        const val = parseInt(String(editingScoreValue));
                                                                        if (!isNaN(val)) handleScoreChange(c.id, val);
                                                                        setEditingScoreId(null);
                                                                    } else if (e.key === "Escape") {
                                                                        setEditingScoreId(null);
                                                                    }
                                                                }}
                                                                className="w-16 px-2 py-1 bg-white border-2 border-[#4169E1] rounded-lg text-sm font-black font-mono text-slate-800 outline-none text-center shadow-xs"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const val = parseInt(String(editingScoreValue));
                                                                    if (!isNaN(val)) handleScoreChange(c.id, val);
                                                                    setEditingScoreId(null);
                                                                }}
                                                                className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all cursor-pointer"
                                                                title="บันทึกคะแนน"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingScoreId(null)}
                                                                className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-all cursor-pointer"
                                                                title="ยกเลิก"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group">
                                                            <div className="w-20 bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-100 shrink-0">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${c.aiScore >= 80
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
                                                            <div className="flex items-center gap-1">
                                                                <span className={`font-extrabold text-sm font-mono ${c.aiScore >= 80
                                                                        ? "text-emerald-600"
                                                                        : c.aiScore >= 50
                                                                            ? "text-amber-600"
                                                                            : c.aiScore > 0
                                                                                ? "text-rose-600"
                                                                                : "text-slate-400"
                                                                    }`}>
                                                                    {c.aiScore} PTS
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingScoreId(c.id);
                                                                        setEditingScoreValue(c.aiScore);
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-50 text-slate-400 hover:text-[#4169E1] rounded-md transition-all cursor-pointer"
                                                                    title="คลิกเพื่อปรับแก้ไขคะแนน PTS"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <div className="relative inline-block">
                                                            <select
                                                                value={
                                                                    c.status === "approved" || c.status === "accepted" || c.status === "passed" || c.status === "pass" || c.status === "ผ่านการคัดเลือก" ? "ผ่าน" :
                                                                        c.status === "rejected" || c.status === "failed" || c.status === "fail" || c.status === "ปฏิเสธ" ? "ไม่ผ่าน" :
                                                                            c.status === "pending" || c.status === "waiting" || c.status === "รอพิจารณา" ? "รอพิจารณา" :
                                                                                c.status === "interview" || c.status === "interviewed" ? "นัดสัมภาษณ์แล้ว" : c.status
                                                                }
                                                                onChange={e => handleStatusChange(c.id, e.target.value)}
                                                                className={`appearance-none outline-none cursor-pointer pl-3 pr-7 py-1 rounded-full text-xs font-extrabold transition-all border shadow-2xs ${c.status === "ผ่าน" || c.status === "ผ่านการคัดเลือก" || c.status === "approved" || c.status === "accepted" || c.status === "passed" || c.status === "pass"
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                                        : c.status === "รอพิจารณา" || c.status === "pending" || c.status === "waiting"
                                                                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                                            : c.status === "ไม่ผ่าน" || c.status === "ปฏิเสธ" || c.status === "rejected" || c.status === "failed" || c.status === "fail"
                                                                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                                                                : c.status === "interview" || c.status === "นัดสัมภาษณ์แล้ว"
                                                                                    ? "bg-indigo-50 text-[#4169E1] border-indigo-200 hover:bg-indigo-100"
                                                                                    : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                                                    }`}
                                                            >
                                                                <option value="ผ่าน">🟢 ผ่าน</option>
                                                                <option value="รอพิจารณา">🟡 รอพิจารณา</option>
                                                                <option value="ไม่ผ่าน">🔴 ไม่ผ่าน</option>
                                                                <option value="รอนัดสัมภาษณ์">🟣 รอนัดสัมภาษณ์</option>
                                                                <option value="นัดสัมภาษณ์แล้ว">🔵 นัดสัมภาษณ์แล้ว</option>
                                                            </select>
                                                            <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                                        </div>

                                                        {(c.status === "รอนัดสัมภาษณ์" || c.status === "shortlisted") && (
                                                            <Link
                                                                to="/hr/interviews"
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 hover:underline pl-1"
                                                                title="ไปหน้านัดหมายสัมภาษณ์เพื่อระบุวันเวลา"
                                                            >
                                                                <Sparkles className="w-3 h-3 text-purple-500" />
                                                                <span>ไปตั้งเวลาสัมภาษณ์</span>
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-slate-400 text-xs">{c.appliedDate}</td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setActiveDocTab("resume");
                                                                setViewingResumeModal(c);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 transition-all cursor-pointer shadow-2xs"
                                                            title="เปิดดูเอกสาร Resume หรือเนื้อหาประวัติผู้สมัคร"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                                                            <span>ดู Resume</span>
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setActiveDocTab("transcript");
                                                                setViewingResumeModal(c);
                                                            }}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                                                                c.transcriptUrl || c.transcriptText
                                                                    ? "bg-blue-50 hover:bg-blue-100 text-[#4169E1] border-blue-200/80"
                                                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200 opacity-70"
                                                            }`}
                                                            title="เปิดดูเอกสาร Transcript / ใบแสดงผลการเรียน"
                                                        >
                                                            <GraduationCap className="w-3.5 h-3.5 text-[#4169E1]" />
                                                            <span>ดู Transcript</span>
                                                        </button>

                                                        <button
                                                            onClick={() => toggleExpandRow(c.id)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${isExpanded
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
                                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${isGood
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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setActiveDocTab("resume");
                                        setViewingResumeModal(selectedCandidateModal);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 transition-all cursor-pointer shadow-2xs"
                                >
                                    <FileText className="w-4 h-4 text-amber-600" />
                                    <span>เปิดดู Resume</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveDocTab("transcript");
                                        setViewingResumeModal(selectedCandidateModal);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                                        selectedCandidateModal.transcriptUrl || selectedCandidateModal.transcriptText
                                            ? "bg-blue-50 hover:bg-blue-100 text-[#4169E1] border-blue-200/80"
                                            : "bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200 opacity-70"
                                    }`}
                                >
                                    <GraduationCap className="w-4 h-4 text-[#4169E1]" />
                                    <span>เปิดดู Transcript</span>
                                </button>
                                <button
                                    onClick={() => setSelectedCandidateModal(null)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Top Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl p-4 border border-indigo-100 text-center">
                                <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider block">คะแนน PTS สรุป (ปรับแก้ไขได้)</span>
                                {editingScoreId === selectedCandidateModal.id ? (
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={editingScoreValue}
                                            onChange={e => setEditingScoreValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") {
                                                    const val = parseInt(String(editingScoreValue));
                                                    if (!isNaN(val)) handleScoreChange(selectedCandidateModal.id, val);
                                                    setEditingScoreId(null);
                                                } else if (e.key === "Escape") {
                                                    setEditingScoreId(null);
                                                }
                                            }}
                                            className="w-20 px-2 py-1 bg-white border-2 border-[#4169E1] rounded-xl text-xl font-black font-mono text-slate-800 outline-none text-center shadow-xs"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => {
                                                const val = parseInt(String(editingScoreValue));
                                                if (!isNaN(val)) handleScoreChange(selectedCandidateModal.id, val);
                                                setEditingScoreId(null);
                                            }}
                                            className="p-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all cursor-pointer"
                                            title="บันทึกคะแนน"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingScoreId(null)}
                                            className="p-1.5 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
                                            title="ยกเลิก"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <span className="text-3xl font-black text-[#4169E1] font-mono">{selectedCandidateModal.aiScore} / 100</span>
                                        <button
                                            onClick={() => {
                                                setEditingScoreId(selectedCandidateModal.id);
                                                setEditingScoreValue(selectedCandidateModal.aiScore);
                                            }}
                                            className="p-1.5 hover:bg-indigo-100/60 text-[#4169E1] rounded-xl transition-all cursor-pointer"
                                            title="คลิกเพื่อปรับแก้ไขคะแนน PTS"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <span className="text-xs text-slate-500 mt-1 block font-medium">คำนวณจากค่าน้ำหนัก Criteria</span>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">เปลี่ยนสถานะผู้สมัคร</span>
                                <select
                                    value={
                                        selectedCandidateModal.status === "approved" || selectedCandidateModal.status === "ผ่านการคัดเลือก" ? "ผ่าน" :
                                            selectedCandidateModal.status === "rejected" || selectedCandidateModal.status === "ปฏิเสธ" ? "ไม่ผ่าน" :
                                                selectedCandidateModal.status === "pending" || selectedCandidateModal.status === "รอพิจารณา" ? "รอพิจารณา" :
                                                    selectedCandidateModal.status === "interview" ? "นัดสัมภาษณ์แล้ว" : selectedCandidateModal.status
                                    }
                                    onChange={e => handleStatusChange(selectedCandidateModal.id, e.target.value)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border outline-none cursor-pointer text-center ${selectedCandidateModal.status === "ผ่าน" || selectedCandidateModal.status === "ผ่านการคัดเลือก" || selectedCandidateModal.status === "approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                            : selectedCandidateModal.status === "รอพิจารณา" || selectedCandidateModal.status === "รอพิจารณา" || selectedCandidateModal.status === "pending"
                                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                : selectedCandidateModal.status === "ไม่ผ่าน" || selectedCandidateModal.status === "ปฏิเสธ" || selectedCandidateModal.status === "rejected"
                                                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                                    : selectedCandidateModal.status === "interview" || selectedCandidateModal.status === "นัดสัมภาษณ์แล้ว"
                                                        ? "bg-indigo-50 text-[#4169E1] border-indigo-200 hover:bg-indigo-100"
                                                        : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                        }`}
                                >
                                    <option value="ผ่าน">🟢 ผ่าน</option>
                                    <option value="รอพิจารณา">🟡 รอพิจารณา</option>
                                    <option value="ไม่ผ่าน">🔴 ไม่ผ่าน</option>
                                    <option value="รอนัดสัมภาษณ์">🟣 รอนัดสัมภาษณ์</option>
                                    <option value="นัดสัมภาษณ์แล้ว">🔵 นัดสัมภาษณ์แล้ว</option>
                                </select>
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
                                                        <span className={`ml-2 px-3 py-1 rounded-xl text-xs font-bold ${isGood ? "bg-emerald-100 text-emerald-700" : isPoor ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
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
            {/* Document Viewer Modal (Resume & Transcript) */}
            {viewingResumeModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl border ${activeDocTab === "resume" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-[#4169E1] border-blue-100"}`}>
                                    {activeDocTab === "resume" ? <FileText className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">
                                        {activeDocTab === "resume" ? "Resume (ประวัติผู้สมัคร)" : "Transcript (ใบแสดงผลการเรียน)"} - {viewingResumeModal.name}
                                    </h2>
                                    <p className="text-slate-400 text-xs mt-0.5">
                                        ตำแหน่งที่สมัคร: <span className="font-semibold text-slate-700">{viewingResumeModal.position}</span> • {viewingResumeModal.email}
                                    </p>
                                </div>
                            </div>

                            {/* Tab Switcher & Action buttons */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-slate-200/70 p-1 rounded-xl">
                                    <button
                                        onClick={() => setActiveDocTab("resume")}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeDocTab === "resume"
                                                ? "bg-amber-500 text-white shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Resume</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveDocTab("transcript")}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeDocTab === "transcript"
                                                ? "bg-[#4169E1] text-white shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        <GraduationCap className="w-3.5 h-3.5" />
                                        <span>Transcript</span>
                                    </button>
                                </div>

                                {((activeDocTab === "resume" && viewingResumeModal.resumeUrl) || (activeDocTab === "transcript" && viewingResumeModal.transcriptUrl)) && (
                                    <a
                                        href={getCleanFileUrl(activeDocTab === "resume" ? viewingResumeModal.resumeUrl : viewingResumeModal.transcriptUrl)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4169E1] hover:bg-[#3152c4] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-100"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        เปิดไฟล์เต็มในแท็บใหม่
                                    </a>
                                )}
                                <button
                                    onClick={() => setViewingResumeModal(null)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
                            {activeDocTab === "resume" ? (
                                <>
                                    {/* File Preview Section if resumeUrl exists */}
                                    {viewingResumeModal.resumeUrl ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <FileText className="w-4 h-4 text-amber-500" />
                                                    เอกสาร Resume ผู้สมัคร ({viewingResumeModal.resumeUrl.split("/").pop() || "เอกสารแนบ"})
                                                </h3>
                                                <a
                                                    href={getCleanFileUrl(viewingResumeModal.resumeUrl)}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    ดาวน์โหลดไฟล์
                                                </a>
                                            </div>

                                            {/* Embed viewer if PDF or Image */}
                                            {getCleanFileUrl(viewingResumeModal.resumeUrl).toLowerCase().endsWith(".pdf") ? (
                                                <div className="w-full h-[550px] rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100">
                                                    <iframe
                                                        src={getCleanFileUrl(viewingResumeModal.resumeUrl)}
                                                        className="w-full h-full border-none"
                                                        title="Resume PDF Preview"
                                                    />
                                                </div>
                                            ) : getCleanFileUrl(viewingResumeModal.resumeUrl).match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                                                <div className="w-full flex justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200">
                                                    <img
                                                        src={getCleanFileUrl(viewingResumeModal.resumeUrl)}
                                                        alt="Resume Preview"
                                                        className="max-h-[600px] object-contain rounded-xl shadow-md"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="p-6 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-center space-y-3">
                                                    <p className="text-sm font-bold text-amber-800">
                                                        ไฟล์นี้อยู่ในรูปแบบ {viewingResumeModal.resumeUrl.split(".").pop()?.toUpperCase() || "เอกสาร"}
                                                    </p>
                                                    <a
                                                        href={getCleanFileUrl(viewingResumeModal.resumeUrl)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#4169E1] text-white rounded-xl text-xs font-bold shadow-sm"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        คลิกที่นี่เพื่อเปิดไฟล์ในเบราว์เซอร์
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}

                                    {/* Text Content Section if resumeText exists */}
                                    {viewingResumeModal.resumeText ? (
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                                เนื้อหาข้อความใน Resume (Resume OCR / Text)
                                            </h3>
                                            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-700 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                                                {viewingResumeModal.resumeText}
                                            </div>
                                        </div>
                                    ) : !viewingResumeModal.resumeUrl && (
                                        <div className="py-16 text-center text-slate-400 space-y-2">
                                            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                                            <p className="font-bold text-slate-600">ไม่พบไฟล์แนบ Resume หรือข้อความสกัดในระบบ</p>
                                            <p className="text-xs">ผู้สมัครอาจสมัครผ่านระบบโดยไม่ได้อัปโหลดไฟล์ Resume หรือกรอกข้อความ</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* File Preview Section if transcriptUrl exists */}
                                    {viewingResumeModal.transcriptUrl ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <GraduationCap className="w-4 h-4 text-[#4169E1]" />
                                                    เอกสาร Transcript (ใบแสดงผลการเรียน) ({viewingResumeModal.transcriptUrl.split("/").pop() || "เอกสารแนบ"})
                                                </h3>
                                                <a
                                                    href={getCleanFileUrl(viewingResumeModal.transcriptUrl)}
                                                    download
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs font-bold text-[#4169E1] hover:underline flex items-center gap-1"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    ดาวน์โหลดไฟล์
                                                </a>
                                            </div>

                                            {/* Embed viewer if PDF or Image */}
                                            {getCleanFileUrl(viewingResumeModal.transcriptUrl).toLowerCase().endsWith(".pdf") ? (
                                                <div className="w-full h-[550px] rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100">
                                                    <iframe
                                                        src={getCleanFileUrl(viewingResumeModal.transcriptUrl)}
                                                        className="w-full h-full border-none"
                                                        title="Transcript PDF Preview"
                                                    />
                                                </div>
                                            ) : getCleanFileUrl(viewingResumeModal.transcriptUrl).match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                                                <div className="w-full flex justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200">
                                                    <img
                                                        src={getCleanFileUrl(viewingResumeModal.transcriptUrl)}
                                                        alt="Transcript Preview"
                                                        className="max-h-[600px] object-contain rounded-xl shadow-md"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="p-6 bg-blue-50/80 rounded-2xl border border-blue-200/80 text-center space-y-3">
                                                    <p className="text-sm font-bold text-blue-900">
                                                        ไฟล์นี้อยู่ในรูปแบบ {viewingResumeModal.transcriptUrl.split(".").pop()?.toUpperCase() || "เอกสาร"}
                                                    </p>
                                                    <a
                                                        href={getCleanFileUrl(viewingResumeModal.transcriptUrl)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#4169E1] text-white rounded-xl text-xs font-bold shadow-sm"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        คลิกที่นี่เพื่อเปิดไฟล์ในเบราว์เซอร์
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}

                                    {/* Text Content Section if transcriptText exists */}
                                    {viewingResumeModal.transcriptText ? (
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                                เนื้อหาข้อความใน Transcript (Transcript OCR / Text)
                                            </h3>
                                            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-700 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                                                {viewingResumeModal.transcriptText}
                                            </div>
                                        </div>
                                    ) : !viewingResumeModal.transcriptUrl && (
                                        <div className="py-16 text-center text-slate-400 space-y-2">
                                            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
                                            <p className="font-bold text-slate-600">ไม่พบไฟล์แนบ Transcript หรือข้อความสกัดผลการเรียนในระบบ</p>
                                            <p className="text-xs">ผู้สมัครอาจสมัครผ่านระบบโดยไม่ได้แนบไฟล์ Transcript (ใบแสดงผลการเรียน)</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-white">
                            <button
                                onClick={() => setViewingResumeModal(null)}
                                className="px-5 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-sm transition-all cursor-pointer"
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
