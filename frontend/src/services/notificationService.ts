import apiClient from "./apiClient";

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    category: "system" | "announcement" | "benefit" | "hr" | "interview" | "candidate";
    categoryLabel: string;
    timestamp: string;
    isRead: boolean;
    isPriority?: boolean;
    linkPath?: string;
    linkText?: string;
    role?: "HR" | "EMPLOYEE" | "ALL";
    createdAt?: string;
}

const STORAGE_KEY_HR = "hireai_notifications_hr_v1";
const STORAGE_KEY_EMP = "hireai_notifications_emp_v1";
const EVENT_NAME = "hireai_notifications_updated";

const DEFAULT_HR_NOTIFICATIONS: NotificationItem[] = [
    {
        id: "hr-notif-1",
        title: "ผู้สมัครใหม่รอนัดสัมภาษณ์",
        message: "มีผู้สมัครตำแหน่ง Senior Backend Developer ผ่านการคัดกรองด้วยคะแนน PTS 92/100 รอนัดหมายสัมภาษณ์",
        category: "interview",
        categoryLabel: "นัดสัมภาษณ์",
        timestamp: "5 นาทีที่แล้ว",
        isRead: false,
        isPriority: true,
        linkPath: "/hr/interviews",
        linkText: "ไประบุวันเวลาสัมภาษณ์",
        role: "HR"
    },
    {
        id: "hr-notif-2",
        title: "ระบบ Typhoon AI คัดกรอง Resume สำเร็จ",
        message: "ระบบทำการวิเคราะห์ประวัติและจัดลำดับผู้สมัครในตำแหน่ง Frontend Engineer สำเร็จแล้ว",
        category: "candidate",
        categoryLabel: "คัดกรอง AI",
        timestamp: "1 ชั่วโมงที่แล้ว",
        isRead: false,
        isPriority: false,
        linkPath: "/hr/candidates",
        linkText: "ดูผลจัดลำดับผู้สมัคร",
        role: "HR"
    },
    {
        id: "hr-notif-3",
        title: "อัปเดตนโยบายการลาป่วยและวันหยุดประจำปี 2026",
        message: "เพิ่มข้อมูลเอกสารนโยบายสวัสดิการในระบบคลังความรู้ AI Policy Advisor เรียบร้อยแล้ว",
        category: "hr",
        categoryLabel: "คลังความรู้",
        timestamp: "1 วันที่แล้ว",
        isRead: true,
        isPriority: false,
        linkPath: "/hr/knowledge",
        linkText: "ดูคลังความรู้",
        role: "HR"
    }
];

const DEFAULT_EMP_NOTIFICATIONS: NotificationItem[] = [
    {
        id: "emp-notif-1",
        title: "ประกาศ: ปรับปรุงสวัสดิการค่าทำฟันและประกันสุขภาพประจำปี 2026",
        message: "บริษัทได้ทำการเพิ่มวงเงินค่าบริการทันตกรรมและตรวจสุขภาพประจำปีเป็น 5,000 บาท/ปี สามารถยื่นเคลมสิทธิผ่านระบบได้แล้ว",
        category: "benefit",
        categoryLabel: "สวัสดิการ & วันหยุด",
        timestamp: "10 นาทีที่แล้ว",
        isRead: false,
        isPriority: true,
        linkPath: "/employee/documents",
        linkText: "ดูเอกสารสวัสดิการ",
        role: "EMPLOYEE"
    },
    {
        id: "emp-notif-2",
        title: "กำหนดการวันหยุดประจำปี 2569 และวันหยุดชดเชยเทศกาลสงกรานต์",
        message: "แจ้งวันหยุดบริษัทล่วงหน้าช่วงเทศกาลสงกรานต์ ระหว่างวันที่ 13 - 16 เมษายน 2569",
        category: "announcement",
        categoryLabel: "ประกาศบริษัท",
        timestamp: "2 ชั่วโมงที่แล้ว",
        isRead: false,
        linkPath: "/employee/chat",
        linkText: "ถาม AI เกี่ยวกับวันหยุด",
        role: "EMPLOYEE"
    }
];

const getStorageKey = (role: "HR" | "EMPLOYEE") => role === "HR" ? STORAGE_KEY_HR : STORAGE_KEY_EMP;
const getDefaultNotifs = (role: "HR" | "EMPLOYEE") => role === "HR" ? DEFAULT_HR_NOTIFICATIONS : DEFAULT_EMP_NOTIFICATIONS;

const notifyListeners = () => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
};

let activePollingTimers: Record<string, any> = {};

