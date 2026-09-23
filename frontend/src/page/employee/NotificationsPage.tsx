import { useState, useEffect } from "react";
import {
    Bell,
    CheckCheck,
    Search,
    X,
    Sparkles,
    Megaphone,
    ChevronRight,
    Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notificationService, NotificationItem } from "../../services/notificationService";

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

    const loadNotifications = () => {
        const list = notificationService.getNotifications("EMPLOYEE");
        setNotifications(list);
    };

    useEffect(() => {
        loadNotifications();
        const unsubscribe = notificationService.subscribe(loadNotifications);
        return () => unsubscribe();
    }, []);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handleMarkAllRead = () => {
        const updated = notificationService.markAllAsRead("EMPLOYEE");
        setNotifications(updated);
    };

    const handleSelectNotif = (notif: NotificationItem) => {
        setSelectedNotif(notif);
        if (!notif.isRead) {
            const updated = notificationService.markAsRead(notif.id, "EMPLOYEE");
            setNotifications(updated);
        }
    };

    const filteredNotifs = notifications.filter((n) => {
        const matchesTab = activeTab === "all" || n.category === activeTab || (activeTab === "unread" && !n.isRead);
        const matchesSearch =
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.message.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-semibold backdrop-blur-md">
                            <Bell className="w-3.5 h-3.5" />
                            ศูนย์การแจ้งเตือน & ข่าวสารองค์กร
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">การแจ้งเตือน</h1>
                        <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                            ติดตามข่าวสารสำคัญ ประกาศจากแผนก HR และการอัปเดตสวัสดิการแบบ Realtime
                        </p>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs shadow-lg shadow-teal-500/30 transition-all hover:scale-105 active:scale-95"
                        >
                            <CheckCheck className="w-4 h-4" />
                            ทำเครื่องหมายอ่านแล้วทั้งหมด ({unreadCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                    {[
                        { id: "all", label: `ทั้งหมด (${notifications.length})` },
                        { id: "unread", label: `ยังไม่อ่าน (${unreadCount})` },
                        { id: "benefit", label: "สวัสดิการ & วันหยุด" },
                        { id: "announcement", label: "ประกาศบริษัท" },
                        { id: "system", label: "ระบบ & HR" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? "bg-teal-600 text-white shadow-md shadow-teal-500/20"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search input */}
                <div className="relative min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาข้อความแจ้งเตือน..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                </div>
            </div>

            {/* Notifications List */}
            {filteredNotifs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center space-y-3 shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                        <Bell className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">ไม่มีการแจ้งเตือน</h3>
                    <p className="text-slate-400 text-xs">คุณอ่านข้อความทั้งหมดหรือไม่มีการแจ้งเตือนใหม่ในหมวดหมู่นี้</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredNotifs.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleSelectNotif(item)}
                            className={`p-6 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group relative ${
                                !item.isRead
                                    ? "bg-gradient-to-r from-teal-50/80 via-white to-white border-teal-200 shadow-md shadow-teal-900/5 hover:border-teal-400"
                                    : "bg-white border-slate-200/70 hover:border-slate-300 hover:shadow-md"
                            }`}
                        >
                            {!item.isRead && (
                                <span className="absolute top-6 left-3 w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                            )}

                            <div className="flex items-start gap-4 min-w-0 flex-1 pl-2">
                                <div
                                    className={`p-3 rounded-2xl flex-shrink-0 ${
                                        item.category === "benefit"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : item.category === "announcement"
                                            ? "bg-teal-100 text-teal-700"
                                            : "bg-blue-100 text-blue-700"
                                    }`}
                                >
                                    {item.category === "benefit" ? (
                                        <Sparkles className="w-5 h-5" />
                                    ) : item.category === "announcement" ? (
                                        <Megaphone className="w-5 h-5" />
                                    ) : (
                                        <Bell className="w-5 h-5" />
                                    )}
                                </div>

                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            {item.categoryLabel}
                                        </span>
                                        {item.isPriority && (
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                                สำคัญมาก
                                            </span>
                                        )}
                                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-300" />
                                            {item.timestamp}
                                        </span>
                                    </div>

                                    <h3
                                        className={`text-base font-bold transition-colors ${
                                            !item.isRead ? "text-slate-900 font-black" : "text-slate-700"
                                        } group-hover:text-teal-700 line-clamp-1`}
                                    >
                                        {item.title}
                                    </h3>

                                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                                        {item.message}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-center">
                                {item.linkPath && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(item.linkPath!);
                                        }}
                                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs hover:bg-teal-100 transition-colors"
                                    >
                                        {item.linkText || "เปิดดู"}
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Notification Detail Modal */}
            {selectedNotif && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700">
                                {selectedNotif.categoryLabel}
                            </span>
                            <button
                                onClick={() => setSelectedNotif(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-black text-slate-800 text-lg leading-snug">{selectedNotif.title}</h3>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {selectedNotif.timestamp}
                            </p>
                            <p className="text-slate-600 text-xs leading-relaxed pt-2 whitespace-pre-line font-sans">
                                {selectedNotif.message}
                            </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <button
                                onClick={() => setSelectedNotif(null)}
                                className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100"
                            >
                                ปิด
                            </button>
                            {selectedNotif.linkPath && (
                                <button
                                    onClick={() => {
                                        const path = selectedNotif.linkPath!;
                                        setSelectedNotif(null);
                                        navigate(path);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20"
                                >
                                    {selectedNotif.linkText || "ไปยังหน้านี้"}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
