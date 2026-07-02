import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Send, Bot, Wifi, WifiOff } from "lucide-react";
import { getallknowledge } from "../../services/knowledgeService";

const TYPHOON_API = import.meta.env.VITE_TYPHOON_API_URL || "http://localhost:8000";

interface Message {
    id: number;
    from: "bot" | "user";
    text: string;
    streaming?: boolean;
}

// ── ตรวจสอบสถานะ Typhoon ────────────────────────────────────────────
async function checkTyphoon(): Promise<boolean> {
    try {
        const r = await fetch(`${TYPHOON_API}/health`, { signal: AbortSignal.timeout(3000) });
        const d = await r.json();
        return d.chat_model === true;
    } catch {
        return false;
    }
}

export default function EmployeeChat() {
    const { firstName } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            from: "bot",
            text: `สวัสดีครับ${firstName ? " คุณ" + firstName : ""}! ผมคือ HireAI Advisor 🤖\nสามารถถามเรื่องสวัสดิการ นโยบายบริษัท กฎระเบียบ หรือเรื่องอื่นๆ ได้เลยครับ`,
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [online, setOnline] = useState<boolean | null>(null);
    const chatHistory = useRef<{ role: string; content: string }[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── ตรวจสอบ Typhoon เมื่อโหลด ─────────────────────────────────────
    useEffect(() => {
        checkTyphoon().then(setOnline);
        const interval = setInterval(() => checkTyphoon().then(setOnline), 30000);
        return () => clearInterval(interval);
    }, []);

    // ── Scroll to bottom ─────────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput("");

        // เพิ่ม user message
        const userMsg: Message = { id: Date.now(), from: "user", text };
        setMessages(prev => [...prev, userMsg]);
        chatHistory.current.push({ role: "user", content: text });

        setLoading(true);

        // เพิ่ม bot bubble ว่างๆ สำหรับ streaming
        const botId = Date.now() + 1;
        setMessages(prev => [...prev, { id: botId, from: "bot", text: "", streaming: true }]);

        try {
            // ดึงข้อมูลนโยบายและเอกสารทั้งหมดใน knowledge_bases จาก Database ผ่าน Service
            let knowledgeContext = "";
            try {
                const kData = await getallknowledge();
                if (kData && Array.isArray(kData.data) && kData.data.length > 0) {
                    knowledgeContext = "\n\n=== คลังความรู้และนโยบายบริษัททั้งหมด (ดึงจาก Database) ===\n" +
                        kData.data
                            .map((d: { filename: string; content: string }, index: number) => `[เอกสารที่ ${index + 1}: ${d.filename}]\n${d.content.trim()}`)
                            .join("\n\n----------------------------------------\n\n");
                }
            } catch {
                // Ignore if backend knowledge API fetch fails
            }

            const systemPrompt = `คุณคือ HireAI Advisor ผู้ช่วย HR อัจฉริยะขององค์กร มีหน้าที่ตอบคำถามพนักงานเกี่ยวกับนโยบาย สวัสดิการ เวลาทำงาน กฎระเบียบ และคลังความรู้ของบริษัทอย่างถูกต้อง สุภาพ และเป็นมิตร

จงใช้อ้างอิงข้อมูลจากเอกสารทั้งหมดในคลังความรู้บริษัทด้านล่างนี้ในการตอบคำถาม:
${knowledgeContext}

คำแนะนำการตอบ:
- ตอบคำถามให้ตรงประเด็นโดยใช้ข้อมูลจากเอกสารคลังความรู้ด้านบน
- หากพนักงานขอให้สรุป เช่น "แบบสั้นๆ" ให้สรุปหัวข้อสำคัญออกมาเป็นข้อๆ กระชับ ชัดเจน อ่านง่าย`;

            const response = await fetch(`${TYPHOON_API}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: chatHistory.current,
                    system_prompt: systemPrompt,
                    max_new_tokens: 1024,
                }),
            });

            if (!response.ok) throw new Error("AI ไม่ตอบสนอง กรุณาลองใหม่");

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let full = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                full += decoder.decode(value, { stream: true });

                // อัปเดต streaming bubble
                setMessages(prev =>
                    prev.map(m => m.id === botId ? { ...m, text: full } : m)
                );
            }

            // เสร็จ streaming
            setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, streaming: false } : m)
            );
            chatHistory.current.push({ role: "assistant", content: full });

        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เชื่อมต่อ AI ไม่ได้ กรุณาเปิด Typhoon AI ก่อน";
            setMessages(prev =>
                prev.map(m => m.id === botId
                    ? { ...m, text: `⚠️ ${errMsg}`, streaming: false }
                    : m)
            );
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    return (
        <div className="flex flex-col h-full p-6 gap-4">
            {/* Status bar */}
            <div className="flex items-center gap-2">
                {online === null ? (
                    <span className="text-xs text-slate-400">กำลังตรวจสอบ AI...</span>
                ) : online ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <Wifi className="w-3.5 h-3.5" />
                        Typhoon AI พร้อมใช้งาน
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs text-red-500 font-semibold">
                        <WifiOff className="w-3.5 h-3.5" />
                        Typhoon AI ออฟไลน์ — กรุณาเปิด backend ที่ port 8000
                    </span>
                )}
            </div>

            {/* Chat window */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.from === "user" ? "flex-row-reverse ml-auto" : ""} max-w-[80%] ${msg.from === "user" ? "ml-auto" : ""}`}
                        >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.from === "bot"
                                ? "bg-indigo-100"
                                : "bg-gradient-to-tr from-emerald-400 to-teal-500 text-white text-xs font-bold"
                                }`}>
                                {msg.from === "bot"
                                    ? <Bot className="w-4 h-4 text-[#4169E1]" />
                                    : (firstName?.[0] || "E")}
                            </div>

                            {/* Bubble */}
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.from === "bot"
                                ? "bg-white border border-slate-100 shadow-sm text-slate-700 rounded-tl-none"
                                : "bg-[#4169E1] text-white rounded-tr-none"
                                }`}>
                                {msg.text || (
                                    <span className="flex items-center gap-2 text-slate-400 text-xs">
                                        <span className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                        </span>
                                        กำลังคิด...
                                    </span>
                                )}
                                {msg.streaming && msg.text && (
                                    <span className="inline-block w-0.5 h-4 bg-slate-400 ml-1 animate-pulse align-middle" />
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="ถามคำถามเรื่องนโยบายบริษัทที่นี่..."
                        disabled={loading}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/30 focus:bg-white transition-all text-sm disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-[#4169E1] hover:bg-[#5a52e0] text-white px-5 py-3 rounded-xl shadow shadow-indigo-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
