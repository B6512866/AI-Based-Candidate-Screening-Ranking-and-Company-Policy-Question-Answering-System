import React from "react";
import { MessageCircle, User, FileText, Bell as BellIcon } from "lucide-react";

export interface EmployeeMenuItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
}

export const employeeMenuItems: EmployeeMenuItem[] = [
    {
        id: "chat",
        label: "AI Advisor",
        icon: MessageCircle,
        path: "/employee/chat",
    },
    {
        id: "profile",
        label: "ข้อมูลของฉัน",
        icon: User,
        path: "/employee/profile",
    },
];
