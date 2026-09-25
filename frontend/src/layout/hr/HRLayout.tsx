import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { hrMenuItems } from "./hrMenu";
import { getProfile, getFullImageUrl, UserProfile } from "../../services/userService";
import { notificationService, NotificationItem } from "../../services/notificationService";
import {
    LogOut,
    Bell,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    ShieldCheck,
    Cpu,
    CheckCheck,
    Menu,
    X
} from "lucide-react";

export default function HRLayout() {
    const { logout, firstName, lastName } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    useEffect(() => {
        getProfile().then(data => setUserProfile(data)).catch(() => {});
        const loadNotifs = () => setNotifications(notificationService.getNotifications("HR"));
        loadNotifs();
        const unsubscribe = notificationService.subscribe(loadNotifs);
        const stopPolling = notificationService.startPolling("HR", 10000);
        return () => {
            unsubscribe();
            stopPolling();
        };
    }, [firstName, lastName, location.pathname]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const displayFirstName = userProfile?.first_name || firstName || "HR";
    const displayLastName = userProfile?.last_name || lastName || "Admin";
    const fullName = `${displayFirstName} ${displayLastName}`.trim() || "HR Admin";
    const initials = `${displayFirstName[0] || "H"}${displayLastName[0] || ""}`.toUpperCase();
    const avatarUrl = getFullImageUrl(userProfile?.profile_image);

    // Find current page item
    const currentPage = hrMenuItems.find(item => location.pathname.startsWith(item.path));
    const pageTitle = currentPage?.label || "Dashboard";

    // Categorized Menu Sections
    const menuSections = [
        {
            title: "ภาพรวม",
            items: hrMenuItems.filter(item => item.id === "dashboard")
        },
        {
            title: "คัดเลือก & AI",
            items: hrMenuItems.filter(item => item.id === "screening" || item.id === "documents")
        },
        {
            title: "การจัดการองค์กร & พนักงาน",
            items: hrMenuItems.filter(item => item.id === "knowledge" || item.id === "positions" || item.id === "candidates" || item.id === "interviews" || item.id === "interview-results" || item.id === "notifications" || item.id === "profile")
        }
    ];

    return (
        <div className="flex h-screen bg-[#f8fafc] font-sans antialiased text-slate-800 overflow-hidden">
            {/* Mobile Backdrop Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar (Desktop Collapsible + Mobile Drawer) */}
            <aside
                className={`bg-white border-r border-slate-200/80 flex flex-col z-50 transition-all duration-300 ease-in-out shadow-xs
                    fixed inset-y-0 left-0 lg:static
                    ${isMobileMenuOpen ? "translate-x-0 w-68" : "-translate-x-full lg:translate-x-0"}
                    ${isCollapsed ? "lg:w-20" : "lg:w-64"}
                `}
            >
                {/* Logo Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="HireAI Logo" className="h-8 w-auto object-contain" />
                        {!isCollapsed && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#4169E1] border border-blue-100">
                                HR Portal
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors hidden lg:flex cursor-pointer"
                            title={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
                        >
                            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors lg:hidden cursor-pointer"
                            title="ปิดเมนู"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* AI Model Status Badge */}
                {!isCollapsed && (
                    <div className="mx-4 mt-4 p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm border border-indigo-500/20">
                        <div className="flex items-center justify-between text-[11px] font-medium text-indigo-300">
                            <span className="flex items-center gap-1.5 font-semibold">
                                <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                Typhoon AI 2.5
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                GPU Ready
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">LoRA Adapter + Base Model 4-Bit</p>
                    </div>
                )}

                {/* Navigation Menu */}
                <div className="px-3 py-4 flex-1 overflow-y-auto space-y-6">
                    {menuSections.map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            {!isCollapsed && (
                                <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                    {section.title}
                                </p>
                            )}
                            <nav className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname.startsWith(item.path);
                                    return (
                                        <Link
                                            key={item.id}
                                            to={item.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            title={isCollapsed ? item.label : undefined}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group relative ${
                                                isActive
                                                    ? "bg-[#4169E1] text-white shadow-md shadow-blue-500/20"
                                                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                                            }`}
                                        >
                                            <Icon
                                                className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                                    isActive ? "text-white" : "text-slate-400 group-hover:text-[#4169E1]"
                                                }`}
                                            />
                                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                                            {isActive && !isCollapsed && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white"></span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    ))}
                </div>

                {/* User Access Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/60">
                    {!isCollapsed ? (
                        <div className="space-y-2">
                            <Link to="/hr/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={fullName}
                                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                                        {initials}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-[#4169E1]">{fullName}</p>
                                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 truncate">
                                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> HR Specialist
                                    </p>
                                </div>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-rose-600 font-semibold text-xs hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                ออกจากระบบ
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogout}
                            title="ออกจากระบบ"
                            className="w-10 h-10 mx-auto rounded-xl text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header Top Bar */}
                <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
                    {/* Breadcrumbs & Title */}
                    <div className="flex items-center gap-2">
                        {/* Mobile Hamburger Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
                            title="เปิดเมนู"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <span className="text-xs font-medium text-slate-400 hidden sm:inline">หน้าหลัก</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
                        <h1 className="text-slate-800 font-bold text-base flex items-center gap-2">
                            {pageTitle}
                        </h1>
                    </div>

                    {/* Right Tools & Actions */}
                    <div className="flex items-center gap-3 sm:gap-4">

                        {/* Notifications Popover */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all border border-slate-200/60 hover:text-indigo-600 cursor-pointer"
                                title="การแจ้งเตือน"
                            >
                                <Bell className="w-4 h-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">การแจ้งเตือน</h4>
                                            {unreadCount > 0 && (
                                                <span className="text-[10px] font-extrabold bg-indigo-50 text-[#4169E1] px-2 py-0.5 rounded-full border border-indigo-100">
                                                    {unreadCount} ใหม่
                                                </span>
                                            )}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={() => notificationService.markAllAsRead("HR")}
                                                className="text-[11px] font-bold text-[#4169E1] hover:underline cursor-pointer flex items-center gap-1"
                                            >
                                                <CheckCheck className="w-3.5 h-3.5" />
                                                อ่านทั้งหมด
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-xs max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 text-center text-slate-400">
                                                <p className="font-semibold text-xs">ไม่มีการแจ้งเตือน</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => {
                                                        notificationService.markAsRead(n.id, "HR");
                                                        setShowNotifications(false);
                                                        if (n.linkPath) navigate(n.linkPath);
                                                        else navigate("/hr/notifications");
                                                    }}
                                                    className={`p-3 rounded-xl transition-all cursor-pointer border ${
                                                        !n.isRead
                                                            ? "bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50/80"
                                                            : "bg-slate-50/70 border-slate-100 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-xs ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                                                            {n.title}
                                                        </p>
                                                        {!n.isRead && (
                                                            <span className="w-2 h-2 rounded-full bg-[#4169E1] shrink-0 mt-1"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{n.message}</p>
                                                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100/60">
                                                        <span className="text-[10px] text-slate-400 font-medium">{n.timestamp}</span>
                                                        <span className="text-[10px] font-bold text-[#4169E1] flex items-center gap-0.5">
                                                            {n.linkText || "ดูรายละเอียด"}
                                                            <ChevronRight className="w-3 h-3" />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                                        <button
                                            onClick={() => {
                                                setShowNotifications(false);
                                                navigate("/hr/notifications");
                                            }}
                                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200/60"
                                        >
                                            <Bell className="w-3.5 h-3.5 text-[#4169E1]" />
                                            ดูการแจ้งเตือนทั้งหมดในศูนย์ HR
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content Container */}
                <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8 animate-fadeIn">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

