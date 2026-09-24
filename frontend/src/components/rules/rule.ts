/**
 * ═════════════════════════════════════════════════════════════════════════
 * Application Validation & Formatting Rules (กฎการตรวจสอบและจัดรูปแบบข้อมูล)
 * Path: frontend/src/components/rules/rule.ts
 * ═════════════════════════════════════════════════════════════════════════
 */

import React from "react";

// ═════════════════════════════════════════════════════════════════════════
// 1. หมวดหมายเลขโทรศัพท์ (Phone Number Rules)
// ═════════════════════════════════════════════════════════════════════════

/**
 * ดึงเฉพาะตัวเลขล้วนจากเบอร์โทรศัพท์ (ลบขีด วงเล็บ ช่องว่าง)
 * และแปลงรหัสประเทศ +66 / 66 เป็น 0
 */
export function cleanPhoneNumber(val: string): string {
    if (!val) return "";
    let clean = val.replace(/\D/g, "");

    // แปลง +66 หรือ 66 ให้เป็นเลข 0 นำหน้า
    if (clean.startsWith("66") && clean.length > 2) {
        clean = "0" + clean.slice(2);
    }

    // กรณีข้อมูล 9 หลักที่ไม่มี 0 นำหน้า (เช่น ผู้สมัครกรอกตัด 0 หน้าเบอร์ 8x, 9x, 6x)
    if (clean.length === 9 && (clean.startsWith("8") || clean.startsWith("9") || clean.startsWith("6"))) {
        clean = "0" + clean;
    }

    return clean;
}

/**
 * จัดรูปแบบเบอร์โทรศัพท์ไทยอัตโนมัติ (Auto-masking)
 * - บังคับให้ขึ้นต้นด้วย 0 เท่านั้น (หากไม่ใช่ 0 จะตัดทิ้งทันที)
 * - เบอร์บ้าน/สำนักงาน กทม. 9 หลัก: 02-xxx-xxxx
 * - เบอร์มือถือ 10 หลัก: 0xx-xxx-xxxx (เช่น 081-234-5678)
 */
export function formatPhoneNumber(val: string): string {
    const clean = cleanPhoneNumber(val);
    if (!clean) return "";

    // กฎเหล็ก: เบอร์โทรศัพท์ในประเทศไทยต้องขึ้นต้นด้วยเลข 0 เท่านั้น!
    if (!clean.startsWith("0")) {
        return "";
    }

    // กรณีเบอร์พื้นฐาน กทม. 9 หลัก (เช่น 02-123-4567)
    if (clean.startsWith("02")) {
        const limited = clean.slice(0, 9);
        if (limited.length <= 2) return limited;
        if (limited.length <= 5) return `${limited.slice(0, 2)}-${limited.slice(2)}`;
        return `${limited.slice(0, 2)}-${limited.slice(2, 5)}-${limited.slice(5)}`;
    }

    // กรณีเบอร์มือถือ / เบอร์ทั่วไป 10 หลัก (เช่น 081-234-5678, 09x, 06x)
    const limited = clean.slice(0, 10);
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
}

/**
 * ตรวจสอบความถูกต้องของเบอร์โทรศัพท์ไทย
 * - ต้องขึ้นต้นด้วย 0
 * - ถ้าเป็นเบอร์ 02 ต้องมี 9 หลัก
 * - ถ้าเป็นเบอร์มือถือ (06, 08, 09) ต้องมี 10 หลัก
 */
export function isValidPhoneNumber(val: string): boolean {
    const clean = cleanPhoneNumber(val);
    if (!clean.startsWith("0")) return false;

    // เบอร์ 02 (9 หลัก)
    if (clean.startsWith("02")) {
        return clean.length === 9;
    }

    // เบอร์มือถือ (10 หลักขึ้นต้นด้วย 06, 08, 09 หรือเบอร์ 10 หลักทั่วไป)
    if (/^0[689]\d{8}$/.test(clean)) {
        return true;
    }

    // เบอร์ภูมิภาค 9 หลัก (เช่น 053, 038, 043)
    if (/^0[3457]\d{7}$/.test(clean)) {
        return true;
    }

    return clean.length === 10;
}

/**
 * ดักจับการกดแป้นพิมพ์สำหรับช่องกรอกเบอร์โทรศัพท์ (onKeyDown)
 * - หากช่องยังว่าง บล็อกการกดเลข 1-9 ทันที (บังคับต้องกดเลข 0 เป็นตัวแรก)
 * - บล็อกตัวอักษรและอักขระพิเศษ (อนุญาตเฉพาะตัวเลขและปุ่มควบคุม เช่น Backspace, Tab, Delete, Arrow)
 */
export function handlePhoneKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string
): void {
    // อนุญาตปุ่มควบคุมและการกดคีย์ลัด (เช่น Ctrl+A, Ctrl+C, Ctrl+V)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        return;
    }

    // หากช่องยังว่าง และกดตัวเลข 1-9 ให้บล็อกทันที (ต้องขึ้นด้วย 0 เท่านั้น)
    if (!currentValue && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        return;
    }

    // บล็อกอักขระอื่นที่ไม่ใช่ตัวเลข 0-9
    if (e.key.length === 1 && !/^\d$/.test(e.key)) {
        e.preventDefault();
    }
}

// ═════════════════════════════════════════════════════════════════════════
// 2. หมวดเวลาและวันที่ (Time & Date Rules)
// ═════════════════════════════════════════════════════════════════════════

/**
 * แปลงเวลา 24 ชั่วโมง (เช่น 14:30) เป็นระบบ 12 ชั่วโมงพร้อม AM/PM (เช่น 02:30 PM)
 * นิยมใช้ในจดหมายเชิญหรือเอกสารภาษาอังกฤษ
 */
