import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Upload, FileText, Briefcase, Sparkles, X, ChevronDown, ChevronUp, Wifi, WifiOff, RefreshCw, Copy, Check, Search, Trash2, Square } from "lucide-react";
import { getalljobs, getapplications, updateApplicationScreening, deleteapplication, applyjob } from "../../services/jobPositionService";
import apiClient, { getTyphoonApiUrl, getBackendBaseUrl } from "../../services/apiClient";
import AIModelDropdown, { AVAILABLE_AI_MODELS } from "../../components/common/AIModelDropdown";

const TYPHOON_API = getTyphoonApiUrl();

const isInvalidOrRandomName = (name: string): boolean => {
    if (!name) return true;
    const clean = name.trim();
    if (clean.length < 2) return true;
    if (/\d/.test(clean)) return true;
    if (/^(test|dummy|sample|asdf|qwerty|null|undefined|123|abc|xxx|\.|\?|-)+$/i.test(clean)) return true;
    if (!/[\u0E00-\u0E7Fa-zA-Z]/.test(clean)) return true;
    return false;
};

const SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญด้าน HR Recruiter วิเคราะห์และประเมิน Resume ผู้สมัครงานภาษาไทยเทียบกับลักษณะงาน (JD) และเกณฑ์การคัดเลือก (Criteria) อย่างละเอียดและเที่ยงตรง

หลักการวิเคราะห์และการประเมินคะแนน (สไตล์ Typhoon HR Recruiter):
1. ในช่อง "เหตุผล" ให้เขียนวิเคราะห์แบบ HR มืออาชีพอย่างละเอียด เปรียบเทียบทักษะ/ประสบการณ์ใน Resume กับความต้องการของประกาศงาน (JD)
2. หากเกณฑ์หลักประเมินได้ระดับ "ดี (100%)" ให้เขียนเฉพาะจุดแข็ง ทักษะ และหลักฐานใน Resume ที่สนับสนุนคะแนนเต็ม 100% เท่านั้น (ห้ามใส่เกณฑ์ย่อยที่ไม่เกี่ยวข้อง หรือระบุว่าขาดทักษะย่อยอื่นที่ไม่ได้เลือกลงมาในช่องเหตุผลเด็ดขาด)
3. สำหรับเกณฑ์หลักแต่ละข้อ (Main Criteria) AI จะต้องประเมินและเลือกระดับเพียง 1 ใน 3 ระดับนี้เท่านั้น:
   - "ดี (100%)" : มีทักษะและประสบการณ์ตรงตามประกาศงานอย่างชัดเจน (ได้คะแนนเต็ม เช่น 35/35, 25/25, 20/20, 5/5)
   - "ปานกลาง (50%)" : มีความรู้พื้นฐาน หรือมีประสบการณ์ใกล้เคียงแต่ยังขาดทักษะบางส่วน (ได้ครึ่งหนึ่ง เช่น 18/35, 13/25, 10/20, 3/5)
   - "แย่ (0%)" : ไม่มีข้อมูลใน Resume หรือทักษะไม่ตรงตามประกาศงานอย่างชัดเจน (ได้ 0 คะแนน เช่น 0/35, 0/25, 0/20, 0/5)
4. ข้อห้ามเด็ดขาด (Strict Constraint):
   - ห้ามคิดคะแนนเป็นเศษส่วนทศนิยม หรือเฉลี่ยเกณฑ์ย่อยเป็นเปอร์เซ็นต์มั่วๆ เช่น 83.33%, 66.66% หรือคิดคะแนนก้ำกึ่งอย่าง 21/25, 23/35, 8/25 เด็ดขาด!
   - คะแนนของเกณฑ์หลักทุกข้อต้องเลือกเพียง 100%, 50%, หรือ 0% ของคะแนนเต็มเกณฑ์นั้นเท่านั้น!
5. คะแนนรวมในบรรทัด "**รวมทั้งหมด**" ต้องเป็นผลรวมคะแนนของทุกเกณฑ์หลักบวกกันจริงๆ เสมอ (เป็นจำนวนเต็มเท่านั้น)

กติกาการตอบกลับ (Strict Output Format):
1. ต้องตอบกลับเฉพาะ 2 หัวข้อนี้เท่านั้นเรียงตามลำดับ ห้ามเพิ่มหัวข้ออื่นเด็ดขาด:
   - "## 1. ข้อมูลผู้สมัคร"
   - "## 2. คะแนนรวม (0–100)"

2. ในส่วน "## 1. ข้อมูลผู้สมัคร" ให้แสดงเฉพาะ 2 บรรทัดนี้เท่านั้น:
**ชื่อ-สกุล**: [ชื่อ-สกุล จาก DB หรือ Resume]
**อีเมล**: [อีเมล จาก DB หรือ Resume]

---

3. ในส่วน "## 2. คะแนนรวม (0–100)" ให้ประเมินและแสดงผลในรูปแบบตาราง Markdown เท่านั้น:
| เกณฑ์ | คะแนน | เหตุผล |
|---|---|---|
| [ชื่อเกณฑ์หลัก] | [คะแนนเต็ม 100% / คะแนนครึ่งหนึ่ง 50% / หรือ 0]/[คะแนนเต็ม] | [บทวิเคราะห์ HR อย่างละเอียด สรุปสิ่งที่พบใน Resume เทียบกับ JD พร้อมระบุระดับประเมิน ดี (100%), ปานกลาง (50%), หรือ แย่ (0%) ให้ชัดเจน] |
| **รวมทั้งหมด** | [ผลรวมคะแนนทุกเกณฑ์]/100 | [สรุปภาพรวมผู้สมัคร 1-2 บรรทัด] |

