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
}

const STORAGE_KEY_HR = "hireai_notifications_hr_v1";
const STORAGE_KEY_EMP = "hireai_notifications_emp_v1";
const EVENT_NAME = "hireai_notifications_updated";

const DEFAULT_HR_NOTIFICATIONS: NotificationItem[] = [
    {
        id: "hr-notif-1",
        title: "ผู้สมัครใหม่รอนัดสัมภาษณ์",
        message: "มีผู้สมัครตำแหน่ง Senior Backend Developer (คุณเจษฎา) ผ่านการคัดกรองด้วยคะแนน PTS 92/100 รอนัดหมายสัมภาษณ์",
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
        message: "ระบบทำการวิเคราะห์ประวัติและจัดลำดับผู้สมัคร 12 รายในตำแหน่ง Frontend Engineer สำเร็จแล้ว",
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
    },
    {
        id: "hr-notif-4",
        title: "รายงานสรุปการประเมินผลสัมภาษณ์ประจำสัปดาห์",
        message: "มีผู้สมัครผ่านการสัมภาษณ์รอบสุดท้าย 3 ราย พร้อมส่งอีเมลแจ้งผลการคัดเลือก",
        category: "system",
        categoryLabel: "แจ้งผลสัมภาษณ์",
        timestamp: "2 วันที่แล้ว",
        isRead: true,
        isPriority: false,
        linkPath: "/hr/interview-results",
        linkText: "ดูผลการสัมภาษณ์",
        role: "HR"
    }
];

const DEFAULT_EMP_NOTIFICATIONS: NotificationItem[] = [
    {
        id: "emp-notif-1",
        title: "ประกาศ: ปรับปรุงสวัสดิการค่าทำฟันและประกันสุขภาพประจำปี 2026",
        message: "บริษัทได้ทำการเพิ่มวงเงินค่าบริการทันตกรรมและตรวจสุขภาพประจำปีเป็น 5,000 บาท/ปี สามารถยื่นเคลมสิทธิผ่านระบบหรือยื่นบัตรประชาชนกับโรงพยาบาลคู่สัญญาได้ตั้งแต่วันนี้เป็นต้นไป",
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
        message: "แจ้งวันหยุดบริษัทล่วงหน้าช่วงเทศกาลสงกรานต์ ระหว่างวันที่ 13 - 16 เมษายน 2569 พนักงานสามารถลงวันลาพักร้อนเพิ่มเติมผ่านระบบก่อนวันที่ 1 เมษายน 2569",
        category: "announcement",
        categoryLabel: "ประกาศบริษัท",
        timestamp: "2 ชั่วโมงที่แล้ว",
        isRead: false,
        linkPath: "/employee/chat",
        linkText: "ถาม AI เกี่ยวกับวันหยุด",
        role: "EMPLOYEE"
    },
    {
        id: "emp-notif-3",
        title: "ระบบ HireAI Advisor พร้อมให้บริการถาม-ตอบนโยบายบริษัท 24 ชม.",
        message: "พนักงานสามารถสอบถามข้อสงสัยเรื่องกฎระเบียบ การเบิกค่าใช้จ่าย สวัสดิการพยาบาล และขั้นตอนการลากับ AI Advisor ได้ตลอดเวลาผ่านเมนู AI Advisor",
        category: "system",
        categoryLabel: "สถานะระบบ & HR",
        timestamp: "เมื่อวานนี้",
        isRead: true,
        linkPath: "/employee/chat",
        linkText: "ลองคุยกับ AI Advisor",
        role: "EMPLOYEE"
    },
    {
        id: "emp-notif-4",
        title: "ขอเชิญเข้าร่วมกิจกรรม Town Hall Meeting ประจำไตรมาส 1/2026",
        message: "ขอเรียนเชิญพนักงานทุกท่านเข้าร่วมฟังการสรุปผลการดำเนินงานไตรมาส 1 ในวันศุกร์ที่ 27 มีนาคม เวลา 14:00 น. ณ ห้องประชุมใหญ่และผ่าน Microsoft Teams",
        category: "announcement",
        categoryLabel: "ประกาศบริษัท",
        timestamp: "3 วันที่แล้ว",
        isRead: true,
        role: "EMPLOYEE"
    }
];

const getStorageKey = (role: "HR" | "EMPLOYEE") => role === "HR" ? STORAGE_KEY_HR : STORAGE_KEY_EMP;
const getDefaultNotifs = (role: "HR" | "EMPLOYEE") => role === "HR" ? DEFAULT_HR_NOTIFICATIONS : DEFAULT_EMP_NOTIFICATIONS;

const notifyListeners = () => {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const notificationService = {
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

    saveNotifications: (role: "HR" | "EMPLOYEE", list: NotificationItem[]) => {
        try {
            localStorage.setItem(getStorageKey(role), JSON.stringify(list));
            notifyListeners();
        } catch (err) {
            console.error("Failed to save notifications:", err);
        }
    },

    markAsRead: (id: string, role: "HR" | "EMPLOYEE"): NotificationItem[] => {
        const current = notificationService.getNotifications(role);
        const updated = current.map(item => item.id === id ? { ...item, isRead: true } : item);
        notificationService.saveNotifications(role, updated);
        return updated;
    },

    markAllAsRead: (role: "HR" | "EMPLOYEE"): NotificationItem[] => {
        const current = notificationService.getNotifications(role);
        const updated = current.map(item => ({ ...item, isRead: true }));
        notificationService.saveNotifications(role, updated);
        return updated;
    },

    deleteNotification: (id: string, role: "HR" | "EMPLOYEE"): NotificationItem[] => {
        const current = notificationService.getNotifications(role);
        const updated = current.filter(item => item.id !== id);
        notificationService.saveNotifications(role, updated);
        return updated;
    },

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
        return newNotif;
    },

    getUnreadCount: (role: "HR" | "EMPLOYEE"): number => {
        const current = notificationService.getNotifications(role);
        return current.filter(n => !n.isRead).length;
    },

    subscribe: (callback: () => void): () => void => {
        window.addEventListener(EVENT_NAME, callback);
        return () => window.removeEventListener(EVENT_NAME, callback);
    }
};
