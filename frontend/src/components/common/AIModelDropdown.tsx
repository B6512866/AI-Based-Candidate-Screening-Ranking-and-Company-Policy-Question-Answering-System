import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Cpu, Zap, Brain, Gem, Check } from "lucide-react";

export interface AIModelOption {
    id: string;
    name: string;
    badge: string;
    provider: "fine-tuned" | "typhoon" | "openai" | "claude" | "gemini";
    description: string;
    isFineTuned?: boolean;
}

export const AVAILABLE_AI_MODELS: AIModelOption[] = [
    {
        id: "typhoon-v2.5-instruct",
        name: "Typhoon 2.5 (ไม่ต้องใช้ API Key - ฟรีในเครื่อง 100%)",
        badge: "🌀 Typhoon 2.5 🆓 ไม่ต้องใช้ Key",
        provider: "typhoon",
        description: "โมเดลภาษาไทยประมวลผลโลคัล LoRA Adapter Fine-Tuned (ไม่ต้องใช้ API Key, ฟรี 100%, ไม่ติด Limit)",
        isFineTuned: true
    },
    {
        id: "gemini-3.5-flash",
        name: "Gemini 3.5 Flash (Resume Extraction Prompt)",
        badge: "💎 Gemini 3.5 Flash 🔑 ใช้ GEMINI_API_KEY",
        provider: "gemini",
        description: "โมเดล Google Gemini 3.5 Flash Cloud API (ใช้ GEMINI_API_KEY ในไฟล์ .env)"
    },
    {
        id: "claude-sonnet-5",
        name: "Claude Sonnet 5 (Cloud API)",
        badge: "🧠 Claude Sonnet 5 🔑 ใช้ ANTHROPIC_API_KEY",
        provider: "claude",
        description: "โมเดล Anthropic Claude Sonnet 5 Cloud API ประสิทธิภาพระดับท็อป (ใช้ ANTHROPIC_API_KEY ในไฟล์ .env)"
    }
];

interface AIModelDropdownProps {
    selectedModelId: string;
    onSelectModel: (modelId: string) => void;
    label?: string;
    compact?: boolean;
    className?: string;
}

export default function AIModelDropdown({
    selectedModelId,
    onSelectModel,
    label = "เลือกโมเดล AI:",
    compact = false,
    className = ""
}: AIModelDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentModel = AVAILABLE_AI_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_AI_MODELS[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getModelIcon = (provider: string) => {
        switch (provider) {
            case "fine-tuned":
                return <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />;
            case "typhoon":
                return <Cpu className="w-4 h-4 text-indigo-500" />;
            case "openai":
                return <Zap className="w-4 h-4 text-emerald-500" />;
            case "claude":
                return <Brain className="w-4 h-4 text-purple-500" />;
            case "gemini":
                return <Gem className="w-4 h-4 text-blue-500" />;
            default:
                return <Sparkles className="w-4 h-4 text-indigo-500" />;
        }
    };

    return (
        <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
            {!compact && label && (
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition-all shadow-2xs cursor-pointer ${
                    compact ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-xs"
                }`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {getModelIcon(currentModel.provider)}
                    <div className="flex flex-col items-start text-left min-w-0">
                        <span className="font-extrabold text-slate-800 truncate max-w-[200px] sm:max-w-[280px]">
                            {currentModel.name}
                        </span>
                        {!compact && (
                            <span className="text-[10px] text-slate-400 font-medium">
                                {currentModel.badge}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            รายการโมเดล AI ที่รองรับ
                        </span>
                        <span className="text-[10px] bg-indigo-50 text-[#4169E1] font-bold px-2 py-0.5 rounded-full">
                            Cloud API & Fine-Tuned
                        </span>
                    </div>

                    <div className="space-y-1 mt-1 max-h-72 overflow-y-auto">
                        {AVAILABLE_AI_MODELS.map((model) => {
                            const isSelected = model.id === selectedModelId;
                            return (
                                <button
                                    key={model.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectModel(model.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2.5 border ${
                                        isSelected
                                            ? "bg-indigo-50/60 border-indigo-200 text-[#4169E1]"
                                            : "border-transparent hover:bg-slate-50 text-slate-700"
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                        <div className="mt-0.5">{getModelIcon(model.provider)}</div>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-xs text-slate-800">{model.name}</span>
                                                {model.isFineTuned && (
                                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                                                        Fine-Tuned
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                                                {model.description}
                                            </p>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <Check className="w-4 h-4 text-[#4169E1] shrink-0 mt-0.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