ข้อห้ามสำคัญ:
- ห้ามย่อหรือเปลี่ยนชื่อเกณฑ์หลักในตารางเด็ดขาด
- ให้เขียนเหตุผลให้อ่านง่าย มีความเป็นธรรมชาติของ HR วิเคราะห์ผู้สมัครจริง`;

interface AnalysisResult {
    resumeName: string;
    content: string;
    streaming: boolean;
}

export default function ScreeningPage() {
    const location = useLocation();
    const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
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
    const [activeMode, setActiveMode] = useState<"single" | "batch">("batch");
    const [batchRoles, setBatchRoles] = useState<string[]>([]);
    const [selectedBatchRole, setSelectedBatchRole] = useState<string>("");
    const [batchResults, setBatchResults] = useState<any[]>([]);
    const [batchLoading, setBatchLoading] = useState(false);

    // GORM integration states
    const [applicants, setApplicants] = useState<any[]>([]);
    const [selectedAppIds, setSelectedAppIds] = useState<number[]>([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [batchAnalyzing, setBatchAnalyzing] = useState(false);
    const [analyzingStates, setAnalyzingStates] = useState<{ [key: number]: "idle" | "ocr" | "ai" | "saving" | "done" | "error" }>({});

    const toggleSelectApplicant = (appId: number) => {
        setSelectedAppIds(prev =>
            prev.includes(appId)
                ? prev.filter(id => id !== appId)
                : [...prev, appId]
        );
    };

    const toggleSelectAllApplicants = () => {
        if (selectedAppIds.length === applicants.length) {
            setSelectedAppIds([]);
        } else {
            setSelectedAppIds(applicants.map(a => a.ID));
        }
    };
    const activeJobIdRef = useRef<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);
    const isCancelledRef = useRef<boolean>(false);

    const cancelAnalysis = () => {
        isCancelledRef.current = true;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setOcrLoading(false);
        setBatchAnalyzing(false);
        setAnalyzingStates({});
        setResult(prev => prev && prev.streaming ? { ...prev, streaming: false, content: prev.content + "\n\n⚠️ [ยกเลิกการวิเคราะห์โดยผู้ใช้งาน]" } : null);

        // 🔴 ถ้าใช้ local Typhoon model ให้ปล่อย VRAM ทันที
        const isLocalModel = !selectedModel.toLowerCase().includes("claude") &&
            !selectedModel.toLowerCase().includes("gpt") &&
            !selectedModel.toLowerCase().includes("gemini") &&
            !selectedModel.startsWith("ft:");
        if (isLocalModel) {
            fetch(`${TYPHOON_API}/model/unload?which=chat`, { method: "POST" })
                .then(() => console.log("[VRAM] Local model unloaded after cancel"))
                .catch(() => { /* ไม่แสดง error ถ้า unload ไม่สำเร็จ */ });
        }
    };

    // Manual Candidate Entry States
    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [manualFirstName, setManualFirstName] = useState("");
    const [manualLastName, setManualLastName] = useState("");
    const [manualEmail, setManualEmail] = useState("");
    const [manualPhone, setManualPhone] = useState("");
    const [manualResumeText, setManualResumeText] = useState("");
    const [manualResumeUrl, setManualResumeUrl] = useState("");
    const [manualResumeFileName, setManualResumeFileName] = useState("");
    const [manualTranscriptText, setManualTranscriptText] = useState("");
    const [manualTranscriptUrl, setManualTranscriptUrl] = useState("");
    const [manualTranscriptFileName, setManualTranscriptFileName] = useState("");
    const [manualJobId, setManualJobId] = useState("");
    const [manualSubmitting, setManualSubmitting] = useState(false);
    const [manualError, setManualError] = useState("");

    // Raw OCR Viewer Modal States
    const [ocrModalOpen, setOcrModalOpen] = useState(false);
    const [ocrModalCandidateName, setOcrModalCandidateName] = useState("");
    const [ocrModalText, setOcrModalText] = useState("");
    const [ocrModalAppObj, setOcrModalAppObj] = useState<any>(null);
    const [ocrSearchQuery, setOcrSearchQuery] = useState("");
    const [ocrCopied, setOcrCopied] = useState(false);

    const openOcrModal = (app: any) => {
        const candidateName = app.Candidate
            ? `${app.Candidate.first_name} ${app.Candidate.last_name}`
            : "ผู้สมัคร";
        let txt = app.ResumeText || app.resume_text || "";
        if (txt.trim().startsWith("ข้อมูลประวัติย่อ") || txt.includes("/api/upload/")) {
            txt = "ยังไม่ได้ทำการสแกนข้อความ OCR (กรุณากด 'วิเคราะห์เดี่ยว' เพื่อเริ่มสแกนรูปภาพและถอดข้อความ)";
        }
        setOcrModalCandidateName(candidateName);
        setOcrModalText(txt);
        setOcrModalAppObj(app);
        setOcrSearchQuery("");
        setOcrCopied(false);
        setOcrModalOpen(true);
    };

    const copyOcrToClipboard = (textToCopy: string) => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setOcrCopied(true);
        setTimeout(() => setOcrCopied(false), 2000);
    };

    const parseCriteria = (text: any) => {
        const criteriaMap: { [key: string]: { name: string; max: number } } = {};
        if (!text) {
            return { cat_1: { name: "ความเหมาะสมโดยรวม", max: 100 } };
        }
        if (Array.isArray(text)) {
            text.forEach((c: any, idx: number) => {
                criteriaMap[`cat_${idx + 1}`] = {
                    name: c.title || "",
                    max: c.weight || 0
                };
            });
            return criteriaMap;
        }
        const lines = text.split("\n");
        let count = 1;
        const tempItems: string[] = [];

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            const bulletMatch = cleanLine.match(/^(?:[-*+•]|\d+[.)])\s*(.+)$/);
            const content = bulletMatch ? bulletMatch[1].trim() : cleanLine;

            const scoreMatch = content.match(/^(.+?)\s*\((\d+)\s*(คะแนน|คะแนนเต็ม)?\)$/);
            if (scoreMatch) {
                criteriaMap[`cat_${count}`] = { name: scoreMatch[1].trim(), max: parseInt(scoreMatch[2]) };
                count++;
            } else if (content && !content.startsWith("เกณฑ์การ") && !content.startsWith("เกณฑ์คัดสรร")) {
                tempItems.push(content);
            }
        }

        if (tempItems.length > 0 && Object.keys(criteriaMap).length === 0) {
            const distributedMax = Math.floor(100 / tempItems.length);
            tempItems.forEach((item, idx) => {
                criteriaMap[`cat_${idx + 1}`] = { name: item, max: distributedMax };
            });
        }

        if (Object.keys(criteriaMap).length === 0) {
            return { cat_1: { name: "ความเหมาะสมโดยรวม", max: 100 } };
        }
        return criteriaMap;
    };

    const parseBasicInfoFromMarkdown = (text: string) => {
        const info = {
            name: "",
            email: "",
            phone: "",
            age: "",
            education: "",
            experience: ""
        };
        if (!text) return info;

        const lines = text.split("\n");
        let inSection1 = false;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes("1. ข้อมูลผู้สมัคร") || trimmed.includes("ข้อมูลผู้สมัคร")) {
                inSection1 = true;
                return;
            }
            if (trimmed.startsWith("## 2.") || trimmed.startsWith("### 2.") || trimmed.includes("คะแนนรวม")) {
                inSection1 = false;
                return;
            }

            if (inSection1) {
                if (trimmed.includes("ชื่อ") || trimmed.includes("Name")) {
                    let rawName = trimmed.replace(/^[-*•\d.\s#]+/, "").split(":")[1]?.trim() || trimmed;
                    rawName = rawName.replace(/\s*[\(\[\{].*?[\)\]\}]/g, "");
                    const delims = ["|", "/", "—", "–", " - ", "ตำแหน่ง", "เป็น", "โดย", "อายุ"];
                    for (const d of delims) {
                        const idx = rawName.indexOf(d);
                        if (idx !== -1) rawName = rawName.substring(0, idx);
                    }
                    rawName = rawName.replace(/^(คุณ|นาย|นางสาว|นาง|ดร\.|ศ\.|ผศ\.|รศ\.|Mr\.|Mrs\.|Ms\.|Dr\.|ผู้สมัครชื่อ|ผู้สมัคร|ชื่อ-นามสกุล|ชื่อนามสกุล|ชื่อ|Name|Candidate)\s*/i, "");
                    info.name = rawName.trim();
                } else if (trimmed.includes("อีเมล") || trimmed.includes("Email")) {
                    info.email = trimmed.replace(/^[-*•\d.\s]+/, "").split(":")[1]?.trim() || trimmed;
                } else if (trimmed.includes("เบอร์") || trimmed.includes("โทร") || trimmed.includes("Phone")) {
                    info.phone = trimmed.replace(/^[-*•\d.\s]+/, "").split(":")[1]?.trim() || trimmed;
                } else if (trimmed.includes("อายุ") || trimmed.includes("จบ")) {
                    info.age = trimmed.replace(/^[-*•\d.\s]+/, "").split(":")[1]?.trim() || trimmed;
                } else if (trimmed.includes("ศึกษา") || trimmed.includes("วุฒิ")) {
                    info.education = trimmed.replace(/^[-*•\d.\s]+/, "").split(":")[1]?.trim() || trimmed;
                }
            }
        });

        return info;
    };

    const formatCleanMarkdownScores = (content: string) => {
        if (!content) return "";
        return content.replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, (_match, scoreStr, maxStr) => {
            const roundedScore = Math.round(parseFloat(scoreStr));
            const roundedMax = Math.round(parseFloat(maxStr));
            return `${roundedScore}/${roundedMax}`;
        });
    };

    const parseScoresFromMarkdown = (content: string) => {
        const lines = (content || "").split("\n");
        const parsedRows: { name: string; score: number; max: number; reason: string }[] = [];
        let totalScore = 0;
        let totalMax = 100;
        let hasTotalRow = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("|")) continue;

            const cols = trimmed.split("|").map(c => c.trim()).filter(c => c !== "");
            if (cols.length < 2) continue;

            const name = cols[0].replace(/\*\*/g, "").replace(/^[-#*:]+/g, "").trim();
            if (!name || name.startsWith("---") || name.includes("เกณฑ์") || name.toLowerCase().includes("criterion")) {
                continue;
            }

            let scoreVal = 0;
            let maxVal = 100;
            let foundScore = false;
            let scoreColIdx = -1;
            let reasonStr = "";

            // First pass: look specifically for "XX/YY" fraction pattern in cols[1..]
            for (let i = 1; i < cols.length; i++) {
                const cleanCol = cols[i].replace(/\*\*/g, "").trim();
                const slashMatch = cleanCol.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
                if (slashMatch) {
                    scoreVal = Math.round(parseFloat(slashMatch[1]));
                    maxVal = Math.round(parseFloat(slashMatch[2]));
                    foundScore = true;
                    scoreColIdx = i;
                    break;
                }
            }

            // Fallback pass: look for single number pattern if no slash match
            if (!foundScore) {
                for (let i = 1; i < cols.length; i++) {
                    const cleanCol = cols[i].replace(/\*\*/g, "").trim();
                    const numMatch = cleanCol.match(/(\d+(?:\.\d+)?)/);
                    if (numMatch) {
                        scoreVal = Math.round(parseFloat(numMatch[1]));
                        foundScore = true;
                        scoreColIdx = i;
                        break;
                    }
                }
            }

            if (foundScore) {
                if (scoreColIdx !== -1 && scoreColIdx < cols.length - 1) {
                    reasonStr = cols.slice(scoreColIdx + 1).join(" ").replace(/\*\*/g, "").trim();
                } else if (cols.length >= 3) {
                    reasonStr = cols[cols.length - 1].replace(/\*\*/g, "").trim();
                }

                const isTotal = name.includes("รวม") || name.includes("Total") || name.includes("สรุป");
                if (isTotal) {
                    totalScore = scoreVal;
                    totalMax = maxVal;
                    hasTotalRow = true;
                } else {
                    parsedRows.push({ name, score: scoreVal, max: maxVal, reason: reasonStr });
                }
            }
        }

        return {
            scores: parsedRows,
            average: parsedRows.length > 0 ? Math.round(parsedRows.reduce((s, r) => s + (r.score / r.max) * 100, 0) / parsedRows.length) : 0,
            total: hasTotalRow ? totalScore : null,
            max: hasTotalRow ? totalMax : null
        };
    };

    const matchParsedScoresToCriteria = (parsedScores: any[], criteriaMap: any) => {
        const scores: Record<string, number> = {};
        const criteriaKeys = Object.keys(criteriaMap);

        const snapToDiscreteLevel = (scoreVal: number, maxVal: number) => {
            if (maxVal <= 0) return 0;
            const ratio = scoreVal / maxVal;
            if (ratio >= 0.75) return maxVal;                       // 100% (ดี - ได้เต็ม)
            if (ratio >= 0.25) return Math.round(maxVal * 0.5);   // 50% (ปานกลาง - ได้ครึ่งหนึ่ง)
            return 0;                                             // 0% (แย่ - ได้ 0)
        };

        if (parsedScores.length === criteriaKeys.length) {
            parsedScores.forEach((row, idx) => {
                const key = criteriaKeys[idx];
                const criteriaMax = criteriaMap[key].max;
                let rawScore = row.score;
                if (row.max !== criteriaMax && row.max > 0) {
                    rawScore = (row.score / row.max) * criteriaMax;
                }
                scores[key] = snapToDiscreteLevel(rawScore, criteriaMax);
            });
        } else {
            const nameToKey: Record<string, string> = {};
            Object.entries(criteriaMap).forEach(([key, info]: any) => {
                nameToKey[info.name.toLowerCase()] = key;
            });

            parsedScores.forEach(row => {
                const nameLower = row.name.toLowerCase();
                let matchedKey: string | undefined;

                for (const [n, k] of Object.entries(nameToKey)) {
                    if (nameLower.includes(n) || n.includes(nameLower)) {
                        matchedKey = k;
                        break;
                    }
                }

                if (!matchedKey) {
                    const keywords = ["api", "git", "docker", "database", "sql", "experience", "เรียนรู้", "กระตือรือร้น", "1-3", "ประสบการณ์", "ความปลอดภัย", "security"];
                    let bestMatchKey: string | undefined;
                    let maxOverlap = 0;

                    Object.entries(criteriaMap).forEach(([key, info]: any) => {
                        const infoLower = info.name.toLowerCase();
                        let overlap = 0;
                        keywords.forEach(kw => {
                            if (nameLower.includes(kw) && infoLower.includes(kw)) {
                                overlap++;
                            }
                        });
                        if (overlap > maxOverlap) {
                            maxOverlap = overlap;
                            bestMatchKey = key;
                        }
                    });

                    if (maxOverlap > 0) {
                        matchedKey = bestMatchKey;
                    }
                }

                if (matchedKey) {
                    const criteriaMax = criteriaMap[matchedKey].max;
                    let rawScore = row.score;
                    if (row.max !== criteriaMax && row.max > 0) {
                        rawScore = (row.score / row.max) * criteriaMax;
                    }
                    scores[matchedKey] = snapToDiscreteLevel(rawScore, criteriaMax);
                }
            });
        }
        return scores;
    };

    const parseBreakdownFromStrengths = (strengths: string, criteriaMap: any) => {
        const scores: { [key: string]: number } = {};

        const match = strengths?.match(/^\[SCORES:\s*(.*?)\]/);
        if (match) {
            const pairs = match[1].split(",");
            pairs.forEach(p => {
                const [k, v] = p.split("=");
                if (k && v) {
                    scores[k] = Math.round(parseFloat(v));
                }
            });
        } else if (strengths) {
            const parsed = parseScoresFromMarkdown(strengths);
            const matchedScores = matchParsedScoresToCriteria(parsed.scores, criteriaMap);
            Object.assign(scores, matchedScores);
        }

        const breakdown: { [key: string]: { score: number; max: number } } = {};
        Object.keys(criteriaMap).forEach(key => {
            const info = criteriaMap[key];
            breakdown[info.name] = {
                score: scores[key] !== undefined ? Math.round(scores[key]) : 0,
                max: Math.round(info.max)
            };
        });
        return breakdown;
    };

    const getStrengthsText = (app: any) => {
        if (!app || !app.AIScreening) return "";
        let txt = app.AIScreening.strengths || app.AIScreening.Strengths || "";
        if (!txt && app.AIScreening.analysis_data) {
            try {
                const parsed = JSON.parse(app.AIScreening.analysis_data);
                if (parsed.raw_markdown) txt = parsed.raw_markdown;
            } catch {}
        }
        return txt;
    };

    const getCleanStrengths = (strengths: string) => {
        const cleaned = strengths ? strengths.replace(/^\[SCORES:\s*.*?\]\s*/, "") : "";
        return formatCleanMarkdownScores(cleaned);
    };

    // ── Check AI status (Local Typhoon vs Cloud AI) ──────────────────
    const checkOnline = async () => {
        const isCloudModel = selectedModel.includes("gemini") ||
            selectedModel.includes("gpt") ||
            selectedModel.includes("claude") ||
            selectedModel.startsWith("ft:");
        if (isCloudModel) {
            setOnline(true);
            return;
        }
        try {
            const r = await fetch(`${TYPHOON_API}/health`, { signal: AbortSignal.timeout(3000) });
            const d = await r.json();
            setOnline(d.status === "ok" || d.chat_model === true);
        } catch {
            setOnline(false);
        }
    };

    // Re-check AI online status when model changes
    useEffect(() => {
        checkOnline();
    }, [selectedModel]);

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

    // Handle AI Model change: update model without wiping existing raw text automatically
    const handleModelChange = (newModelId: string) => {
        setSelectedModel(newModelId);
    };

    const runSingleAnalysis = async (app: any, forceReOcr = false, isBatch = false) => {
        let resumeText = forceReOcr ? "" : (app.ResumeText || app.resume_text || "");
        if (resumeText && (resumeText.trim().startsWith("ข้อมูลประวัติย่อ") || resumeText.includes("/api/upload/"))) {
            resumeText = "";
        }

        try {
            if (!resumeText && app.resume_url) {
                setAnalyzingStates(prev => ({ ...prev, [app.ID]: "ocr" }));

                let rawUrl = app.resume_url.replace(/\\/g, "/");
                const baseBackendUrl = getBackendBaseUrl();

                const candidateUrls: string[] = [];
                if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
                    candidateUrls.push(rawUrl);
                } else {
                    if (!rawUrl.startsWith("/")) rawUrl = "/" + rawUrl;
                    candidateUrls.push(`${baseBackendUrl}${rawUrl}`);
                    if (!rawUrl.startsWith("/api")) {
                        candidateUrls.push(`${baseBackendUrl}/api${rawUrl}`);
                    } else {
                        candidateUrls.push(`${baseBackendUrl}${rawUrl.slice(4)}`);
                    }
                }

                let blob: Blob | null = null;
                let lastErr = "";

                for (const targetUrl of candidateUrls) {
                    try {
                        console.log("[OCR] Attempting to fetch resume file from:", targetUrl);
                        const res = await fetch(targetUrl);
                        if (res.ok) {
                            blob = await res.blob();
                            break;
                        } else {
                            lastErr = `HTTP ${res.status}`;
                        }
                    } catch (e: any) {
                        lastErr = e.message || "Network Error";
                    }
                }

                if (!blob) {
                    throw new Error(`ไม่สามารถดาวน์โหลดไฟล์ Resume (${app.resume_url}) ได้: ${lastErr || "ไม่พบไฟล์บนเซิร์ฟเวอร์"}`);
                }

                const filename = app.resume_url.split("/").pop() || "resume.pdf";
                const file = new File([blob], filename, { type: blob.type || "application/pdf" });

                const formData = new FormData();
                formData.append("file", file);
                formData.append("model", selectedModel);

                try {
                    const ocrRes = await fetch(`${TYPHOON_API}/ocr`, {
                        method: "POST",
                        body: formData
                    });
                    if (!ocrRes.ok) throw new Error(`HTTP ${ocrRes.status}`);
                    const ocrData = await ocrRes.json();
                    resumeText = ocrData.text || "";

                    // Optimization 1: Automatic OCR Caching & Extracted Resume JSON (Save OCR text and Extracted JSON to DB immediately)
                    if (resumeText) {
                        try {
                            const extractedResumeObj = {
                                raw_ocr_text: resumeText,
                                filename: filename,
                                character_count: resumeText.length,
                                ocr_extracted_at: new Date().toISOString()
                            };
                            const extractedJSON = JSON.stringify(extractedResumeObj);

                            await updateApplicationScreening(
                                app.ID,
                                app.AIScore || 0,
                                app.AIScreening?.strengths || "",
                                "typhoon2.5-qwen3-4b",
                                resumeText,
                                app.AIScreening?.analysis_data || "",
                                extractedJSON
                            );
                        } catch (cacheErr) {
                            console.warn("[OCR Cache Warning] Failed to cache OCR text in DB:", cacheErr);
                        }
                    }
                } catch (ocrErr: any) {
                    console.error("[OCR Service Error]", ocrErr);
                    throw new Error(`ไม่สามารถเชื่อมต่อบริการ Typhoon AI OCR (${TYPHOON_API}/ocr) ได้: ${ocrErr.message || "Failed to fetch"}`);
                }
            }

            if (!resumeText || resumeText.trim().length < 15) {
                throw new Error("ไม่สามารถอ่านข้อความจาก Resume นี้ได้ (ไฟล์อาจเป็นภาพสแกนหรือ PDF ที่ไม่มีข้อความ) กรุณาตรวจสอบไฟล์แนบของผู้สมัคร");
            }

            // Normalize spaced letters from OCR e.g. "A I S S A R A P A B" -> "AISSARAPAB"
            resumeText = resumeText.replace(/\b([A-Za-z])(?:\s+([A-Za-z]))+\b/g, (match: string) => match.replace(/\s+/g, ''));

            setAnalyzingStates(prev => ({ ...prev, [app.ID]: "ai" }));

            const matchedJob = jobs.find(j => j.ID.toString() === selectedJobId);
            const jdText = matchedJob?.description || "";
            const criteriaText = matchedJob?.criteria || "";
            const criteriaMap = parseCriteria(criteriaText);

            console.log("[Score] calling /chat for streaming scores with criteria:", criteriaMap);

            const cand = app.Candidate;
            let dbName = cand ? `${cand.first_name || ''} ${cand.last_name || ''}`.trim() : "";
            if (isInvalidOrRandomName(dbName)) {
                dbName = "";
            }
            const dbEmail = cand?.email || "";

            let userContent = `กรุณาวิเคราะห์เฉพาะ Resume ของผู้สมัครที่ปรากฏในข้อความนี้เท่านั้น