export const notificationService = {
    /**
     * ดึงรายการแจ้งเตือนจาก Local Cache ทันที เพื่อให้ UI ตอบสนองได้แบบ Real-time ไม่มีจังหวะแล็ก
     */
    getNotifications: (role: "HR" | "EMPLOYEE"): NotificationItem[] => {
        try {
            const raw = localStorage.getItem(getStorageKey(role));
            if (!raw) {
                const defaults = getDefaultNotifs(role);
                localStorage.setItem(getStorageKey(role), JSON.stringify(defaults));
                return defaults;
            }
            return JSON.parse(raw);
        } catch {
            return getDefaultNotifs(role);
        }
    },

    /**
     * ดึงรายการแจ้งเตือนล่าสุดจาก Backend Database (PostgreSQL) พร้อมอัปเดต Local Cache
     */
    fetchNotifications: async (role: "HR" | "EMPLOYEE"): Promise<NotificationItem[]> => {
        try {
            const res = await apiClient.get(`/notifications?role=${role}`);
            if (res.data && Array.isArray(res.data.data)) {
                const serverNotifs: NotificationItem[] = res.data.data;
                localStorage.setItem(getStorageKey(role), JSON.stringify(serverNotifs));
                notifyListeners();
                return serverNotifs;
            }
        } catch (err) {
            console.warn("[NotificationService] Fallback to cached notifications:", err);
        }
        return notificationService.getNotifications(role);
    },

    saveNotifications: (role: "HR" | "EMPLOYEE", list: NotificationItem[]) => {
        try {
            localStorage.setItem(getStorageKey(role), JSON.stringify(list));
            notifyListeners();
        } catch (err) {
            console.error("Failed to save notifications:", err);
        }
    },

    /**
     * ทำเครื่องหมายแจ้งเตือนรายการนี้ว่าอ่านแล้ว (อัปเดตทันที + ซิงค์ไป Backend)
     */
    markAsRead: (id: string, role: "HR" | "EMPLOYEE"): NotificationItem[] => {
        const current = notificationService.getNotifications(role);
        const updated = current.map(item => item.id === id ? { ...item, isRead: true } : item);
        notificationService.saveNotifications(role, updated);

        // ซิงค์ไปยัง Backend API เบื้องหลัง
        apiClient.put(`/notifications/${id}/read`).catch(() => {});
        return updated;
    },

    /**
     * ทำเครื่องหมายแจ้งเตือนทั้งหมดว่าอ่านแล้ว
     */
    markAllAsRead: (role: "HR" | "EMPLOYEE"): NotificationItem[] => {
        const current = notificationService.getNotifications(role);
        const updated = current.map(item => ({ ...item, isRead: true }));
        notificationService.saveNotifications(role, updated);

        // ซิงค์ไปยัง Backend API เบื้องหลัง
        apiClient.put(`/notifications/read-all?role=${role}`).catch(() => {});
        return updated;
    },

    /**
     * ลบการแจ้งเตือน
     */
    deleteNotification: (id: string, role: "HR" | "EMPLOYEE"): NotificationItem[] => {
        const current = notificationService.getNotifications(role);
        const updated = current.filter(item => item.id !== id);
        notificationService.saveNotifications(role, updated);

        // ซิงค์ไปยัง Backend API เบื้องหลัง
        apiClient.delete(`/notifications/${id}`).catch(() => {});
        return updated;
    },

    /**
     * เพิ่มการแจ้งเตือนใหม่ (เช่น HR สร้างประกาศ หรือระบบแจ้งเตือนแบบทันที)
     */
    addNotification: (
        item: Omit<NotificationItem, "id" | "timestamp" | "isRead">,
        role: "HR" | "EMPLOYEE"
    ): NotificationItem => {
        const current = notificationService.getNotifications(role);
        const newNotif: NotificationItem = {
            ...item,
            id: `notif-${Date.now()}`,
            timestamp: "เมื่อสักครู่",
            isRead: false
        };
        const updated = [newNotif, ...current];
        notificationService.saveNotifications(role, updated);

        // ส่งบันทึกลง Backend Database
        apiClient.post("/notifications", {
            title: item.title,
            message: item.message,
            category: item.category,
            categoryLabel: item.categoryLabel,
            isPriority: item.isPriority || false,
            linkPath: item.linkPath || "",
            linkText: item.linkText || "",
            role: item.role || role
        }).then(res => {
            if (res.data && res.data.data && res.data.data.id) {
                // แทนที่ไอดีชั่วคราวด้วยไอดีจริงจาก DB
                const finalUpdated = notificationService.getNotifications(role).map(n =>
                    n.id === newNotif.id ? { ...n, id: res.data.data.id } : n
                );
                notificationService.saveNotifications(role, finalUpdated);
            }
        }).catch(() => {});

        return newNotif;
    },

    getUnreadCount: (role: "HR" | "EMPLOYEE"): number => {
        const current = notificationService.getNotifications(role);
        return current.filter(n => !n.isRead).length;
    },

    subscribe: (callback: () => void): () => void => {
        window.addEventListener(EVENT_NAME, callback);
        return () => window.removeEventListener(EVENT_NAME, callback);
    },

    /**
     * เริ่มการตรวจเช็คแจ้งเตือนแบบเรียลไทม์เป็นระยะ (Polling) และเมื่อผู้ใช้สลับกลับมาที่แท็บ
     */
    startPolling: (role: "HR" | "EMPLOYEE", intervalMs = 12000): (() => void) => {
        if (activePollingTimers[role]) {
            clearInterval(activePollingTimers[role]);
        }

        // ดึงทันที 1 ครั้ง
        notificationService.fetchNotifications(role);

        // Polling ทุกๆ intervalMs
        const timer = setInterval(() => {
            notificationService.fetchNotifications(role);
        }, intervalMs);
        activePollingTimers[role] = timer;

        // เมื่อสลับกลับมาที่หน้าเว็บ ให้ดึงข้อมูลทันที
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                notificationService.fetchNotifications(role);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(timer);
            delete activePollingTimers[role];
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }
};
