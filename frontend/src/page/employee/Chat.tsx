import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Send, Bot, Wifi, WifiOff, MessageSquare, Plus, Search, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { getallknowledge } from "../../services/knowledgeService";
import { getChatHistory, saveChatMessage, getChatSessions, ChatSessionData } from "../../services/chatService";

const TYPHOON_API = import.meta.env.VITE_TYPHOON_API_URL || "http://localhost:8000";

interface Message {
    id: number;
    from: "bot" | "user";
    text: string;
    streaming?: boolean;
}

// ดึงสุ่มเลขสั้นๆ เพื่อระบุเป็นรหัสห้อง (SessionID)
function generateSessionId() {
    return "session-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
}

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
    
    // State สำหรับแชต
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
    
    // State สำหรับการจัดการห้องแชต (Sessions)
    const [sessions, setSessions] = useState<ChatSessionData[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [currentSessionTitle, setCurrentSessionTitle] = useState<string>("");

    // State สำหรับการค้นหา
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ sessionId: string; text: string }[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // 1. ตรวจสอบสถานะโมเดล AI ออนไลน์
    useEffect(() => {
        checkTyphoon().then(setOnline);
        const interval = setInterval(() => checkTyphoon().then(setOnline), 30000);
        return () => clearInterval(interval);
    }, []);

    // 2. โหลดรายการห้องแชตทั้งหมดจากฝั่งหลังบ้านตอนเริ่มแรก
    const loadSessions = async (selectLatest = true) => {
        try {
            const sRes = await getChatSessions();
            if (sRes && sRes.data) {
                setSessions(sRes.data);
                
                // หากดึงข้อมูลครั้งแรก ให้ดึงประวัติห้องแชตล่าสุดมาเปิดให้เลย
                if (selectLatest && sRes.data.length > 0 && !currentSessionId) {
                    const latest = sRes.data[0];
                    handleSelectSession(latest.session_id, latest.session_title);
                } else if (selectLatest && sRes.data.length === 0) {
                    // หากยังไม่มีห้องแชตเลย ให้สร้างเธรดห้องแชตใหม่เริ่มแรกขึ้นมา
                    setCurrentSessionId(generateSessionId());
                    setCurrentSessionTitle("แชตใหม่");
                }
            }
        } catch (error) {
            console.error("โหลดรายการห้องแชตล้มเหลว:", error);
        }
    };

    useEffect(() => {
        loadSessions(true);
    }, []);

    // 3. เลื่อนลงไปล่างสุดเมื่อคุยกันเสร็จ
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 4. สลับเปิดห้องแชตที่เลือก
    const handleSelectSession = async (sessId: string, sessTitle: string) => {
        setCurrentSessionId(sessId);
        setCurrentSessionTitle(sessTitle);
        setLoading(true);
        try {
            const hRes = await getChatHistory(sessId);
            if (hRes && hRes.data) {
                const formatted = hRes.data.flatMap((msg) => [
                    { id: msg.ID * 2, from: "user" as const, text: msg.question },
                    { id: msg.ID * 2 + 1, from: "bot" as const, text: msg.answer }
                ]);
                setMessages(formatted.length > 0 ? formatted : [
                    {
                        id: 1,
                        from: "bot",
                        text: `สวัสดีครับ${firstName ? " คุณ" + firstName : ""}! ยินดีต้อนรับกลับเข้าสู่เธรด: ${sessTitle} 🤖\nต้องการสนทนาเรื่องอะไรเพิ่มเติมสอบถามได้เลยครับ`,
                    }
                ]);
                chatHistory.current = hRes.data.flatMap((msg) => [
                    { role: "user", content: msg.question },
                    { role: "assistant", content: msg.answer }
                ]);
            }
        } catch (error) {
            console.error("ดึงประวัติแชตของห้องล้มเหลว:", error);
        } finally {
            setLoading(false);
        }
    };

    // 5. ปุ่มเริ่มแชตใหม่ (+ New Chat)
    const handleNewChat = () => {
        const newId = generateSessionId();
        setCurrentSessionId(newId);
        setCurrentSessionTitle("แชตใหม่");
        setMessages([
            {
                id: Date.now(),
                from: "bot",
                text: `เริ่มต้นห้องแชตใหม่แล้วครับ คุณ${firstName || "พนักงาน"}! ถามคำถามเกี่ยวกับบริษัทที่นี่ได้เลยครับ 🤖`,
            },
        ]);
        chatHistory.current = [];
        setInput("");
        inputRef.current?.focus();
    };

    // 6. ส่งข้อความแชต
    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput("");

        const userMsg: Message = { id: Date.now(), from: "user", text };
        setMessages(prev => [...prev, userMsg]);
        chatHistory.current.push({ role: "user", content: text });

        setLoading(true);

        const botId = Date.now() + 1;
        setMessages(prev => [...prev, { id: botId, from: "bot", text: "", streaming: true }]);

        try {
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
                // Ignore
            }

            const systemPrompt = `คุณคือ HireAI Advisor ผู้ช่วย HR อัจฉริยะขององค์กร มีหน้าที่ตอบคำถามพนักงานเกี่ยวกับนโยบาย สวัสดิการ เวลาทำงาน กฎระเบียบ และคลังความรู้ของบริษัทอย่างถูกต้อง สุภาพ และเป็นมิตร\n\nจงใช้อ้างอิงข้อมูลจากเอกสารทั้งหมดในคลังความรู้บริษัทด้านล่างนี้ในการตอบคำถาม:\n${knowledgeContext}\n\nคำแนะนำการตอบ:\n- ตอบคำถามให้ตรงประเด็นโดยใช้ข้อมูลจากเอกสารคลังความรู้ด้านบน\n- หากพนักงานขอให้สรุป ให้แบ่งหัวข้อสำคัญออกมาเป็นข้อๆ กระชับ ชัดเจน`;

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

                setMessages(prev =>
                    prev.map(m => m.id === botId ? { ...m, text: full } : m)
                );
            }

            setMessages(prev =>
                prev.map(m => m.id === botId ? { ...m, streaming: false } : m)
            );
            chatHistory.current.push({ role: "assistant", content: full });

            // ตรวจสอบชื่อหัวข้อห้องแชต (ถ้าเป็นห้องใหม่และคำถามแรก ให้เอาข้อความคำถามมาทำเป็นชื่อหัวข้อ)
            let updatedTitle = currentSessionTitle;
            if (currentSessionTitle === "แชตใหม่" || currentSessionTitle === "") {
                updatedTitle = text.length > 20 ? text.substring(0, 20) + "..." : text;
                setCurrentSessionTitle(updatedTitle);
            }

            // บันทึกลง PostgreSQL Database
            try {
                await saveChatMessage(text, full, currentSessionId, updatedTitle);
                // รีโหลดเมนูห้องแชตฝั่งข้างซ้าย
                loadSessions(false);
            } catch (dbErr) {
                console.error("บันทึกแชตล้มเหลว:", dbErr);
            }

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

    // 7. กลไกการค้นหาข้อความเดิม (Search)
    const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        // ค้นหาในประวัติข้อความของทุกห้องแชตที่มีอยู่
        const matches: { sessionId: string; text: string }[] = [];
        try {
            // วนดึงข้อความจากประวัติของแต่ละเซสชันมาค้นหา (หรือหากต้องการประมวลผลเร็ว สามารถทำค้นหาฝั่ง backend ได้เช่นกัน)
            for (const sess of sessions) {
                const hRes = await getChatHistory(sess.session_id);
                if (hRes && hRes.data) {
                    for (const m of hRes.data) {
                        if (
                            m.question.toLowerCase().includes(query.toLowerCase()) ||
                            m.answer.toLowerCase().includes(query.toLowerCase())
                        ) {
                            matches.push({
                                sessionId: sess.session_id,
                                text: `[${sess.session_title}] ค้นพบคำว่า "${query}": ...${m.question.substring(0, 15)}...`
                            });
                            break; // เจอ 1 จุดในห้องนี้ถือว่าเจอแล้ว
                        }
                    }
                }
            }
            setSearchResults(matches.slice(0, 5)); // เลือกแสดงผล 5 รายการแรกที่พบ
            setShowSearchDropdown(true);
        } catch (err) {
            console.error("ค้นหาข้อความล้มเหลว:", err);
        }
    };

    return (
        <div className={`flex h-full p-6 bg-slate-50/50 transition-all duration-300 ${isSidebarOpen ? "gap-6" : "gap-0"}`}>
            {/* 🚪 Left Sidebar - ห้องสนทนา (Threads) & ค้นหา */}
            <div className={`transition-all duration-300 overflow-hidden flex flex-col ${
                isSidebarOpen 
                    ? "w-80 p-4 opacity-100 border border-slate-100" 
                    : "w-0 p-0 opacity-0 border-0 pointer-events-none"
            } bg-white rounded-2xl shadow-sm gap-4`}>
                {/* แถวบนสุด: ปุ่มแชตใหม่ และ ปุ่มปิดแถบข้าง */}
                <div className="flex items-center gap-2 w-full">
                    <button
                        onClick={handleNewChat}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#4169E1] hover:bg-[#5a52e0] text-white rounded-xl font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-95 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        แชตใหม่
                    </button>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-slate-500 transition-all active:scale-95"
                        title="ซ่อนประวัติแชต"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </div>

                {/* กล่องค้นหาข้อความเดิม */}
                <div className="relative">
                    <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-[#4169E1]/30 focus-within:bg-white transition-all">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="ค้นหาข้อความแชต..."
                            className="bg-transparent border-none text-xs outline-none w-full text-slate-700"
                        />
                    </div>

                    {/* ค้นหาพบ Dropdown */}
                    {showSearchDropdown && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 shadow-lg rounded-xl z-50 overflow-hidden text-xs">
                            {searchResults.map((res, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        const matchingSess = sessions.find(s => s.session_id === res.sessionId);
                                        if (matchingSess) {
                                            handleSelectSession(matchingSess.session_id, matchingSess.session_title);
                                        }
                                        setSearchQuery("");
                                        setShowSearchDropdown(false);
                                    }}
                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-none border-slate-50 text-slate-600 truncate transition-colors"
                                >
                                    {res.text}
                                </div>
                            ))}
                        </div>
                    )}
                    {showSearchDropdown && searchQuery && searchResults.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 shadow-lg rounded-xl z-50 p-3 text-center text-xs text-slate-400">
                            ไม่พบข้อความเดิม
                        </div>
                    )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* รายการประวัติแชตเก่า */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <span className="text-[14px] uppercase tracking-wider font-bold text-slate-400 block px-2">ประวัติการสนทนา</span>
                    {sessions.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">ไม่มีประวัติห้องสนทนา</div>
                    ) : (
                        sessions.map((sess) => (
                            <button
                                key={sess.session_id}
                                onClick={() => handleSelectSession(sess.session_id, sess.session_title)}
                                className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all text-left text-xs ${
                                    currentSessionId === sess.session_id
                                        ? "bg-slate-100 font-semibold text-[#4169E1]"
                                        : "hover:bg-slate-50 text-slate-600"
                                }`}
                            >
                                <MessageSquare className={`w-4 h-4 shrink-0 ${
                                    currentSessionId === sess.session_id ? "text-[#4169E1]" : "text-slate-400"
                                }`} />
                                <span className="truncate flex-1">{sess.session_title || "หัวข้อแชตไม่มีชื่อ"}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* 💬 Right Chat Interface - บอร์ดพิมพ์คุย */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                {/* หัวเธรดแชต & สถานะ AI */}
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4169E1]/5 hover:bg-[#4169E1]/10 border border-[#4169E1]/10 rounded-xl text-[#4169E1] transition-all text-xs active:scale-95 font-medium shadow-sm"
                                title="แสดงประวัติแชต"
                            >
                                <ChevronRight className="w-4 h-4" />
                                <span>ดูประวัติแชต</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-[#4169E1]" />
                            <span className="font-semibold text-slate-800 text-sm">{currentSessionTitle || "ห้องสนทนา"}</span>
                        </div>
                    </div>
                    <div>
                        {online === null ? (
                            <span className="text-[11px] text-slate-400">กำลังตรวจสอบ AI...</span>
                        ) : online ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                <Wifi className="w-3.5 h-3.5" />
                                AI พร้อมตอบคำถาม
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                                <WifiOff className="w-3.5 h-3.5" />
                                AI ออฟไลน์
                            </span>
                        )}
                    </div>
                </div>

                {/* ข้อความแชต */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.from === "user" ? "flex-row-reverse ml-auto" : ""} max-w-[85%] ${msg.from === "user" ? "ml-auto" : ""}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                msg.from === "bot" ? "bg-indigo-50" : "bg-gradient-to-tr from-[#4169E1] to-[#5a52e0] text-white text-xs font-bold"
                            }`}>
                                {msg.from === "bot"
                                    ? <Bot className="w-4 h-4 text-[#4169E1]" />
                                    : (firstName?.[0] || "U")}
                            </div>

                            <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                                msg.from === "bot"
                                    ? "bg-white border border-slate-100 shadow-sm text-slate-700 rounded-tl-none"
                                    : "bg-[#4169E1] text-white rounded-tr-none shadow-sm"
                            }`}>
                                {msg.text || (
                                    <span className="flex items-center gap-2 text-slate-400 text-[10px]">
                                        <span className="flex gap-0.5">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                        </span>
                                        กำลังพิมพ์คำตอบ...
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

                {/* กล่องพิมพ์แชตด้านล่าง */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="พิมพ์ถามสวัสดิการ นโยบายองค์กร หรือถามเรื่องอื่นๆ ที่นี่..."
                        disabled={loading}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#4169E1]/30 focus:bg-white transition-all text-xs disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-[#4169E1] hover:bg-[#5a52e0] text-white px-5 py-3.5 rounded-xl shadow shadow-indigo-100 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