*** ข้อห้ามสำคัญมาก: ห้ามสร้างชื่อผู้สมัครสมมุติ หรือมโนข้อมูลเท็จขึ้นมาเองเด็ดขาด หากข้อมูลใดไม่มีใน Resume ให้เขียนว่า "ไม่ระบุ" ***

${dbName ? `ข้อมูลผู้สมัครจากฐานข้อมูลระบบ (Database):\n- ชื่อ-สกุล: ${dbName}\n- อีเมล: ${dbEmail}\n` : ''}=== เรซูเม่ผู้สมัคร ===
${resumeText}`;

            if (jdText) {
                userContent += `\n\n=== ตำแหน่งงาน / JD ===\n${jdText}`;
            }
            if (criteriaText) {
                let formattedCriteria = "";
                if (Array.isArray(criteriaText)) {
                    formattedCriteria = criteriaText.map((c: any, cIdx: number) => {
                        let mainStr = `📌 เกณฑ์หลัก (${cIdx + 1}): ${c.title} (น้ำหนักคะแนนเต็ม ${c.weight} คะแนน/%)`;
                        if (c.sub_criteria && c.sub_criteria.length > 0) {
                            const subStr = c.sub_criteria.map((sc: any, scIdx: number) =>
                                `   ▫️ เกณฑ์ย่อย (${cIdx + 1}.${scIdx + 1}): ${sc.title} (น้ำหนักคะแนนเต็ม ${sc.weight} คะแนน/%)\n      รายละเอียดเกณฑ์ประเมิน: ${sc.description}`
                            ).join("\n");
                            mainStr += `\n${subStr}`;
                        }
                        return mainStr;
                    }).join("\n\n");
                } else {
                    formattedCriteria = String(criteriaText);
                }

                userContent += `\n\n=== เกณฑ์ในการคัดเลือกและน้ำหนักคะแนน (Main & Sub-Criteria) ===\n${formattedCriteria}`;

                const tableRowsExample = Object.values(criteriaMap)
                    .map(info => `| ${info.name} | [คะแนนที่ได้]/${info.max} | [เหตุผลประเมินสั้นๆ ตาม Sub-Criteria] |`)
                    .join("\n");

                userContent += `\n\n=== ข้อกำหนดการตอบกลับ (ตอบกลับเฉพาะ 2 หัวข้อนี้เท่านั้น) ===

