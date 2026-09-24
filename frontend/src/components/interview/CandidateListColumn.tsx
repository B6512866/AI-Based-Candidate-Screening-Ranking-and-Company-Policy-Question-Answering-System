import { useState, useRef, useEffect } from "react";
import { Search, Filter, Check, CheckCircle2, Clock, Mail } from "lucide-react";

export interface CandidateListColumnProps {
    candidates: any[];
    loadingCandidates: boolean;
    selectedAppId: number | null;
    onSelectCandidate: (app: any) => void;
    interviews: any[];
    statusMap: Record<string, string>;
    statusStyles: Record<string, string>;
}

/**
 * คอลัมน์ที่ 1: รายชื่อผู้สมัคร (ค้นหา + กรองตำแหน่งงาน + เลือกผู้สมัครเพื่อนัดสัมภาษณ์)
 */
export function CandidateListColumn({
    candidates,
    loadingCandidates,
    selectedAppId,
    onSelectCandidate,
    interviews,
    statusMap,
    statusStyles,
}: CandidateListColumnProps) {
    const [searchCandidate, setSearchCandidate] = useState("");
    const [filterPosition, setFilterPosition] = useState("ทั้งหมด");
    const [openPositionDropdown, setOpenPositionDropdown] = useState(false);
    const positionDropdownRef = useRef<HTMLDivElement>(null);

    // ปิด Dropdown เมื่อคลิกนอกพื้นที่
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (positionDropdownRef.current && !positionDropdownRef.current.contains(e.target as Node)) {
                setOpenPositionDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 1. กรองผู้สมัครเฉพาะที่มีสถานะ "รอนัดสัมภาษณ์" (หรือมีรายการสัมภาษณ์เดิมอยู่แล้ว)
    const eligibleCandidates = candidates.filter((app) => {
        const appStatus = app.status || app.Status || "";
        const hasInterview = interviews.some((iv) => {
            const ivAppId = iv.application_id || iv.ApplicationID || iv.Application?.ID;
            return ivAppId === app.ID;
        });
        return (
            appStatus === "รอนัดสัมภาษณ์" ||
            appStatus === "interview" ||
            appStatus === "นัดสัมภาษณ์แล้ว" ||
            appStatus === "shortlisted" ||
            hasInterview
        );
    });

    // 2. คำนวณรายชื่อตำแหน่งงานทั้งหมดสำหรับตัวกรอง
    const positionList = Array.from(
        new Set(eligibleCandidates.map((app) => app.JobPosition?.title || app.position || "").filter(Boolean))
    );

    // 3. กรองผู้สมัครตามคำค้นหาและตำแหน่ง
    const filteredCandidates = eligibleCandidates.filter((app) => {
        const name = `${app.Candidate?.first_name || ""} ${app.Candidate?.last_name || ""}`.toLowerCase();
        const pos = (app.JobPosition?.title || app.position || "").toLowerCase();
        const q = searchCandidate.toLowerCase();
        const matchSearch = name.includes(q) || pos.includes(q);
        const matchPosition =
            filterPosition === "ทั้งหมด" ||
            (app.JobPosition?.title || app.position || "") === filterPosition;
        return matchSearch && matchPosition;
    });

    return (
        <div className="lg:col-span-3 bg-slate-50/80 rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-700">เลือกผู้สมัคร</h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    เฉพาะรอนัดสัมภาษณ์
                </span>
            </div>

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
                            className={`w-full px-3 py-2 text-xs text-left font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                filterPosition === "ทั้งหมด"
                                    ? "bg-indigo-50/70 text-[#4169E1] font-bold"
                                    : "text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            <span className="truncate">ทั้งหมด</span>
                            {filterPosition === "ทั้งหมด" && (
                                <Check className="w-3.5 h-3.5 text-[#4169E1] flex-shrink-0" />
                            )}
                        </button>
                        {positionList.map((pos) => (
                            <button
                                key={pos}
                                type="button"
                                onClick={() => {
                                    setFilterPosition(pos);
                                    setOpenPositionDropdown(false);
                                }}
                                title={pos}
                                className={`w-full px-3 py-2 text-xs text-left font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                    filterPosition === pos
                                        ? "bg-indigo-50/70 text-[#4169E1] font-bold"
                                        : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                <span className="truncate pr-2">{pos}</span>
                                {filterPosition === pos && (
                                    <Check className="w-3.5 h-3.5 text-[#4169E1] flex-shrink-0" />
                                )}
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
                    placeholder="ค้นหาชื่อผู้สมัคร..."
                    value={searchCandidate}
                    onChange={(e) => setSearchCandidate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/20 transition-all"
                />
            </div>

            {/* Candidate List with Radio selection */}
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                {loadingCandidates ? (
                    <p className="text-xs text-slate-400 text-center py-6">กำลังโหลดข้อมูล...</p>
                ) : filteredCandidates.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">ไม่พบผู้สมัครที่มีสถานะ "รอนัดสัมภาษณ์"</p>
                ) : (
                    filteredCandidates.map((app) => {
                        const existingIv = interviews.find((iv) => {
                            const ivAppId = iv.application_id || iv.ApplicationID || iv.Application?.ID;
                            return ivAppId === app.ID;
                        });

                        return (
                            <label
                                key={app.ID}
                                onClick={() => onSelectCandidate(app)}
                                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                    selectedAppId === app.ID
                                        ? "bg-[#4169E1]/10 border border-[#4169E1]/30 shadow-sm"
                                        : "hover:bg-white border border-transparent"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="candidate"
                                    checked={selectedAppId === app.ID}
                                    onChange={() => onSelectCandidate(app)}
                                    className="accent-[#4169E1] w-4 h-4 mt-0.5 flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1.5">
                                        <p className="text-sm font-bold text-slate-800 truncate">
                                            {app.Candidate?.first_name} {app.Candidate?.last_name}
                                        </p>
                                         <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-[#4169E1] border border-indigo-100/80 flex-shrink-0">
                                             {app.application_code || app.ApplicationCode || `APP-${10000 + app.ID}`}
                                         </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium truncate">
                                        {app.JobPosition?.title || app.position || "-"}
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5" title={app.Candidate?.email || "-"}>
                                        <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                        <span className="truncate">{app.Candidate?.email || "-"}</span>
                                    </p>
                                    {existingIv ? (
                                        (() => {
                                            let dateStr = "";
                                            let timeStr = "";
                                            try {
                                                const dt = new Date(existingIv.interview_datetime);
                                                const d = String(dt.getDate()).padStart(2, "0");
                                                const m = String(dt.getMonth() + 1).padStart(2, "0");
                                                const y = dt.getFullYear();
                                                const h = String(dt.getHours()).padStart(2, "0");
                                                const min = String(dt.getMinutes()).padStart(2, "0");
                                                dateStr = `${d}/${m}/${y}`;
                                                timeStr = `${h}:${min} น.`;
                                            } catch {}

                                            return (
                                                <div className="mt-1.5 pt-1.5 border-t border-slate-100/80 space-y-1">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                                            <span>นัดแล้ว {dateStr}</span>
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 whitespace-nowrap ${
                                                                statusStyles[statusMap[existingIv.interview_status] || "รอยืนยัน"] ||
                                                                "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            }`}
                                                        >
                                                            {statusMap[existingIv.interview_status] || existingIv.interview_status}
                                                        </span>
                                                    </div>
                                                    {timeStr && (
                                                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold pl-[18px]">
                                                            <Clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                                            <span>เวลา {timeStr}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100/80 text-[11px] text-slate-400">
                                            <Clock className="w-3 h-3 flex-shrink-0 text-slate-300" />
                                            <span>ยังไม่ได้นัดสัมภาษณ์</span>
                                        </div>
                                    )}
                                </div>
                            </label>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default CandidateListColumn;