export function formatTime12H(timeStr: string): string {
    if (!timeStr) return "-";
    const trimmed = timeStr.trim();
    if (!trimmed || trimmed === "-") return "-";
    if (/am|pm/i.test(trimmed)) return trimmed;

    const parts = trimmed.split(":");
    if (parts.length < 2) return trimmed;

    const h = parseInt(parts[0], 10);
    const mDigits = parts[1].replace(/\D/g, "").slice(0, 2);
    const m = mDigits ? mDigits.padStart(2, "0") : "00";
    if (isNaN(h)) return trimmed;

    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const hFormatted = String(h12).padStart(2, "0");

    return `${hFormatted}:${m} ${period}`;
}

/**
 * แปลงเวลาเป็นรูปแบบทางการภาษาไทย (เช่น 14:30 น.)
 */
export function formatThaiTime(timeStr: string): string {
    if (!timeStr) return "-";
    const clean = timeStr.replace(/[^0-9:]/g, "").trim();
    if (!clean) return "-";
    return `${clean} น.`;
}

/**
 * ตรวจสอบความถูกต้องของรูปแบบเวลา HH:mm (00:00 - 23:59)
 */
export function isValidTimeFormat(timeStr: string): boolean {
    if (!timeStr) return false;
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(timeStr.trim());
}

/**
 * จัดรูปแบบวันที่เป็นภาษาไทย (เช่น 15 ก.ย. 2026 หรือ 15 กันยายน 2569)
 */
export function formatThaiDate(dateStr: string, isBuddhistYear = false): string {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const options: Intl.DateTimeFormatOptions = {
            day: "numeric",
            month: "short",
            year: "numeric"
        };
        const formatted = d.toLocaleDateString("th-TH", options);

        if (!isBuddhistYear) {
            // แปลง พ.ศ. เป็น ค.ศ. ถ้าต้องการ
            const yearMatch = formatted.match(/\d{4}/);
            if (yearMatch) {
                const bYear = parseInt(yearMatch[0], 10);
                if (bYear > 2400) {
                    return formatted.replace(yearMatch[0], String(bYear - 543));
                }
            }
        }
        return formatted;
    } catch {
        return dateStr;
    }
}

/**
 * แปลงวันที่ YYYY-MM-DD เป็น DD/MM/YYYY
 */
export function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    if (y && m && d) {
        return `${d}/${m}/${y}`;
    }
    return dateStr;
}

// ═════════════════════════════════════════════════════════════════════════
// 3. หมวดอีเมล (Email Rules)
// ═════════════════════════════════════════════════════════════════════════

/**
 * ตรวจสอบความถูกต้องของรูปแบบอีเมล
 */
export function isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
}

/**
 * ทำความสะอาดอีเมล (ตัดช่องว่าง, แปลงเป็นตัวพิมพ์เล็ก)
 */
export function sanitizeEmail(email: string): string {
    if (!email) return "";
    return email.trim().toLowerCase();
}

// ═════════════════════════════════════════════════════════════════════════
// 4. หมวดเลขประจำตัวประชาชนไทย (Thai Citizen ID Rules)
// ═════════════════════════════════════════════════════════════════════════

/**
 * จัดรูปแบบเลขบัตรประจำตัวประชาชน 13 หลัก (x-xxxx-xxxxx-xx-x)
 */
export function formatCitizenId(id: string): string {
    if (!id) return "";
    const clean = id.replace(/\D/g, "").slice(0, 13);
    if (clean.length <= 1) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 1)}-${clean.slice(1)}`;
    if (clean.length <= 10) return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5)}`;
    if (clean.length <= 12) return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10)}`;
    return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12)}`;
}

/**
 * ตรวจสอบความถูกต้องของเลขประจำตัวประชาชน 13 หลักด้วย Modulo 11
 */
export function isValidCitizenId(id: string): boolean {
    if (!id) return false;
    const clean = id.replace(/\D/g, "");
    if (clean.length !== 13) return false;

    // ตรวจสอบหลักแรกต้องไม่เป็น 0
    if (clean[0] === "0") return false;

    // คำนวณผลรวมตามหลัก Modulo 11
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(clean[i], 10) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(clean[12], 10);
}

// ═════════════════════════════════════════════════════════════════════════
// 5. รวมออบเจกต์กฎสำหรับการนำไปใช้ใน Form Validation (Rules Object)
// ═════════════════════════════════════════════════════════════════════════

export const rules = {
    phone: {
        format: formatPhoneNumber,
        clean: cleanPhoneNumber,
        validate: isValidPhoneNumber,
        onKeyDown: handlePhoneKeyDown,
        errorMessage: "หมายเลขโทรศัพท์ต้องขึ้นต้นด้วย 0 และมีความยาว 9-10 หลัก (เช่น 081-234-5678, 02-123-4567)"
    },
    time: {
        format12H: formatTime12H,
        formatThai: formatThaiTime,
        validate: isValidTimeFormat,
        errorMessage: "รูปแบบเวลาไม่ถูกต้อง กรุณาระบุในรูปแบบ HH:mm (เช่น 09:30, 14:00)"
    },
    date: {
        formatThai: formatThaiDate,
        formatDisplay: formatDateDisplay,
    },
    email: {
        sanitize: sanitizeEmail,
        validate: isValidEmail,
        errorMessage: "รูปแบบอีเมลไม่ถูกต้อง (เช่น example@company.com)"
    },
    citizenId: {
        format: formatCitizenId,
        validate: isValidCitizenId,
        errorMessage: "เลขประจำตัวประชาชนไม่ถูกต้อง (ต้องเป็นตัวเลข 13 หลักที่ผ่านการตรวจสอบ)"
    }
};

export default rules;