โปรดวิเคราะห์คุณสมบัติใน Resume เทียบกับเกณฑ์หลักทั้ง 3 ระดับ (ระดับดี 100%, ระดับปานกลาง 50%, ระดับแย่ 0%) โดยเกณฑ์หลักแต่ละข้อต้องเลือกประเมินเพียง 1 ใน 3 ระดับนี้เท่านั้น: เต็ม 100%, ครึ่งหนึ่ง 50%, หรือ 0% (ห้ามคิดตัวเลขอื่นๆ หรือเฉลี่ยทศนิยม เช่น 21/25 หรือ 83.33% เด็ดขาด) และตอบกลับในรูปแบบเทมเพลตด้านล่างนี้เป๊ะๆ:

## 1. ข้อมูลผู้สมัคร

**ชื่อ-สกุล**: ${dbName || '[ดึง ชื่อ-สกุล จริงที่พบใน Resume (หากชื่อใน DB เป็นตัวเลขหรือชื่อมั่ว ให้ใช้ชื่อจาก Resume แทน) หรือหากไม่มีให้ระบุ ไม่ระบุ]'}
**อีเมล**: ${dbEmail || '[ดึง อีเมล จริงที่พบใน Resume หรือหากไม่มีให้ระบุ ไม่ระบุ]'}

---

## 2. คะแนนรวม (0–100)

| เกณฑ์ | คะแนน | เหตุผล |
|---|---|---|
${tableRowsExample}
| **รวมทั้งหมด** | [ผลรวมคะแนนทุกเกณฑ์หลัก]/100 | [คำสรุปโดยรวมสั้นๆ] |

ข้อห้ามสำคัญ:
- ในหัวข้อ "## 1. ข้อมูลผู้สมัคร" ให้แสดงเฉพาะ 2 บรรทัดคือ **ชื่อ-สกุล** และ **อีเมล** เท่านั้น ห้ามแสดงวันเกิด สถานภาพ ที่อยู่ เงินเดือน หรือวันเริ่มงาน เด็ดขาด
- คะแนนของแต่ละเกณฑ์หลักต้องคำนวณตรงกับระดับ (100%, 50%, 0%) ของเกณฑ์ย่อยในช่องเหตุผลเสมอ ห้ามมโนตัวเลขเอง
- ตัวเลขในบรรทัด "**รวมทั้งหมด**" ต้องเป็นผลรวมคะแนนของทุกเกณฑ์หลักรวมกันจริงๆ
- ห้ามย่อหรือเปลี่ยนชื่อเกณฑ์หลักในตาราง และห้ามเพิ่มหัวข้ออื่นเด็ดขาด`;
            }

            const response = await fetch(`${TYPHOON_API}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: userContent }],
                    system_prompt: SYSTEM_PROMPT,
                    max_new_tokens: 8192,
                    temperature: 0,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                let errDetail = "";
                try {
                    const errJson = await response.json();
                    errDetail = errJson.detail || errJson.message || "";
                } catch {
                    errDetail = await response.text().catch(() => "");
                }
                throw new Error(errDetail || `AI ประเมินคะแนนไม่สำเร็จ (HTTP ${response.status})`);
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            let lastUpdate = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                fullText += decoder.decode(value, { stream: true });

                const now = Date.now();
                if (now - lastUpdate > 80) {
                    lastUpdate = now;
                    setApplicants(prev => prev.map(a => {
                        if (a.ID === app.ID) {
                            return {
                                ...a,
                                AIScreening: {
                                    skill_score: a.AIScreening?.skill_score || 0,
                                    strengths: fullText,
                                    model_used: selectedModel
                                }
                            };
                        }
                        return a;
                    }));
                }
            }

            // Instantly render final full text
            setApplicants(prev => prev.map(a => {
                if (a.ID === app.ID) {
                    return {
                        ...a,
                        AIScreening: {
                            skill_score: a.AIScreening?.skill_score || 0,
                            strengths: fullText,
                            model_used: selectedModel
                        }
                    };
                }
                return a;
            }));

            // ⚡ Instantly update status from "ai" to "saving" as AI stream is complete
            setAnalyzingStates(prev => ({ ...prev, [app.ID]: "saving" }));

            const finalParsed = parseScoresFromMarkdown(fullText);
            const finalScores = matchParsedScoresToCriteria(finalParsed.scores, criteriaMap);
            let totalScore = 0;

            Object.keys(criteriaMap).forEach(key => {
                if (finalScores[key] === undefined) {
                    finalScores[key] = 0;
                }
                totalScore += Math.min(Math.round(finalScores[key]), criteriaMap[key].max);
            });

            const scoresStr = `[SCORES: ${Object.keys(finalScores).map(k => `${k}=${Math.round(finalScores[k])}`).join(",")}]`;
            const strengthsText = `${scoresStr}\n\n${fullText}`;

            const basicCandidateInfo = parseBasicInfoFromMarkdown(fullText);

            const breakdownDetails = Object.keys(criteriaMap).map((key, idx) => {
                const info = criteriaMap[key];
                const rawScore = finalScores[key] || 0;
                const maxScore = info.max || 100;
                const calculatedScore = Math.min(Math.round(rawScore), maxScore);
                const ratio = maxScore > 0 ? calculatedScore / maxScore : 0;
                const pct = Math.round(ratio * 100);

                let level = "แย่ (0%)";
                if (pct >= 75) {
                    level = "ดี (100%)";
                } else if (pct >= 25) {
                    level = "ปานกลาง (50%)";
                }

                let origMainCriterion: any = null;
                if (Array.isArray(matchedJob?.criteria)) {
                    origMainCriterion = matchedJob.criteria[idx] || matchedJob.criteria.find((c: any) => c.title === info.name);
                }

                let row = finalParsed.scores.find((r: any) => r.name.toLowerCase().includes(info.name.toLowerCase()) || info.name.toLowerCase().includes(r.name.toLowerCase()));
                if (!row && finalParsed.scores[idx]) {
                    row = finalParsed.scores[idx];
                }

                let reasonStr = (row as any)?.reason || "";
                if (!reasonStr && fullText) {
                    const cleanText = fullText.replace(/^\[SCORES:\s*.*?\]\s*/, "");
                    const lines = cleanText.split("\n");
                    const keywords = info.name.split(/[\s&/]+/);
                    for (const line of lines) {
                        const trimmed = line.replace(/^[-*•\d.\s#]+/, "").trim();
                        if (trimmed.length > 8 && !trimmed.startsWith("|") && !trimmed.startsWith("---")) {
                            if (keywords.some((kw: string) => kw.length > 3 && trimmed.toLowerCase().includes(kw.toLowerCase()))) {
                                reasonStr = trimmed;
                                break;
                            }
                        }
                    }
                }

                if (!reasonStr) {
                    if (pct >= 75) {
                        reasonStr = `มีทักษะและประสบการณ์อยู่ในระดับดีเยี่ยม ตรงตามข้อกำหนดเกณฑ์ (${calculatedScore}/${maxScore} คะแนน)`;
                    } else if (pct >= 25) {
                        reasonStr = `มีทักษะและประสบการณ์ในระดับปานกลาง ครอบคลุมพื้นฐานเกณฑ์ (${calculatedScore}/${maxScore} คะแนน)`;
                    } else {
                        reasonStr = `ยังมีทักษะหรือประสบการณ์ไม่ตรงตามข้อกำหนดหลักของเกณฑ์ (${calculatedScore}/${maxScore} คะแนน)`;
                    }
                }

                return {
                    criterion_id: origMainCriterion?.id || `c_${idx + 1}`,
                    main_criterion_title: info.name,
                    score: calculatedScore,
                    max_score: maxScore,
                    weight: origMainCriterion?.weight || maxScore,
                    percentage: pct,
                    evaluated_level: level,
                    reason: reasonStr,
                    sub_criteria: origMainCriterion?.sub_criteria || []
                };
            });

            totalScore = finalParsed.total !== null && !isNaN(finalParsed.total)
                ? Math.round(finalParsed.total)
                : breakdownDetails.reduce((sum, item) => sum + item.score, 0);

            const structuredJSON = JSON.stringify({
                total_score: totalScore,
                candidate_basic_info: basicCandidateInfo,
                main_criteria_breakdown: breakdownDetails,
                raw_markdown: fullText,
                analyzed_at: new Date().toISOString()
            });

            const extractedResumeObj = {
                raw_ocr_text: resumeText,
                candidate_profile: basicCandidateInfo,
                character_count: resumeText.length,
                extracted_at: new Date().toISOString()
            };
            const extractedResumeJSON = JSON.stringify(extractedResumeObj);

            setApplicants(prev => prev.map(a => {
                if (a.ID === app.ID) {
                    return {
                        ...a,
                        Status: "รอนัดสัมภาษณ์",
                        status: "รอนัดสัมภาษณ์",
                        ResumeText: resumeText,
                        resume_text: resumeText,
                        AIScreening: {
                            skill_score: totalScore,
                            strengths: strengthsText,
                            analysis_data: structuredJSON,
                            model_used: selectedModel
                        }
                    };
                }
                return a;
            }));

            try {
                await updateApplicationScreening(app.ID, totalScore, strengthsText, selectedModel, resumeText, structuredJSON, extractedResumeJSON);
            } catch (dbErr) {
                console.warn("[DB Save Warning] Failed to update application screening in DB:", dbErr);
            }

            setAnalyzingStates(prev => ({ ...prev, [app.ID]: "done" }));
        } catch (err: any) {
            console.error(`Error screening application ${app.ID}:`, err);
            setAnalyzingStates(prev => ({ ...prev, [app.ID]: "error" }));
            if (!isBatch) {
                alert(`เกิดข้อผิดพลาดในการวิเคราะห์ Resume ของ ${app.Candidate?.first_name || 'ผู้สมัคร'}: ${err.message || 'ไม่สามารถวิเคราะห์ได้'}`);
            }
        } finally {
            setAnalyzingStates(prev => {
                if (prev[app.ID] === "ai" || prev[app.ID] === "saving" || prev[app.ID] === "ocr") {
                    return { ...prev, [app.ID]: "done" };
                }
                return prev;
            });
        }
    };

    const analyzeSequentially = async (pendingApps: any[]) => {
        if (batchAnalyzing) return;
        setBatchAnalyzing(true);
        try {
            const currentJobId = selectedJobId;
            for (const app of pendingApps) {
                if (activeJobIdRef.current !== currentJobId) break;
                await runSingleAnalysis(app, false, true);
            }
        } catch (err) {
            console.error("Sequential analysis error:", err);
        } finally {
            setBatchAnalyzing(false);
        }
    };

    const analyzeAllApplicants = async () => {
        const selectedApps = applicants.filter(app => selectedAppIds.includes(app.ID));
        if (selectedApps.length === 0 || batchAnalyzing) return;
        setBatchAnalyzing(true);
        try {
            const currentJobId = selectedJobId;
            for (const app of selectedApps) {
                if (activeJobIdRef.current !== currentJobId) break;
                await runSingleAnalysis(app, false, true);
            }
        } catch (error) {
            console.error("Batch analysis failed:", error);
        } finally {
            setBatchAnalyzing(false);
        }
    };

    const handleDeleteApplicant = async (appId: number) => {
        if (!window.confirm("คุณต้องการลบข้อมูลผู้สมัครรายนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;
        try {
            await deleteapplication(appId);
            setApplicants(prev => prev.filter(a => a.ID !== appId));
            setSelectedAppIds(prev => prev.filter(id => id !== appId));
        } catch (err) {
            console.error("ลบข้อมูลผู้สมัครล้มเหลว:", err);
            alert("เกิดข้อผิดพลาดในการลบข้อมูลผู้สมัคร");
        }
    };

    // ฟังก์ชันส่งฟอร์มบันทึกผู้สมัครงานด้วยตนเองโดย HR
    const handleManualAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualFirstName.trim() || !manualLastName.trim() || !manualEmail.trim() || !manualPhone.trim() || !manualResumeText.trim() || !manualJobId) {
            setManualError("กรุณากรอกข้อมูลและรายละเอียด Resume ให้ครบถ้วน");
            return;
        }

        setManualSubmitting(true);
        setManualError("");

        try {
            await applyjob(
                parseInt(manualJobId),
                manualFirstName,
                manualLastName,
                manualEmail,
                manualPhone,
                manualResumeText,
                manualResumeUrl,
                manualTranscriptUrl,
                manualTranscriptText
            );

            // โหลดผู้สมัครใหม่หากเป็นตำแหน่งงานที่กำลังเปิดดูอยู่
            if (selectedJobId && selectedJobId === manualJobId) {
                const res = await getapplications(parseInt(selectedJobId));
                if (res && res.data) {
                    setApplicants(res.data);
                    setSelectedAppIds(res.data.map((a: any) => a.ID));
                }
            }

            // ล้างฟอร์มและปิดโมดอล
            setManualFirstName("");
            setManualLastName("");
            setManualEmail("");
            setManualPhone("");
            setManualResumeText("");
            setManualResumeUrl("");
            setManualResumeFileName("");
            setManualTranscriptText("");
            setManualTranscriptUrl("");
            setManualTranscriptFileName("");
            setShowManualAddModal(false);
            alert("บันทึกข้อมูลผู้สมัครรายใหม่สำเร็จแล้ว!");
        } catch (err: any) {
            setManualError(err.response?.data?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้สมัคร");
        } finally {
            setManualSubmitting(false);
        }
    };

    const handleManualResumeUpload = async (file: File) => {
        if (!file) return;
        setManualResumeFileName(file.name + " (กำลังอัปโหลด...)");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await apiClient.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data && res.data.url) {
                setManualResumeUrl(res.data.url);
                setManualResumeFileName(file.name + " (อัปโหลดสำเร็จ)");
                if (file.name.toLowerCase().endsWith(".txt")) {
                    const reader = new FileReader();
                    reader.onload = ev => setManualResumeText(ev.target?.result as string || "");
                    reader.readAsText(file, "utf-8");
                } else {
                    setManualResumeText(`ข้อมูลประวัติย่อแบบเอกสาร/รูปภาพ ถูกบันทึกไว้ในระบบ: ${res.data.url}`);
                }
            }
        } catch (e) {
            setManualResumeFileName("");
            alert("อัปโหลดไฟล์ Resume ล้มเหลว");
        }
    };

    const handleManualTranscriptUpload = async (file: File) => {
        if (!file) return;
        setManualTranscriptFileName(file.name + " (กำลังอัปโหลด...)");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await apiClient.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            if (res.data && res.data.url) {
                setManualTranscriptUrl(res.data.url);
                setManualTranscriptFileName(file.name + " (อัปโหลดสำเร็จ)");
                if (file.name.toLowerCase().endsWith(".txt")) {
                    const reader = new FileReader();
                    reader.onload = ev => setManualTranscriptText(ev.target?.result as string || "");
                    reader.readAsText(file, "utf-8");
                } else {
                    setManualTranscriptText(`ข้อมูลทรานสคริปต์ ถูกบันทึกไว้ในระบบ: ${res.data.url}`);
                }
            }
        } catch (e) {
            setManualTranscriptFileName("");
            alert("อัปโหลดไฟล์ Transcript ล้มเหลว");
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
                        setSelectedAppIds(res.data.map((a: any) => a.ID));

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
                formData.append("model", selectedModel);

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
        isCancelledRef.current = false;
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Try matching candidate from database
        let matchedDbName = "";
        let matchedDbEmail = "";

        if (applicants && applicants.length > 0) {
            const matchedApp = applicants.find((a: any) => {
                const email = a.Candidate?.email?.toLowerCase();
                const firstName = a.Candidate?.first_name?.toLowerCase();
                const textLower = resumeText.toLowerCase();

                if (email && textLower.includes(email)) return true;
                if (firstName && firstName.length > 2 && textLower.includes(firstName)) return true;
                return false;
            });

            if (matchedApp && matchedApp.Candidate) {
                const rawDbName = `${matchedApp.Candidate.first_name || ''} ${matchedApp.Candidate.last_name || ''}`.trim();
                if (!isInvalidOrRandomName(rawDbName)) {
                    matchedDbName = rawDbName;
                }
                matchedDbEmail = matchedApp.Candidate.email || "";
            }
        }

        let userContent = `กรุณาวิเคราะห์เฉพาะ Resume ของผู้สมัครที่ปรากฏในข้อความนี้เท่านั้น
*** ข้อห้ามสำคัญมาก: ห้ามสร้างชื่อผู้สมัครสมมุติ หรือมโนข้อมูลเท็จขึ้นมาเองเด็ดขาด หากข้อมูลใดไม่มีใน Resume ให้เขียนว่า "ไม่ระบุ" ***

${matchedDbName ? `ข้อมูลผู้สมัครจากฐานข้อมูลระบบ (Database):\n- ชื่อ-สกุล: ${matchedDbName}\n- อีเมล: ${matchedDbEmail}\n` : ''}=== เรซูเม่ผู้สมัคร ===
${resumeText}`;
        if (jobDesc.trim()) {
            userContent += `\n\n=== ตำแหน่งงาน / JD ===\n${jobDesc}`;
        }
        if (jobCriteria.trim()) {
            userContent += `\n\n=== เกณฑ์ในการคัดเลือก (Criteria) ===\n${jobCriteria}`;

            const parsedMap = parseCriteria(jobCriteria);
            const tableRowsExample = Object.values(parsedMap)
                .map(info => `| ${info.name} | [คะแนนที่ได้]/${info.max} | [เหตุผลประเมินสั้นๆ ตาม Sub-Criteria] |`)
                .join("\n");

            userContent += `\n\n=== ข้อกำหนดการตอบกลับ (ตอบกลับเฉพาะ 2 หัวข้อนี้เท่านั้น) ===

โปรดวิเคราะห์คุณสมบัติใน Resume เทียบกับเกณฑ์หลักทั้ง 3 ระดับ (ระดับดี 100%, ระดับปานกลาง 50%, ระดับแย่ 0%) โดยเกณฑ์หลักแต่ละข้อต้องเลือกประเมินเพียง 1 ใน 3 ระดับนี้เท่านั้น: เต็ม 100%, ครึ่งหนึ่ง 50%, หรือ 0% (ห้ามคิดตัวเลขอื่นๆ หรือเฉลี่ยทศนิยม เช่น 21/25 หรือ 83.33% เด็ดขาด) และตอบกลับในรูปแบบเทมเพลตด้านล่างนี้เป๊ะๆ:

## 1. ข้อมูลผู้สมัคร

**ชื่อ-สกุล**: ${matchedDbName || '[ดึง ชื่อ-สกุล จริงที่พบใน Resume (หากชื่อใน DB เป็นตัวเลขหรือชื่อมั่ว ให้ใช้ชื่อจาก Resume แทน) หรือหากไม่มีให้ระบุ ไม่ระบุ]'}
**อีเมล**: ${matchedDbEmail || '[ดึง อีเมล จริงที่พบใน Resume หรือหากไม่มีให้ระบุ ไม่ระบุ]'}

---

## 2. คะแนนรวม (0–100)

| เกณฑ์ | คะแนน | เหตุผล |
|---|---|---|
${tableRowsExample}
| **รวมทั้งหมด** | [คะแนนรวมทั้งหมด]/100 | [คำสรุปโดยรวมสั้นๆ] |

ข้อห้ามสำคัญ:
- ในหัวข้อ "## 1. ข้อมูลผู้สมัคร" ให้แสดงเฉพาะ 2 บรรทัดคือ **ชื่อ-สกุล** และ **อีเมล** เท่านั้น ห้ามแสดงวันเกิด สถานภาพ ที่อยู่ เงินเดือน หรือวันเริ่มงาน เด็ดขาด
- หากชื่อผู้สมัครจากฐานข้อมูลระบบเป็นตัวเลข หรือเป็นชื่อมั่ว/ข้อมูลขยะ ให้ดึงชื่อจริงจาก Resume มาใช้แทนเด็ดขาด
- ห้ามย่อหรือเปลี่ยนชื่อเกณฑ์หลักในตาราง และห้ามเพิ่มหัวข้ออื่นเด็ดขาด`;
        }

        setResult({ resumeName: "Resume", content: "", streaming: true });

        try {
            const response = await fetch(`${TYPHOON_API}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: userContent }],
                    system_prompt: SYSTEM_PROMPT,
                    max_new_tokens: 8192,
                    temperature: 0,
                    model: selectedModel,
                }),
                signal,
            });

            if (!response.ok) throw new Error("AI ไม่ตอบสนอง");

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let full = "";

            while (true) {
                if (isCancelledRef.current) {
                    reader.cancel();
                    break;
                }
                const { done, value } = await reader.read();
                if (done || isCancelledRef.current) break;
                full += decoder.decode(value, { stream: true });
                setResult(prev => prev ? { ...prev, content: full } : null);
            }

            if (!isCancelledRef.current) {
                setResult(prev => prev ? { ...prev, streaming: false } : null);
            }
        } catch (err: any) {
            if (err.name === "AbortError" || isCancelledRef.current) {
                setResult(prev => prev ? { ...prev, content: prev.content + "\n\n⚠️ [ยกเลิกการวิเคราะห์เรียบร้อย]", streaming: false } : null);
            } else {
                const msg = err instanceof Error ? err.message : "เชื่อมต่อ AI ไม่ได้";
                setResult({ resumeName: "Resume", content: `❌ ${msg}`, streaming: false });
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">คัดกรอง Resume</h1>
                    <p className="text-slate-400 text-sm mt-1">วิเคราะห์ Resume ด้วย AI (Cloud & Fine-Tuned)</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <AIModelDropdown
                        selectedModelId={selectedModel}
                        onSelectModel={handleModelChange}
                    />
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
            </div>

            {/* Tabs for Mode */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-px">
                <button
                    onClick={() => setActiveMode("batch")}
                    className={`px-6 py-3 border-b-2 font-bold text-sm transition-all font-sans ${activeMode === "batch"
                        ? "border-[#4169E1] text-[#4169E1]"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                >
                    วิเคราะห์กลุ่ม (Batch Screening)
                </button>
                <button
                    onClick={() => setActiveMode("single")}
                    className={`px-6 py-3 border-b-2 font-bold text-sm transition-all font-sans ${activeMode === "single"
                        ? "border-[#4169E1] text-[#4169E1]"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                >
                    วิเคราะห์เดี่ยว (Single Resume)
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
                                <div className="flex items-center gap-3">
                                    {resumeText && (
                                        <button
                                            onClick={() => setResumeText("")}
                                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold hover:underline"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            ลบข้อความดิบ
                                        </button>
                                    )}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={ocrLoading}
                                        className="flex items-center gap-1.5 text-xs text-[#4169E1] font-semibold hover:underline disabled:opacity-50"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        {ocrLoading ? "กำลังวิเคราะห์ OCR..." : "อัปโหลดไฟล์ (.txt, .pdf, รูปภาพ)"}
                                    </button>
                                </div>
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

                        {/* Analyze / Cancel button */}
                        {loading ? (
                            <button
                                onClick={cancelAnalysis}
                                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                            >
                                <Square className="w-5 h-5 fill-current" />
                                ยกเลิกการวิเคราะห์ AI
                            </button>
                        ) : (
                            <button
                                onClick={analyze}
                                disabled={ocrLoading || !resumeText.trim() || resumeText.startsWith("กำลังอ่านประมวลผลไฟล์")}
                                className="w-full flex items-center justify-center gap-2 bg-[#4169E1] hover:bg-[#5a52e0] text-white font-bold py-4 rounded-2xl shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                            >
                                <Sparkles className="w-5 h-5" />
                                วิเคราะห์ Resume ด้วย AI
                            </button>
                        )}
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
                                    <p className="text-slate-300 text-xs">AI จะวิเคราะห์ประเมินและคำนวณคะแนนตามเกณฑ์</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {result.streaming && (
                                        <div className="flex items-center gap-2 mb-4 text-xs text-[#4169E1] font-semibold bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60 animate-pulse font-sans">
                                            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            กำลังรันวิเคราะห์ประเมินผลคะแนนแบบเรียลไทม์...
                                        </div>
                                    )}

                                    {/* Render dynamic score bars in Single Mode */}
                                    {(() => {
                                        const parsed = parseScoresFromMarkdown(result.content);
                                        if (parsed.scores.length === 0 && !result.streaming) return null;

                                        const criteriaMap = parseCriteria(jobCriteria);
                                        const scores = matchParsedScoresToCriteria(parsed.scores, criteriaMap);

                                        const breakdown: Record<string, { score: number; max: number; reason: string }> = {};
                                        Object.entries(criteriaMap).forEach(([key, info]: any) => {
                                            const matchedRow = parsed.scores.find((r: any) =>
                                                r.name.toLowerCase().includes(info.name.toLowerCase()) ||
                                                info.name.toLowerCase().includes(r.name.toLowerCase())
                                            );
                                            breakdown[info.name] = {
                                                score: scores[key] !== undefined ? scores[key] : 0,
                                                max: info.max,
                                                reason: matchedRow?.reason || ""
                                            };
                                        });

                                        return (
                                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 font-sans">
                                                <div className="space-y-3">
                                                    {Object.entries(breakdown).map(([cName, info]: any, idx) => {
                                                        const pct = info.max > 0 ? (info.score / info.max) * 100 : 0;
                                                        const clr = pct >= 80 ? "emerald" : pct >= 50 ? "amber" : "rose";
                                                        const styles = {
                                                            emerald: { bar: "bg-emerald-500", bg: "bg-emerald-50/20", border: "border-emerald-500/30" },
                                                            amber: { bar: "bg-amber-500", bg: "bg-amber-50/20", border: "border-amber-500/30" },
                                                            rose: { bar: "bg-rose-500", bg: "bg-rose-50/20", border: "border-rose-500/30" }
                                                        }[clr];

                                                        return (
                                                            <div key={idx} className="space-y-1">
                                                                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                                                    <span>{idx + 1}. {cName}</span>
                                                                    <span>{info.score}/{info.max} PTS</span>
                                                                </div>
                                                                <div className={`w-full ${styles.bg} border ${styles.border} h-3.5 rounded-full overflow-hidden p-0.5`}>
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                {info.reason && (
                                                                    <p className="text-[11px] text-indigo-700 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 mt-1 flex items-start gap-1.5">
                                                                        <Sparkles className="w-3.5 h-3.5 text-[#4169E1] shrink-0 mt-0.5" />
                                                                        <span><strong className="font-bold">เหตุผล AI:</strong> {info.reason}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {/* Total Average Bar */}
                                                {(() => {
                                                    const entries = Object.values(breakdown) as { score: number; max: number }[];
                                                    const totalScore = entries.reduce((s, e) => s + e.score, 0);
                                                    const totalMax = entries.reduce((s, e) => s + e.max, 0);
                                                    const avgPercent = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

                                                    const avgColor = avgPercent >= 80 ? "emerald" : avgPercent >= 50 ? "amber" : "rose";
                                                    const avgBarStyles = {
                                                        emerald: { bar: "from-emerald-400 to-emerald-600", text: "text-emerald-600" },
                                                        amber: { bar: "from-amber-400 to-amber-500", text: "text-amber-600" },
                                                        rose: { bar: "from-rose-400 to-rose-600", text: "text-rose-600" },
                                                    }[avgColor];

                                                    return (
                                                        <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1">
                                                            <div className="flex justify-between text-[12px] font-black text-slate-700">
                                                                <span>คะแนนรวม</span>
                                                                <span className={avgBarStyles.text}>{totalScore}/{totalMax} PTS ({Math.round(avgPercent)}%)</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-0.5">
                                                                <div
                                                                    className={`h-full rounded-full bg-gradient-to-r ${avgBarStyles.bar} transition-all duration-500`}
                                                                    style={{ width: `${avgPercent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })()}

                                    <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/30 rounded-2xl p-4 border border-slate-100/60">
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
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <button
                                    onClick={() => {
                                        setManualJobId(selectedJobId || "");
                                        setShowManualAddModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#4169E1] text-[#4169E1] hover:bg-blue-50/50 text-xs font-bold transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    กรอก Resume / เพิ่มผู้สมัครด้วยตนเอง
                                </button>
                                <div className="min-w-[240px] w-full">
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
                                {selectedJobId && selectedJobId !== "custom" && applicants.length > 0 && (
                                    batchAnalyzing ? (
                                        <button
                                            onClick={cancelAnalysis}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 select-none whitespace-nowrap cursor-pointer"
                                        >
                                            <Square className="w-3.5 h-3.5 fill-current" />
                                            ยกเลิกการวิเคราะห์ AI
                                        </button>
                                    ) : (
                                        <button
                                            onClick={analyzeAllApplicants}
                                            disabled={selectedAppIds.length === 0}
                                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm select-none whitespace-nowrap cursor-pointer ${
                                                selectedAppIds.length === 0
                                                    ? "bg-slate-300 cursor-not-allowed opacity-70"
                                                    : "bg-gradient-to-r from-indigo-500 to-[#4169E1] hover:from-indigo-600 hover:to-[#3558c7] hover:shadow active:scale-95"
                                            }`}
                                            title={selectedAppIds.length === 0 ? "กรุณาเลือกผู้สมัครอย่างน้อย 1 รายการ" : `วิเคราะห์ ${selectedAppIds.length} รายการที่เลือก`}
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            {selectedAppIds.length === applicants.length
                                                ? `วิเคราะห์ผู้สมัครทั้งหมด (${applicants.length})`
                                                : `วิเคราะห์ผู้สมัครที่เลือก (${selectedAppIds.length})`}
                                        </button>
                                    )
                                )}
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

                    {/* Results list rendering - Sleek Horizontal Rows (High to Low PTS) */}
                    {!loadingApplicants && selectedJobId && selectedJobId !== "custom" && (
                        <>
                            {applicants.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-100 shadow-sm font-sans">
                                    ยังไม่มีผู้สมัครส่งใบสมัครเข้ามาในตำแหน่งงานนี้
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 font-sans">
                                    {/* ── Control Bar: เลือกทั้งหมด ── */}
                                    <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-700 shadow-sm mb-1">
                                        <label className="flex items-center gap-2.5 cursor-pointer select-none font-bold text-slate-800 hover:text-[#4169E1] transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={applicants.length > 0 && selectedAppIds.length === applicants.length}
                                                onChange={toggleSelectAllApplicants}
                                                className="w-4 h-4 text-[#4169E1] rounded border-slate-300 focus:ring-[#4169E1] cursor-pointer"
                                            />
                                            <span>เลือก Resume ทั้งหมดในการวิเคราะห์ ({selectedAppIds.length}/{applicants.length} รายการ)</span>
                                        </label>
                                        <div className="text-[11px] font-semibold text-slate-400">
                                            {selectedAppIds.length === 0 ? (
                                                <span className="text-amber-500 font-bold">⚠️ กรุณาเลือกผู้สมัครอย่างน้อย 1 รายการเพื่อวิเคราะห์</span>
                                            ) : (
                                                <span>พร้อมวิเคราะห์ <strong className="text-[#4169E1] font-bold">{selectedAppIds.length}</strong> รายการ</span>
                                            )}
                                        </div>
                                    </div>

                                    {[...applicants]
                                        .sort((a, b) => (b.AIScreening?.skill_score || 0) - (a.AIScreening?.skill_score || 0))
                                        .map((app, idx) => {
                                            const candidateName = app.Candidate
                                                ? `${app.Candidate.first_name} ${app.Candidate.last_name}`
                                                : "ไม่ระบุชื่อผู้สมัคร";

                                            const hasScore = !!app.AIScreening;
                                            const score = app.AIScreening?.skill_score || 0;
                                            const status = analyzingStates[app.ID] || (hasScore ? "done" : "idle");

                                            const scoreColor = score >= 80
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                : score >= 50
                                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                                    : score > 0
                                                        ? "bg-rose-50 text-rose-600 border-rose-200"
                                                        : "bg-slate-100 text-slate-500 border-slate-200";

                                            // Parse criteria
                                            const matchedJob = jobs.find(j => j.ID.toString() === selectedJobId);
                                            const criteriaMap = parseCriteria(matchedJob?.criteria || "");
                                            const breakdown = parseBreakdownFromStrengths(app.AIScreening?.strengths, criteriaMap);

                                            return (
                                                <div key={app.ID || idx} className={`rounded-2xl border transition-all flex flex-col font-sans ${
                                                    selectedAppIds.includes(app.ID)
                                                        ? "bg-white border-indigo-200 shadow-sm hover:shadow-md"
                                                        : "bg-slate-50/50 border-slate-200/60 opacity-75"
                                                }`}>
                                                    {/* ─── Main Compact Row Header (หน้าหลัก) ─── */}
                                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">

                                                        {/* 1. Checkbox + Rank & Candidate Info */}
                                                        <div className="flex items-center gap-3 min-w-[220px]">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedAppIds.includes(app.ID)}
                                                                onChange={() => toggleSelectApplicant(app.ID)}
                                                                className="w-4 h-4 text-[#4169E1] rounded border-slate-300 focus:ring-[#4169E1] cursor-pointer shrink-0 transition-transform active:scale-90"
                                                                title="เลือก/ยกเลิกเพื่อวิเคราะห์ AI"
                                                            />
                                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#4169E1] font-mono font-black text-xs flex items-center justify-center shrink-0">
                                                                #{idx + 1}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-slate-800 text-sm truncate max-w-[180px]" title={candidateName}>
                                                                        {candidateName}
                                                                    </h4>
                                                                    {app.resume_url && (
                                                                        <a
                                                                            href={(apiClient.defaults.baseURL || "").replace("/api", "") + app.resume_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-[10px] text-[#4169E1] bg-blue-50 hover:bg-blue-100 font-bold px-2 py-0.5 rounded transition-all shrink-0"
                                                                        >
                                                                            Resume
                                                                        </a>
                                                                    )}
                                                                    {/* Status Badge */}
                                                                    {(() => {
                                                                        const appStatus = app.Status || app.status || "รอพิจารณา";
                                                                        const isShortlisted = appStatus === "รอนัดสัมภาษณ์" || appStatus === "shortlisted";
                                                                        const isPassed = appStatus === "ผ่าน" || appStatus === "ผ่านการคัดเลือก" || appStatus === "approved";
                                                                        const isInterviewed = appStatus === "นัดสัมภาษณ์แล้ว" || appStatus === "interview";
                                                                        const isRejected = appStatus === "ไม่ผ่าน" || appStatus === "ปฏิเสธ" || appStatus === "rejected";

                                                                        const badgeStyle = isPassed
                                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                            : isShortlisted
                                                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                                : isInterviewed
                                                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                                    : isRejected
                                                                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                                                                        : "bg-amber-50 text-amber-700 border-amber-200";

                                                                        return (
                                                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
                                                                                {appStatus}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <p className="text-xs text-slate-400 truncate mt-0.5" title={candidateName}>
                                                                    {app.Candidate?.email || "ไม่มีอีเมล"} • {app.Candidate?.phone || "ไม่มีเบอร์"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* 2. Criteria Breakdown Badges (แสดงแค่ Criteria และคะแนนเกณฑ์) */}
                                                        <div className="flex-1 overflow-x-auto flex items-center gap-2 py-1">
                                                            {status === "done" && Object.entries(breakdown).map(([cName, info]: any, cIdx) => {
                                                                const percent = info.max > 0 ? (info.score / info.max) * 100 : 0;
                                                                const badgeColor = percent >= 80
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : percent >= 50
                                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                        : "bg-rose-50 text-rose-700 border-rose-200";

                                                                return (
                                                                    <div key={cIdx} className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold whitespace-nowrap flex items-center gap-1.5 ${badgeColor}`}>
                                                                        <span className="text-slate-500 font-normal truncate max-w-[130px]">{cName}:</span>
                                                                        <span className="font-bold font-mono">{info.score}/{info.max}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {status === "ai" && (
                                                                <span className="text-xs text-[#4169E1] font-bold flex items-center gap-1.5 animate-pulse bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {AVAILABLE_AI_MODELS.find(m => m.id === selectedModel)?.badge || "🤖 AI"} กำลังวิเคราะห์คะแนน...
                                                                </span>
                                                            )}
                                                            {status === "ocr" && (
                                                                <span className="text-xs text-amber-600 font-bold flex items-center gap-1.5 animate-pulse bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> 📄 กำลังสแกนอ่านไฟล์เอกสาร (OCR)...
                                                                </span>
                                                            )}
                                                            {status === "saving" && (
                                                                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 animate-pulse bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> 💾 กำลังบันทึกผลลง Database...
                                                                </span>
                                                            )}
                                                            {status === "idle" && (
                                                                <span className="text-xs text-slate-400 font-medium">
                                                                    รอคัดกรองคะแนน...
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 3. PTS Score & Action Buttons (ปุ่มวิเคราะห์เดี่ยว + PTS) */}
                                                        <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                                                            {/* PTS Score Badge (ขยายขนาด PTS ให้ใหญ่ขึ้นเด่นชัด) */}
                                                            <div className={`px-4 py-2 rounded-2xl border-2 text-center font-mono font-black flex items-center gap-1.5 shadow-sm transition-all ${scoreColor}`}>
                                                                <span className="text-xl font-extrabold leading-none">{Math.round(score)}</span>
                                                                <span className="text-xs font-black tracking-wider uppercase opacity-90">PTS</span>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex items-center gap-2">
                                                                {/* ปุ่มดูข้อความ OCR ดิบแบบ Real-Time */}
                                                                <button
                                                                    onClick={() => openOcrModal(app)}
                                                                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-200/80 cursor-pointer"
                                                                    title="เปิดดูข้อความดิบจากการสแกน OCR แบบ Real-Time"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                                                    <span>ข้อความ OCR ดิบ</span>
                                                                </button>

                                                                {/* ปุ่มวิเคราะห์เดี่ยว */}
                                                                <button
                                                                    onClick={() => runSingleAnalysis(app)}
                                                                    disabled={status === "ocr" || status === "ai" || status === "saving"}
                                                                    className="flex items-center gap-1.5 bg-[#4169E1] hover:bg-[#3152c4] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                                                                    title="วิเคราะห์ผู้สมัครรายนี้คนเดียว"
                                                                >
                                                                    <Sparkles className={`w-3.5 h-3.5 ${status === "ocr" || status === "ai" ? "animate-spin" : ""}`} />
                                                                    <span>วิเคราะห์เดี่ยว</span>
                                                                </button>

                                                                {/* ปุ่มลบผู้สมัคร */}
                                                                <button
                                                                    onClick={() => handleDeleteApplicant(app.ID)}
                                                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                                                    title="ลบผู้สมัคร"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ─── 4. Expandable Details Section (ส่วนขยาย: รายละเอียดวิเคราะห์เดี่ยว & ข้อความดิบ) ─── */}
                                                    <details className="group border-t border-slate-100 text-xs bg-slate-50/50 rounded-b-2xl cursor-pointer">
                                                        <summary className="font-bold text-[#4169E1] select-none px-4 py-2 hover:bg-indigo-50/40 transition-all flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5">
                                                                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                                                                ดูรายละเอียดผลวิเคราะห์และข้อความ OCR ฉบับเต็ม
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-slate-400">คลิกเพื่อขยาย/ซ่อน</span>
                                                        </summary>

                                                        <div className="p-4 border-t border-slate-200/60 bg-white space-y-4 rounded-b-2xl">
                                                            {/* AI Detailed Analysis Report */}
                                                            {getCleanStrengths(getStrengthsText(app)).trim() ? (
                                                                <div className="space-y-2">
                                                                    <h5 className="font-extrabold text-[#4169E1] text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                                        <Sparkles className="w-3.5 h-3.5" /> รายละเอียดผลการวิเคราะห์เดี่ยวจาก AI
                                                                    </h5>
                                                                    <div className="bg-indigo-50/30 border border-indigo-100 p-3.5 rounded-xl text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                                                                        {getCleanStrengths(getStrengthsText(app))}
                                                                    </div>
                                                                </div>
                                                            ) : status === "ai" || status === "ocr" || status === "saving" ? (
                                                                <div className="text-[#4169E1] text-xs font-bold bg-blue-50/60 border border-blue-200 p-3.5 rounded-xl animate-pulse flex items-center gap-2">
                                                                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                                                    <span>กำลังวิเคราะห์และประมวลผลด้วย AI ({AVAILABLE_AI_MODELS.find(m => m.id === selectedModel)?.name || "Claude Sonnet 5"})...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-slate-400 text-xs italic bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                                                                    ยังไม่มีผลการวิเคราะห์เดี่ยวจาก AI (กรุณากดปุ่ม "วิเคราะห์เดี่ยว" ด้านบนเพื่อเริ่มประมวลผล)
                                                                </div>
                                                            )}

                                                            {/* Raw Text OCR display */}
                                                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                                                <h5 className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">
                                                                    📄 ข้อความดิบจากการสแกนเอกสาร (OCR Raw Text)
                                                                </h5>
                                                                <textarea
                                                                    readOnly
                                                                    value={(() => {
                                                                        const txt = app.ResumeText || app.resume_text || "";
                                                                        if (txt.trim().startsWith("ข้อมูลประวัติย่อ") || txt.includes("/api/upload/")) {
                                                                            return "ยังไม่ได้ทำการสแกนข้อความ OCR (กรุณากด 'วิเคราะห์เดี่ยว' เพื่อเริ่มสแกนรูปภาพและถอดข้อความ)";
                                                                        }
                                                                        return txt;
                                                                    })()}
                                                                    rows={4}
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[10px] resize-none outline-none leading-normal text-slate-600"
                                                                />
                                                            </div>
                                                        </div>
                                                    </details>
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

            {/* 📌 MODAL: HR กรอกประวัติ/Resume ของผู้สมัครด้วยตนเอง */}
            {showManualAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleUp flex flex-col font-sans max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-[#4169E1] text-white p-5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="font-black text-lg">กรอกประวัติ / เพิ่มผู้สมัครงานด้วยตนเอง</h3>
                                <p className="text-white/80 text-xs mt-0.5">เพิ่มประวัติและกรอก Resume ของผู้สมัครเข้าระบบคัดกรองโดยตรง</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowManualAddModal(false);
                                    setManualError("");
                                }}
                                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleManualAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {manualError && (
                                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-500 font-semibold flex items-center gap-2">
                                    <X className="w-4.5 h-4.5 text-red-500 shrink-0" />
                                    <span>{manualError}</span>
                                </div>
                            )}

                            {/* Section 1: ข้อมูลผู้สมัคร */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. ข้อมูลส่วนตัวผู้สมัคร</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-505">ชื่อจริง *</label>
                                        <input
                                            type="text"
                                            required
                                            value={manualFirstName}
                                            onChange={e => setManualFirstName(e.target.value)}
                                            placeholder="เช่น ณภัทร"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-sans"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-505">นามสกุล *</label>
                                        <input
                                            type="text"
                                            required
                                            value={manualLastName}
                                            onChange={e => setManualLastName(e.target.value)}
                                            placeholder="เช่น อนันต์"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-sans"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-505">อีเมล *</label>
                                        <input
                                            type="email"
                                            required
                                            value={manualEmail}
                                            onChange={e => setManualEmail(e.target.value)}
                                            placeholder="candidate@example.com"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-sans"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-505">เบอร์ติดต่อ *</label>
                                        <input
                                            type="text"
                                            required
                                            value={manualPhone}
                                            onChange={e => setManualPhone(e.target.value)}
                                            placeholder="081-234-5678"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white transition-all font-sans"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Section 2: ตำแหน่งงานที่ต้องการยื่นสมัคร */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">2. เลือกตำแหน่งงานที่จะยื่นสมัคร *</label>
                                <select
                                    required
                                    value={manualJobId}
                                    onChange={e => setManualJobId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 font-sans"
                                >
                                    <option value="">-- เลือกตำแหน่งงาน --</option>
                                    {jobs.map(job => (
                                        <option key={job.ID} value={job.ID.toString()}>{job.title}</option>
                                    ))}
                                </select>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Section 3: Resume */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">3. อัปโหลด Resume (.pdf, .txt, รูปภาพ) *</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[#4169E1] transition-all bg-slate-50/50">
                                    <input
                                        type="file"
                                        accept=".txt,.pdf,image/*"
                                        required
                                        id="manual-resume-uploader"
                                        className="hidden"
                                        onChange={e => e.target.files?.[0] && handleManualResumeUpload(e.target.files[0])}
                                    />
                                    <label htmlFor="manual-resume-uploader" className="cursor-pointer block space-y-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-[#4169E1]">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        {manualResumeFileName ? (
                                            <div>
                                                <p className="text-xs font-bold text-[#4169E1]">{manualResumeFileName}</p>
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

                            <hr className="border-slate-100" />

                            {/* Section 4: Transcript */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">4. อัปโหลด Transcript / ใบแสดงผลการศึกษา *</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[#4169E1] transition-all bg-slate-50/50">
                                    <input
                                        type="file"
                                        accept=".txt,.pdf,image/*"
                                        required
                                        id="manual-transcript-uploader"
                                        className="hidden"
                                        onChange={e => e.target.files?.[0] && handleManualTranscriptUpload(e.target.files[0])}
                                    />
                                    <label htmlFor="manual-transcript-uploader" className="cursor-pointer block space-y-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-[#4169E1]">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        {manualTranscriptFileName ? (
                                            <div>
                                                <p className="text-xs font-bold text-[#4169E1]">{manualTranscriptFileName}</p>
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

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/30 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowManualAddModal(false);
                                        setManualError("");
                                    }}
                                    className="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 text-xs"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={manualSubmitting}
                                    className="bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                                >
                                    {manualSubmitting ? "กำลังบันทึกผู้สมัคร..." : "บันทึกและส่งสมัคร"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Real-Time Raw OCR Text Modal ── */}
            {ocrModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        ข้อความ OCR ดิบจาก Resume - {ocrModalCandidateName}
                                    </h3>
                                    <p className="text-slate-400 text-xs flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Typhoon OCR Real-Time Extraction
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOcrModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Toolbar & Search */}
                        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                            {/* Search in OCR */}
                            <div className="relative w-full sm:w-72">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={ocrSearchQuery}
                                    onChange={e => setOcrSearchQuery(e.target.value)}
                                    placeholder="ค้นหาข้อความดิบใน OCR..."
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-100/80 border border-slate-200/70 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
                                />
                            </div>

                            {/* Live Stats */}
                            <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold w-full sm:w-auto justify-end">
                                <span>อักขระ: <strong className="text-slate-800 font-mono">{ocrModalText.length.toLocaleString()}</strong> ตัว</span>
                                <span>คำ: <strong className="text-slate-800 font-mono">{ocrModalText.trim() ? ocrModalText.trim().split(/\s+/).length.toLocaleString() : 0}</strong> คำ</span>
                            </div>
                        </div>

                        {/* Monospace Raw OCR Content Area */}
                        <div className="p-6 flex-1 overflow-y-auto bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed select-text">
                            <pre className="whitespace-pre-wrap break-words font-mono">
                                {ocrModalText}
                            </pre>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                            {ocrModalAppObj && (
                                <button
                                    onClick={() => {
                                        setOcrModalOpen(false);
                                        runSingleAnalysis(ocrModalAppObj, true);
                                    }}
                                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-indigo-200/60"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>สแกน Typhoon OCR ใหม่</span>
                                </button>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    onClick={() => copyOcrToClipboard(ocrModalText)}
                                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                                >
                                    {ocrCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{ocrCopied ? "คัดลอกแล้ว!" : "คัดลอกข้อความ OCR"}</span>
                                </button>
                                <button
                                    onClick={() => setOcrModalOpen(false)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                >
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
