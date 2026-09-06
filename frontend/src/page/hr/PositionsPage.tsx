
// frontend/src/pages/hr/PositionsPage.tsx

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Briefcase,
    Plus,
    Save,
    Trash2,
    FileText,
    CheckCircle2,
    AlertCircle,
    MapPin,
    DollarSign,
    Eye,
    Sparkles,
    X,
    Download,
    Upload,
    ChevronDown,
    ChevronUp,
    Trash,
    Image as ImageIcon,
    RefreshCw,
    Power,
    CalendarDays,
    Maximize2,
} from "lucide-react";

import {
    getalljobs,
    createjob,
    updatejob,
    updateJobStatus,
    deletejob,
    getapplications,
    updateApplicationScreening,
    extractJobInfoFromImage,
    JOB_STATUS_OPEN,
    JOB_STATUS_CLOSED,
    type JobStatus,
} from "../../services/jobPositionService";

import apiClient from "../../services/apiClient";

interface SubCriterion {
    ID?: number;
    CreatedAt?: string;
    UpdatedAt?: string;
    DeletedAt?: string | null;

    main_criterion_id?: number;

    id: string;
    title: string;
    description: string;
    weight: number;
}

interface Criterion {
    ID?: number;
    CreatedAt?: string;
    UpdatedAt?: string;
    DeletedAt?: string | null;

    job_position_id?: number;

    id: string;
    title: string;
    weight: number;

    sub_criteria: SubCriterion[];
}

interface JobPosition {
    ID: number;

    CreatedAt: string;
    UpdatedAt: string;

    DeletedAt?: string | null;

    title: string;
    department: string;
    location: string;
    salary: string;
    type: string;
    benefits: string;
    contact_info: string;
    description: string;

    criteria: Criterion[];

    image_url?: string;
    image_urls?: string[];

    status: JobStatus;

    application_start_date?: string | null;
    application_end_date?: string | null;

    user_id?: number;

    User?: any;
}

interface ExtractJobData {
    title: string;
    department: string;
    location: string;
    salary: string;
    type: string;

    description: string;
    job_description?: string;

    qualifications: string[];
    responsibilities: string[];
    benefits: string[];
    contact_info?: string;

    suggested_criteria: Criterion[];
}

interface ExtractJobResponse {
    data: ExtractJobData;

    image_url: string;
    image_urls?: string[];

    status: string;
}

const formatApplicationEndDate = (value?: string | null) => {
    if (!value) return "";

    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(year, month - 1, day));
};

const getApplicationDaysRemaining = (value?: string | null) => {
    if (!value) return null;

    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    const endDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    return Math.round(
        (endDate.getTime() - todayDate.getTime()) /
            (1000 * 60 * 60 * 24)
    );
};

/* =========================================================
   COMPONENT
========================================================= */

export default function PositionsPage() {
    const navigate = useNavigate();

    /* =====================================================
       JOB STATES
    ===================================================== */

    const [jobs, setJobs] = useState<JobPosition[]>([]);
    const [selectedJob, setSelectedJob] =
        useState<JobPosition | null>(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState<{
        text: string;
        type: "success" | "error";
    } | null>(null);

    const [isCreating, setIsCreating] = useState(false);

    /* =====================================================
       FORM STATES
    ===================================================== */

    const [editTitle, setEditTitle] = useState("");
    const [editDepartment, setEditDepartment] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [editSalary, setEditSalary] = useState("");

    const [editJobType, setEditJobType] = useState(
        "งานเต็มเวลา (Full-time)"
    );

    const [editBenefits, setEditBenefits] = useState("");
    const [editContactInfo, setEditContactInfo] = useState("");
    const [editDescription, setEditDescription] = useState("");

    const [editStatus, setEditStatus] =
        useState<JobStatus>(JOB_STATUS_OPEN);

    const [editApplicationStartDate, setEditApplicationStartDate] =
        useState("");
    const [editApplicationEndDate, setEditApplicationEndDate] =
        useState("");

    const toggleEditStatus = async () => {
        const nextStatus =
            editStatus === JOB_STATUS_OPEN
                ? JOB_STATUS_CLOSED
                : JOB_STATUS_OPEN;

        setEditStatus(nextStatus);

        if (!selectedJob || isCreating) {
            return;
        }

        try {
            setSaving(true);
            await updateJobStatus(selectedJob.ID, nextStatus);
            setSelectedJob((currentJob) =>
                currentJob
                    ? { ...currentJob, status: nextStatus }
                    : currentJob
            );
            setJobs((currentJobs) =>
                currentJobs.map((job) =>
                    job.ID === selectedJob.ID
                        ? { ...job, status: nextStatus }
                        : job
                )
            );
            setMessage({
                text:
                    nextStatus === JOB_STATUS_OPEN
                        ? "เปิดรับสมัครเรียบร้อยแล้ว"
                        : "ปิดรับสมัครเรียบร้อยแล้ว",
                type: "success",
            });
        } catch (error) {
            setEditStatus(editStatus);
            setMessage({
                text:
                    error instanceof Error
                        ? error.message
                        : "ไม่สามารถอัปเดตสถานะประกาศงานได้",
                type: "error",
            });
        } finally {
            setSaving(false);
        }
    };

    const toDateInputValue = (value?: string | null) =>
        value ? value.slice(0, 10) : "";

    /* =====================================================
       CRITERIA
    ===================================================== */

    const [criteriaList, setCriteriaList] = useState<
        Criterion[]
    >([]);

    const [expandedCriteria, setExpandedCriteria] =
        useState<Record<string, boolean>>({});

    /* =====================================================
       IMAGE / AI ANALYSIS
    ===================================================== */

    const [analyzingImage, setAnalyzingImage] =
        useState(false);

    const [jobImageUrl, setJobImageUrl] =
        useState<string>("");
    const [jobImageUrls, setJobImageUrls] =
        useState<string[]>([]);
    const [viewingJobImageUrl, setViewingJobImageUrl] =
        useState<string | null>(null);

    const fileInputRef =
        useRef<HTMLInputElement | null>(null);

    /* =====================================================
       APPLICANTS
    ===================================================== */

    const [activeTab, setActiveTab] =
        useState<"editor" | "applicants">("editor");

    const [applicants, setApplicants] =
        useState<any[]>([]);

    const [loadingApplicants, setLoadingApplicants] =
        useState(false);

    const [viewingResume, setViewingResume] =
        useState<string | null>(null);

    const [isAnalyzingBulk, setIsAnalyzingBulk] =
        useState(false);

    const [bulkProgress, setBulkProgress] = useState({
        current: 0,
        total: 0,
    });

    const [viewingAIScreening, setViewingAIScreening] =
        useState<any | null>(null);

    /* =====================================================
       HELPER
    ===================================================== */

    const getBackendBaseUrl = () => {
        const baseURL =
            apiClient.defaults.baseURL || "";

        return baseURL.replace(/\/api\/?$/, "");
    };

    const getImageUrl = (url: string) => {
        if (!url) return "";

        if (
            url.startsWith("http://") ||
            url.startsWith("https://")
        ) {
            return url;
        }

        return `${getBackendBaseUrl()}${url}`;
    };

    /* =====================================================
       FETCH JOBS
    ===================================================== */

    const fetchJobs = async () => {
        setLoading(true);

        try {
            const response = await getalljobs();

            if (response && Array.isArray(response.data)) {
                setJobs(response.data);

                if (
                    response.data.length > 0 &&
                    !selectedJob &&
                    !isCreating
                ) {
                    selectJob(response.data[0]);
                } else if (selectedJob) {
                    const updated =
                        response.data.find(
                            (job: JobPosition) =>
                                job.ID === selectedJob.ID
                        );

                    if (updated) {
                        selectJob(updated);
                    }
                }
            }
        } catch (error) {
            console.error(error);

            setMessage({
                text: "ไม่สามารถดึงข้อมูลตำแหน่งงานได้",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       FETCH APPLICANTS
    ===================================================== */

    const fetchApplicants = async (jobId: number) => {
        setLoadingApplicants(true);

        try {
            const response =
                await getapplications(jobId);

            if (
                response &&
                Array.isArray(response.data)
            ) {
                setApplicants(response.data);
            }
        } catch (error) {
            console.error(error);

            setMessage({
                text: "ไม่สามารถโหลดรายชื่อผู้สมัครได้",
                type: "error",
            });
        } finally {
            setLoadingApplicants(false);
        }
    };

    /* =====================================================
       SELECT JOB
    ===================================================== */

    const selectJob = (job: JobPosition) => {
        setSelectedJob(job);

        setEditTitle(job.title || "");
        setEditDepartment(job.department || "");
        setEditLocation(job.location || "");
        setEditSalary(job.salary || "");

        setEditJobType(
            job.type ||
                "งานเต็มเวลา (Full-time)"
        );

        setEditBenefits(job.benefits || "");
        setEditContactInfo(job.contact_info || "");
        setEditDescription(job.description || "");

        setEditStatus(
            job.status || JOB_STATUS_OPEN
        );

        setEditApplicationStartDate(
            toDateInputValue(job.application_start_date)
        );
        setEditApplicationEndDate(
            toDateInputValue(job.application_end_date)
        );

        setCriteriaList(
            Array.isArray(job.criteria)
                ? job.criteria
                : []
        );

        setJobImageUrl(
            job.image_url || ""
        );
        setJobImageUrls(
            Array.isArray(job.image_urls) && job.image_urls.length > 0
                ? job.image_urls
                : job.image_url
                    ? [job.image_url]
                    : []
        );

        setIsCreating(false);
        setActiveTab("editor");
        setApplicants([]);

        setExpandedCriteria({});
    };

    /* =====================================================
       CREATE NEW JOB
    ===================================================== */

    const startNewJob = () => {
        setIsCreating(true);

        setSelectedJob(null);

        setEditTitle("");
        setEditDepartment("");
        setEditLocation("");
        setEditSalary("");

        setEditJobType(
            "งานเต็มเวลา (Full-time)"
        );

        setEditBenefits("");
        setEditContactInfo("");
        setEditDescription("");

        setEditStatus(JOB_STATUS_OPEN);

        setEditApplicationStartDate("");
        setEditApplicationEndDate("");

        setCriteriaList([]);

        setJobImageUrl("");
        setJobImageUrls([]);

        setActiveTab("editor");

        setApplicants([]);

        setExpandedCriteria({});
    };

    /* =====================================================
       IMAGE UPLOAD
    ===================================================== */

    const handleImageButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleAIImageAnalysis = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const files = Array.from(event.target.files || []);

        if (files.length === 0) return;

        /* Validate */

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (files.some((file) => !allowedTypes.includes(file.type))) {
            setMessage({
                text:
                    "รองรับเฉพาะ JPG, JPEG, PNG และ WEBP",
                type: "error",
            });

            event.target.value = "";
            return;
        }

        try {
            setAnalyzingImage(true);

            setMessage(null);

            const response = await extractJobInfoFromImage(
                files
            ) as ExtractJobResponse;

            if (
                response.status !== "success" ||
                !response.data
            ) {
                throw new Error(
                    "AI ไม่สามารถวิเคราะห์ประกาศงานได้"
                );
            }

            const ai = response.data;

            /* ==============================
               BASIC INFORMATION
            ============================== */

            setEditTitle(
                ai.title || ""
            );

            setEditDepartment(
                ai.department || ""
            );

            setEditLocation(
                ai.location || ""
            );

            setEditSalary(
                ai.salary || ""
            );

            setEditJobType(
                ai.type ||
                    "งานเต็มเวลา (Full-time)"
            );

            /* ==============================
               DESCRIPTION
            ============================== */

            let description =
                ai.description ||
                ai.job_description ||
                "";

            const appendSection = (
                current: string,
                heading: string,
                items: string[] | undefined
            ) => {
                if (!Array.isArray(items) || items.length === 0) {
                    return current;
                }

                const section = `${heading}:\n${items
                    .map((item) => `- ${item}`)
                    .join("\n")}`;

                return current
                    ? `${current}\n\n${section}`
                    : section;
            };

            /*
             * ถ้า AI ส่ง responsibilities มา
             * แต่ description มีแค่บางส่วน
             * เราเพิ่ม responsibilities ต่อท้าย
             */

            description = appendSection(
                description,
                "หน้าที่ความรับผิดชอบ",
                ai.responsibilities
            );
            description = appendSection(
                description,
                "คุณสมบัติผู้สมัคร",
                ai.qualifications
            );

            setEditDescription(description);

            /* ==============================
               BENEFITS
            ============================== */

            if (
                Array.isArray(ai.benefits)
            ) {
                setEditBenefits(
                    ai.benefits
                        .map(
                            (item) =>
                                `- ${item}`
                        )
                        .join("\n")
                );
            } else {
                setEditBenefits("");
            }

            setEditContactInfo(ai.contact_info || "");

            /* ==============================
               CRITERIA
            ============================== */

            setCriteriaList(
                Array.isArray(
                    ai.suggested_criteria
                )
                    ? ai.suggested_criteria
                    : []
            );

            /* ==============================
               IMAGE
            ============================== */

            if (response.image_url) {
                setJobImageUrl(
                    response.image_url
                );
            }
            setJobImageUrls(
                response.image_urls?.length
                    ? response.image_urls
                    : response.image_url
                        ? [response.image_url]
                        : []
            );

            /* ==============================
               EXPAND CRITERIA
            ============================== */

            if (
                Array.isArray(
                    ai.suggested_criteria
                )
            ) {
                const expanded: Record<
                    string,
                    boolean
                > = {};

                ai.suggested_criteria.forEach(
                    (criterion) => {
                        expanded[
                            criterion.id
                        ] = true;
                    }
                );

                setExpandedCriteria(
                    expanded
                );
            }

            setMessage({
                text:
                    "AI วิเคราะห์ประกาศงานสำเร็จ กรุณาตรวจสอบและแก้ไขข้อมูลก่อนบันทึก",
                type: "success",
            });
        } catch (error) {
            console.error(
                "AI image analysis error:",
                error
            );

            setMessage({
                text:
                    error instanceof Error
                        ? error.message
                        : "ไม่สามารถวิเคราะห์รูปภาพได้",
                type: "error",
            });
        } finally {
            setAnalyzingImage(false);

            event.target.value = "";
        }
    };

    /* =====================================================
       CRITERIA FUNCTIONS
    ===================================================== */

    const addCriterion = () => {
        const id =
            `c_${Date.now()}`;

        const newCriterion: Criterion = {
            id,
            title: "เกณฑ์ใหม่",
            weight: 0,
            sub_criteria: [],
        };

        setCriteriaList((prev) => [
            ...prev,
            newCriterion,
        ]);

        setExpandedCriteria((prev) => ({
            ...prev,
            [id]: true,
        }));
    };

    const deleteCriterion = (
        criterionIndex: number
    ) => {
        if (
            !window.confirm(
                "ต้องการลบ Criteria นี้หรือไม่?"
            )
        ) {
            return;
        }

        setCriteriaList((prev) =>
            prev.filter(
                (_, index) =>
                    index !== criterionIndex
            )
        );
    };

    const updateCriterion = (
        index: number,
        field:
            | "title"
            | "weight",
        value: string | number
    ) => {
        setCriteriaList((prev) =>
            prev.map((criterion, i) =>
                i === index
                    ? {
                        ...criterion,
                        [field]:
                            field ===
                            "weight"
                                ? Number(
                                    value
                                )
                                : value,
                    }
                    : criterion
            )
        );

    };

    const addSubCriterion = (
        criterionIndex: number
    ) => {
        const newSub: SubCriterion = {
            id:
                `s_${Date.now()}`,
            title:
                "Subcriteria ใหม่",
            description: "",
            weight: 0,
        };

        setCriteriaList((prev) =>
            prev.map(
                (criterion, index) =>
                    index ===
                    criterionIndex
                        ? {
                            ...criterion,
                            sub_criteria: [
                                ...criterion.sub_criteria,
                                newSub,
                            ],
                        }
                        : criterion
            )
        );
    };

    const deleteSubCriterion = (
        criterionIndex: number,
        subIndex: number
    ) => {
        setCriteriaList((prev) =>
            prev.map(
                (criterion, index) =>
                    index ===
                    criterionIndex
                        ? {
                            ...criterion,
                            sub_criteria:
                                criterion.sub_criteria.filter(
                                    (_, i) =>
                                        i !==
                                        subIndex
                                ),
                        }
                        : criterion
            )
        );
    };

    const updateSubCriterion = (
        criterionIndex: number,
        subIndex: number,
        field:
            | "title"
            | "description"
            | "weight",
        value: string | number
    ) => {
        setCriteriaList((prev) =>
            prev.map(
                (criterion, ci) => {
                    if (
                        ci !==
                        criterionIndex
                    ) {
                        return criterion;
                    }

                    return {
                        ...criterion,
                        sub_criteria:
                            criterion.sub_criteria.map(
                                (
                                    sub,
                                    si
                                ) =>
                                    si ===
                                    subIndex
                                        ? {
                                            ...sub,
                                            [field]:
                                                field ===
                                                "weight"
                                                    ? Number(
                                                        value
                                                    )
                                                    : value,
                                        }
                                        : sub
                            ),
                    };
                }
            )
        );
    };

    const toggleCriterion = (
        criterionId: string
    ) => {
        setExpandedCriteria(
            (prev) => ({
                ...prev,
                [criterionId]:
                    !prev[
                        criterionId
                    ],
            })
        );
    };

    /* =====================================================
       SAVE JOB
    ===================================================== */

    const handleSave = async () => {
        if (
            !editTitle.trim() ||
            !editDescription.trim()
        ) {
            setMessage({
                text:
                    "กรุณากรอกตำแหน่งงานและลักษณะงาน",
                type: "error",
            });

            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            /* ==============================
               CLEAN CRITERIA
            ============================== */

            const cleanedCriteria =
                criteriaList.map(
                    (criterion) => ({
                        ...(criterion.ID
                            ? {
                                ID:
                                    criterion.ID,
                            }
                            : {}),
                        id:
                            criterion.id,
                        title:
                            criterion.title,
                        weight:
                            Number(
                                criterion.weight
                            ),
                        sub_criteria:
                            criterion.sub_criteria.map(
                                (sub) => ({
                                    ...(sub.ID
                                        ? {
                                            ID:
                                                sub.ID,
                                        }
                                        : {}),
                                    id:
                                        sub.id,
                                    title:
                                        sub.title,
                                    description:
                                        sub.description,
                                    weight:
                                        Number(
                                            sub.weight
                                        ),
                                })
                            ),
                    })
                );

            /* ==============================
               CREATE
            ============================== */

            if (isCreating) {
                const response =
                    await createjob(
                        editTitle,
                        editDescription,
                        cleanedCriteria,
                        editDepartment,
                        editLocation,
                        editSalary,
                        editJobType,
                        editBenefits,
                        editContactInfo,
                        editStatus,
                        jobImageUrl,
                        editApplicationStartDate,
                        editApplicationEndDate,
                        jobImageUrls
                    );

                if (response) {
                    setMessage({
                        text:
                            "สร้างประกาศงานสำเร็จ!",
                        type: "success",
                    });

                    setIsCreating(false);

                    await fetchJobs();

                    if (
                        response.data
                    ) {
                        selectJob(
                            response.data
                        );
                    }
                }
            }

            /* ==============================
               UPDATE
            ============================== */

            else if (
                selectedJob
            ) {
                const response =
                    await updatejob(
                        selectedJob.ID,
                        editTitle,
                        editDescription,
                        cleanedCriteria,
                        editDepartment,
                        editLocation,
                        editSalary,
                        editJobType,
                        editBenefits,
                        editContactInfo,
                        editStatus,
                        jobImageUrl,
                        editApplicationStartDate,
                        editApplicationEndDate,
                        jobImageUrls
                    );

                if (response) {
                    setMessage({
                        text:
                            "อัปเดตประกาศงานสำเร็จ!",
                        type: "success",
                    });

                    await fetchJobs();
                }
            }
        } catch (error) {
            console.error(error);

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "เกิดข้อผิดพลาดในการบันทึก";

            setMessage({
                text: errorMessage,
                type: "error",
            });
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       DELETE JOB
    ===================================================== */

    const handleDelete = async (
        id: number
    ) => {
        if (
            !window.confirm(
                "คุณต้องการลบตำแหน่งงานนี้ใช่หรือไม่?\n\nการลบจะทำให้ตำแหน่งนี้หายไปจากหน้าแรกด้วย"
            )
        ) {
            return;
        }

        try {
            const response =
                await deletejob(id);

            if (response) {
                setMessage({
                    text:
                        "ลบประกาศตำแหน่งงานสำเร็จ",
                    type: "success",
                });

                setSelectedJob(null);

                await fetchJobs();
            }
        } catch (error) {
            console.error(error);

            setMessage({
                text:
                    "ลบตำแหน่งงานไม่สำเร็จ",
                type: "error",
            });
        }
    };

    /* =====================================================
       BULK AI SCREENING
    ===================================================== */

    const TYPHOON_API =
        import.meta.env
            .VITE_TYPHOON_API_URL ||
        "http://localhost:8000";

    const runBulkAnalysis = async () => {
        if (
            !selectedJob ||
            applicants.length === 0
        ) {
            return;
        }

        setIsAnalyzingBulk(true);

        setBulkProgress({
            current: 0,
            total:
                applicants.length,
        });

        for (
            let i = 0;
            i < applicants.length;
            i++
        ) {
            const app =
                applicants[i];

            setBulkProgress(
                (prev) => ({
                    ...prev,
                    current: i,
                })
            );

            const resumeText =
                app.ResumeText ||
                app.resume_text ||
                "";

            if (
                !resumeText.trim()
            ) {
                continue;
            }

            try {
                let userContent =
                    `วิเคราะห์ Resume นี้อย่างละเอียด:\n\n${resumeText}`;

                if (
                    editDescription.trim()
                ) {
                    userContent +=
                        `\n\n=== ลักษณะงาน / JD ===\n${editDescription}`;
                }

                if (
                    criteriaList.length >
                    0
                ) {
                    userContent +=
                        `\n\n=== เกณฑ์ในการคัดเลือก ===\n`;

                    criteriaList.forEach(
                        (
                            criterion
                        ) => {
                            userContent +=
                                `\n${criterion.title} (${criterion.weight}%)`;

                            criterion.sub_criteria.forEach(
                                (
                                    sub
                                ) => {
                                    userContent +=
                                        `\n- ${sub.title}: ${sub.description} (${sub.weight}%)`;
                                }
                            );
                        }
                    );
                }

                const SYSTEM_PROMPT =
                    `คุณคือผู้เชี่ยวชาญด้านการสรรหาทรัพยากรบุคคล (HR Recruitment Expert)

วิเคราะห์ผู้สมัครงานเทียบกับลักษณะงานและเกณฑ์การคัดเลือก

กรุณาตอบกลับในรูปแบบภาษาไทยโดยระบุสิ่งนี้ใน 2 บรรทัดแรกเท่านั้น:
SCORE: [คะแนน 0 ถึง 100]
SUMMARY: [สรุปสั้นๆ จุดเด่น/จุดด้อย 1-2 ประโยค]

หลังจาก 2 บรรทัดแรกแล้ว ให้เขียนการวิเคราะห์อย่างละเอียด ได้แก่ จุดเด่น จุดที่ควรพัฒนา และคำถามแนะนำสำหรับการสัมภาษณ์`;

                const response =
                    await fetch(
                        `${TYPHOON_API}/chat`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body:
                                JSON.stringify(
                                    {
                                        messages:
                                            [
                                                {
                                                    role: "user",
                                                    content:
                                                        userContent,
                                                },
                                            ],

                                        system_prompt:
                                            SYSTEM_PROMPT,

                                        max_new_tokens:
                                            2048,
                                    }
                                ),
                        }
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        "AI ไม่ตอบสนอง"
                    );
                }

                const aiResultText =
                    await response.text();

                let score = 50;

                const scoreMatch =
                    aiResultText.match(
                        /SCORE:\s*(\d+)/i
                    );

                if (
                    scoreMatch
                ) {
                    score =
                        parseInt(
                            scoreMatch[1],
                            10
                        );
                }

                await updateApplicationScreening(
                    app.ID,
                    score,
                    aiResultText,
                    "typhoon2.5-qwen3-4b",
                    resumeText
                );
            } catch (error) {
                console.error(
                    `เกิดข้อผิดพลาดในการประเมินผู้สมัคร ID: ${app.ID}`,
                    error
                );
            }
        }

        setBulkProgress({
            current:
                applicants.length,
            total:
                applicants.length,
        });

        await fetchApplicants(
            selectedJob.ID
        );

        setIsAnalyzingBulk(false);
    };

    /* =====================================================
       EFFECTS
    ===================================================== */

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        if (
            selectedJob &&
            activeTab ===
                "applicants" &&
            !isCreating
        ) {
            fetchApplicants(
                selectedJob.ID
            );
        }
    }, [
        selectedJob,
        activeTab,
        isCreating,
    ]);

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="p-8 space-y-6 h-[calc(100vh-5.5rem)] flex flex-col min-h-0">
            {/* =================================================
                HEADER
            ================================================= */}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">
                        จัดการประกาศรับสมัครงาน
                    </h1>

                    <p className="text-slate-400 text-sm mt-1">
                        บันทึกตำแหน่งงานลงฐานข้อมูล
                        เพื่อแสดงผลบน Landing Page
                        และใช้เป็นเกณฑ์ให้ AI
                        ช่วยคัดกรอง Resume
                    </p>
                </div>

                <button
                    onClick={
                        startNewJob
                    }
                    className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 active:scale-95 text-sm"
                >
                    <Plus className="w-4 h-4" />

                    เพิ่มตำแหน่งงานใหม่
                </button>
            </div>

            {/* =================================================
                MESSAGE
            ================================================= */}

            {message && (
                <div
                    className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold ${
                        message.type ===
                        "success"
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                            : "bg-red-50 border-red-100 text-red-600"
                    }`}
                >
                    {message.type ===
                    "success" ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 shrink-0" />
                    )}

                    <span>
                        {
                            message.text
                        }
                    </span>

                    <button
                        className="ml-auto"
                        onClick={() =>
                            setMessage(
                                null
                            )
                        }
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* =================================================
                MAIN GRID
            ================================================= */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
                {/* =================================================
                    LEFT - JOB LIST
                ================================================= */}

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-slate-400" />

                            <h3 className="font-bold text-slate-700 text-sm">
                                ตำแหน่งงานทั้งหมด
                            </h3>
                        </div>

                        <span className="text-xs font-bold bg-blue-50 text-[#4169E1] px-2.5 py-1 rounded-full">
                            {
                                jobs.length
                            }{" "}
                            ตำแหน่ง
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="py-12 text-center text-slate-400 text-sm">
                                กำลังโหลดตำแหน่งงาน...
                            </div>
                        ) : jobs.length ===
                          0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm">
                                ยังไม่มีตำแหน่งงานในฐานข้อมูล
                            </div>
                        ) : (
                            jobs.map(
                                (
                                    job
                                ) => {
                                    const isSelected =
                                        selectedJob?.ID ===
                                            job.ID &&
                                        !isCreating;
                                    const applicationDaysRemaining =
                                        getApplicationDaysRemaining(
                                            job.application_end_date
                                        );

                                    return (
                                        <div
                                            key={
                                                job.ID
                                            }
                                            onClick={() =>
                                                selectJob(
                                                    job
                                                )
                                            }
                                            className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                                                isSelected
                                                    ? "bg-blue-50/40 border-blue-100"
                                                    : "bg-transparent border-transparent hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                job.status ===
                                                                "เปิดรับสมัคร"
                                                                    ? "bg-emerald-50 text-emerald-600"
                                                                    : "bg-slate-100 text-slate-400"
                                                            }`}
                                                        >
                                                            {
                                                                job.status
                                                            }
                                                        </span>

                                                        {job.department && (
                                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-semibold truncate max-w-[120px]">
                                                                {
                                                                    job.department
                                                                }
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p
                                                        className={`font-bold text-sm truncate ${
                                                            isSelected
                                                                ? "text-[#4169E1]"
                                                                : "text-slate-800"
                                                        }`}
                                                    >
                                                        {
                                                            job.title
                                                        }
                                                    </p>

                                                    <div className="flex flex-col gap-1 mt-2 text-[11px] text-slate-400">
                                                        {job.location && (
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="w-3 h-3 shrink-0" />

                                                                <span className="truncate">
                                                                    {
                                                                        job.location
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}

                                                        {job.salary && (
                                                            <div className="flex items-center gap-1.5">
                                                                <DollarSign className="w-3 h-3 shrink-0" />

                                                                <span>
                                                                    {
                                                                        job.salary
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-1.5">
                                                            <Sparkles className="w-3 h-3 shrink-0" />

                                                            <span>
                                                                {
                                                                    Array.isArray(
                                                                        job.criteria
                                                                    )
                                                                        ? job.criteria.length
                                                                        : 0
                                                                }{" "}
                                                                Criteria
                                                            </span>
                                                        </div>

                                                        {job.application_end_date && (
                                                            <div
                                                                className={`flex items-center gap-1.5 ${
                                                                    applicationDaysRemaining !== null &&
                                                                    applicationDaysRemaining < 0
                                                                        ? "text-rose-500"
                                                                        : applicationDaysRemaining !== null &&
                                                                            applicationDaysRemaining <= 7
                                                                            ? "text-amber-600"
                                                                            : "text-slate-400"
                                                                }`}
                                                            >
                                                                <CalendarDays className="w-3 h-3 shrink-0" />
                                                                <span className="truncate">
                                                                    สิ้นสุด {formatApplicationEndDate(job.application_end_date)}
                                                                    {applicationDaysRemaining !== null &&
                                                                        (applicationDaysRemaining < 0
                                                                            ? " (หมดเขตแล้ว)"
                                                                            : ` (เหลือ ${applicationDaysRemaining} วัน)`)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(
                                                        event
                                                    ) => {
                                                        event.stopPropagation();

                                                        handleDelete(
                                                            job.ID
                                                        );
                                                    }}
                                                    className="text-slate-300 hover:text-red-500 p-1 transition-all shrink-0 mt-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }
                            )
                        )}
                    </div>
                </div>

                {/* =================================================
                    RIGHT
                ================================================= */}

                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
                    {!selectedJob &&
                    !isCreating ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <Briefcase className="w-8 h-8 text-[#4169E1]" />
                            </div>

                            <p className="text-slate-700 font-bold text-lg">
                                เลือกตำแหน่งงานเพื่อแก้ไขข้อมูล
                            </p>

                            <p className="text-slate-400 text-sm">
                                คลิกเลือกจากรายการทางซ้าย
                                หรือกดปุ่ม
                                "เพิ่มตำแหน่งงานใหม่"
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* =================================================
                                EDITOR HEADER
                            ================================================= */}

                            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3 flex-1">
                                    <FileText className="w-5 h-5 text-[#4169E1] shrink-0" />

                                    <input
                                        type="text"
                                        disabled={
                                            activeTab ===
                                            "applicants"
                                        }
                                        value={
                                            editTitle
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setEditTitle(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="ชื่อตำแหน่งงาน"
                                        className="font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-[#4169E1]/30 disabled:bg-slate-100/50"
                                    />
                                </div>

                                {!isCreating && (
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setActiveTab(
                                                    "editor"
                                                )
                                            }
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold ${
                                                activeTab ===
                                                "editor"
                                                    ? "bg-white text-[#4169E1] shadow-sm"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            ประกาศงาน
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setActiveTab(
                                                    "applicants"
                                                )
                                            }
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold ${
                                                activeTab ===
                                                "applicants"
                                                    ? "bg-white text-[#4169E1] shadow-sm"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            รายชื่อผู้สมัคร
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={toggleEditStatus}
                                    disabled={activeTab === "applicants"}
                                    title="เปิดหรือปิดการรับสมัคร"
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                        editStatus === JOB_STATUS_OPEN
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                            : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                                    }`}
                                >
                                    <Power className="w-4 h-4" />
                                    {editStatus === JOB_STATUS_OPEN
                                        ? "เปิดรับสมัคร"
                                        : "ปิดรับสมัคร"}
                                </button>

                                {activeTab ===
                                    "editor" && (
                                    <button
                                        onClick={
                                            handleSave
                                        }
                                        disabled={
                                            saving ||
                                            analyzingImage
                                        }
                                        className="flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm text-sm shrink-0 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />

                                        {saving
                                            ? "กำลังบันทึก..."
                                            : isCreating
                                                ? "สร้างประกาศ"
                                                : "อัปเดตประกาศ"}
                                    </button>
                                )}
                            </div>

                            {/* =================================================
                                BODY
                            ================================================= */}

                            <div className="flex-1 p-6 overflow-y-auto bg-white">
                                {activeTab ===
                                "editor" ? (
                                    <div className="flex flex-col space-y-6">
                                        {/* =================================================
                                            AI IMAGE UPLOAD
                                        ================================================= */}

                                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles className="w-5 h-5 text-[#4169E1]" />

                                                        <h3 className="font-bold text-slate-800">
                                                            วิเคราะห์ประกาศงานด้วย AI
                                                        </h3>
                                                    </div>

                                                    <p className="text-xs text-slate-500 mt-1">
                                                        อัปโหลดรูปประกาศงาน
                                                        แล้ว AI
                                                        จะอ่านข้อมูลและเติมลงใน Form
                                                        ให้อัตโนมัติ
                                                    </p>
                                                </div>

                                                <div>
                                                    <input
                                                        ref={
                                                            fileInputRef
                                                        }
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                                        multiple
                                                        onChange={
                                                            handleAIImageAnalysis
                                                        }
                                                        className="hidden"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleImageButtonClick
                                                        }
                                                        disabled={
                                                            analyzingImage
                                                        }
                                                        className="inline-flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                                                    >
                                                        {analyzingImage ? (
                                                            <>
                                                                <RefreshCw className="w-4 h-4 animate-spin" />

                                                                กำลังวิเคราะห์...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4" />

                                                                อัปโหลดรูปภาพ
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {jobImageUrls.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-blue-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <ImageIcon className="w-4 h-4 text-slate-400" />

                                                        <span className="text-xs font-bold text-slate-500">
                                                            รูปประกาศงาน
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        {jobImageUrls.map((imageUrl, index) => (
                                                            <button
                                                                key={`${imageUrl}-${index}`}
                                                                type="button"
                                                                onClick={() =>
                                                                    setViewingJobImageUrl(
                                                                        getImageUrl(imageUrl)
                                                                    )
                                                                }
                                                                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white cursor-zoom-in"
                                                                title="คลิกเพื่อดูรูปเต็ม"
                                                            >
                                                                <img
                                                                    src={getImageUrl(imageUrl)}
                                                                    alt={`Job Announcement ${index + 1}`}
                                                                    className="h-40 w-full object-contain transition-transform group-hover:scale-[1.02]"
                                                                />
                                                                <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                                    <Maximize2 className="w-3 h-3" />
                                                                    ดูรูปเต็ม
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* =================================================
                                            METADATA
                                        ================================================= */}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    แผนก / ฝ่าย
                                                </label>

                                                <input
                                                    type="text"
                                                    value={
                                                        editDepartment
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setEditDepartment(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    placeholder="เช่น IT & Innovation, HR"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    สถานที่ปฏิบัติงาน
                                                </label>

                                                <input
                                                    type="text"
                                                    value={
                                                        editLocation
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setEditLocation(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    placeholder="สถานที่ปฏิบัติงาน"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    อัตราเงินเดือน
                                                </label>

                                                <input
                                                    type="text"
                                                    value={
                                                        editSalary
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setEditSalary(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    placeholder="เช่น 45,000 - 65,000 บาท"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    ประเภทการจ้างงาน
                                                </label>

                                                <select
                                                    value={
                                                        editJobType
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setEditJobType(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white"
                                                >
                                                    <option value="งานเต็มเวลา (Full-time)">
                                                        งานเต็มเวลา
                                                        (Full-time)
                                                    </option>

                                                    <option value="งานนอกเวลา (Part-time)">
                                                        งานนอกเวลา
                                                        (Part-time)
                                                    </option>

                                                    <option value="งานสัญญาจ้าง (Contract)">
                                                        งานสัญญาจ้าง
                                                        (Contract)
                                                    </option>

                                                    <option value="ฝึกงาน (Internship)">
                                                        ฝึกงาน
                                                        (Internship)
                                                    </option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    สถานะการรับสมัคร
                                                </label>

                                                <select
                                                    value={editStatus}
                                                    onChange={(event) => {
                                                        const status = event.target.value;

                                                        if (
                                                            status === JOB_STATUS_OPEN ||
                                                            status === JOB_STATUS_CLOSED
                                                        ) {
                                                            setEditStatus(status);
                                                        }
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white"
                                                >
                                                    <option value={JOB_STATUS_OPEN}>
                                                        เปิดรับสมัคร
                                                    </option>

                                                    <option value={JOB_STATUS_CLOSED}>
                                                        ปิดรับสมัครแล้ว
                                                    </option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    วันที่เริ่มรับสมัคร
                                                </label>

                                                <input
                                                    type="date"
                                                    value={editApplicationStartDate}
                                                    onChange={(event) =>
                                                        setEditApplicationStartDate(
                                                            event.target.value
                                                        )
                                                    }
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                    วันที่สิ้นสุดรับสมัคร
                                                </label>

                                                <input
                                                    type="date"
                                                    min={editApplicationStartDate || undefined}
                                                    value={editApplicationEndDate}
                                                    onChange={(event) =>
                                                        setEditApplicationEndDate(
                                                            event.target.value
                                                        )
                                                    }
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#4169E1]/20 focus:bg-white"
                                                />
                                            </div>
                                        </div>

                                        <hr className="border-slate-100" />

                                        {/* =================================================
                                            DESCRIPTION
                                        ================================================= */}

                                        <div className="order-1">
                                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                ลักษณะงานที่ทำ
                                                (Job Description)
                                                *
                                            </label>

                                            <textarea
                                                value={
                                                    editDescription
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEditDescription(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                rows={
                                                    7
                                                }
                                                placeholder="ระบุความรับผิดชอบและลักษณะงาน..."
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                            />
                                        </div>

                                        {/* =================================================
                                            CRITERIA
                                        ================================================= */}

                                        <div className="order-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                        เกณฑ์คัดเลือก
                                                        (Criteria)
                                                    </label>

                                                    <p className="text-xs text-slate-400 mt-1">
                                                        สามารถแก้ไข
                                                        เพิ่ม
                                                        หรือลบ Criteria
                                                        และ Subcriteria
                                                        ได้
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        addCriterion
                                                    }
                                                    className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#4169E1] px-3 py-2 rounded-lg text-xs font-bold"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />

                                                    เพิ่ม Criteria
                                                </button>
                                            </div>

                                            {criteriaList.length ===
                                            0 ? (
                                                <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                                                    <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />

                                                    <p className="text-sm font-bold text-slate-500">
                                                        ยังไม่มี
                                                        Criteria
                                                    </p>

                                                    <p className="text-xs text-slate-400 mt-1">
                                                        AI
                                                        อาจไม่สามารถสกัดเกณฑ์จากรูปได้
                                                        หรือคุณสามารถเพิ่มเองได้
                                                    </p>

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            addCriterion
                                                        }
                                                        className="mt-4 inline-flex items-center gap-2 bg-[#4169E1] text-white px-4 py-2 rounded-xl text-xs font-bold"
                                                    >
                                                        <Plus className="w-4 h-4" />

                                                        เพิ่ม Criteria
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {criteriaList.map(
                                                        (
                                                            criterion,
                                                            criterionIndex
                                                        ) => {
                                                            const expanded =
                                                                expandedCriteria[
                                                                    criterion
                                                                        .id
                                                                ] ??
                                                                true;

                                                            return (
                                                                <div
                                                                    key={
                                                                        criterion.id
                                                                    }
                                                                    className="border border-slate-200 rounded-2xl overflow-hidden"
                                                                >
                                                                    {/* CRITERION HEADER */}

                                                                    <div className="bg-slate-50 px-4 py-3">
                                                                        <div className="flex items-center gap-3">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    toggleCriterion(
                                                                                        criterion.id
                                                                                    )
                                                                                }
                                                                                className="text-slate-400 hover:text-slate-700"
                                                                            >
                                                                                {expanded ? (
                                                                                    <ChevronUp className="w-4 h-4" />
                                                                                ) : (
                                                                                    <ChevronDown className="w-4 h-4" />
                                                                                )}
                                                                            </button>

                                                                            <div className="flex-1">
                                                                                <input
                                                                                    type="text"
                                                                                    value={
                                                                                        criterion.title
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        updateCriterion(
                                                                                            criterionIndex,
                                                                                            "title",
                                                                                            event
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#4169E1]/20"
                                                                                    placeholder="ชื่อ Criteria"
                                                                                />
                                                                            </div>

                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    value={
                                                                                        criterion.weight
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        updateCriterion(
                                                                                            criterionIndex,
                                                                                            "weight",
                                                                                            event
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm text-center font-bold outline-none"
                                                                                />

                                                                                <span className="text-xs text-slate-400">
                                                                                    %
                                                                                </span>
                                                                            </div>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    deleteCriterion(
                                                                                        criterionIndex
                                                                                    )
                                                                                }
                                                                                className="p-2 text-slate-300 hover:text-red-500"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* SUBCRITERIA */}

                                                                    {expanded && (
                                                                        <div className="p-4 space-y-3">
                                                                            {criterion
                                                                                .sub_criteria
                                                                                .length ===
                                                                            0 ? (
                                                                                <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                                                                    ยังไม่มี
                                                                                    Subcriteria
                                                                                </div>
                                                                            ) : (
                                                                                criterion.sub_criteria.map(
                                                                                    (
                                                                                        sub,
                                                                                        subIndex
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                sub.id
                                                                                            }
                                                                                            className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm"
                                                                                        >
                                                                                            <div className="flex items-start gap-3">
                                                                                                <div className="flex-1 space-y-3">
                                                                                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_90px] gap-3">
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={
                                                                                                                sub.title
                                                                                                            }
                                                                                                            onChange={(
                                                                                                                event
                                                                                                            ) =>
                                                                                                                updateSubCriterion(
                                                                                                                    criterionIndex,
                                                                                                                    subIndex,
                                                                                                                    "title",
                                                                                                                    event
                                                                                                                        .target
                                                                                                                        .value
                                                                                                                )
                                                                                                            }
                                                                                                            placeholder="ชื่อ Subcriteria"
                                                                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20"
                                                                                                        />

                                                                                                        <div className="flex items-center gap-1">
                                                                                                            <input
                                                                                                                type="number"
                                                                                                                min="0"
                                                                                                                max="100"
                                                                                                                value={
                                                                                                                    sub.weight
                                                                                                                }
                                                                                                                onChange={(
                                                                                                                    event
                                                                                                                ) =>
                                                                                                                    updateSubCriterion(
                                                                                                                        criterionIndex,
                                                                                                                        subIndex,
                                                                                                                        "weight",
                                                                                                                        event
                                                                                                                            .target
                                                                                                                            .value
                                                                                                                    )
                                                                                                                }
                                                                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center font-bold outline-none"
                                                                                                            />

                                                                                                            <span className="text-xs text-slate-400">
                                                                                                                %
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <textarea
                                                                                                        value={
                                                                                                            sub.description
                                                                                                        }
                                                                                                        onChange={(
                                                                                                            event
                                                                                                        ) =>
                                                                                                            updateSubCriterion(
                                                                                                                criterionIndex,
                                                                                                                subIndex,
                                                                                                                "description",
                                                                                                                event
                                                                                                                    .target
                                                                                                                    .value
                                                                                                            )
                                                                                                        }
                                                                                                        rows={
                                                                                                            3
                                                                                                        }
                                                                                                        placeholder="รายละเอียดของ Subcriteria..."
                                                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                                                                                    />
                                                                                                </div>

                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() =>
                                                                                                        deleteSubCriterion(
                                                                                                            criterionIndex,
                                                                                                            subIndex
                                                                                                        )
                                                                                                    }
                                                                                                    className="p-2 text-slate-300 hover:text-red-500"
                                                                                                >
                                                                                                    <Trash className="w-4 h-4" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                )
                                                                            )}

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    addSubCriterion(
                                                                                        criterionIndex
                                                                                    )
                                                                                }
                                                                                className="w-full border border-dashed border-blue-200 hover:bg-blue-50 text-[#4169E1] py-2.5 rounded-xl text-xs font-bold transition-all"
                                                                            >
                                                                                <Plus className="w-3.5 h-3.5 inline mr-1" />

                                                                                เพิ่ม
                                                                                Subcriteria
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* =================================================
                                            BENEFITS
                                        ================================================= */}

                                        <div className="order-2">
                                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                สวัสดิการพนักงาน
                                                (Benefits)
                                            </label>

                                            <textarea
                                                value={
                                                    editBenefits
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEditBenefits(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="ระบุสวัสดิการ..."
                                                rows={
                                                    4
                                                }
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                            />
                                        </div>

                                        {/* =================================================
                                            CONTACT
                                        ================================================= */}

                                        <div className="order-3">
                                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                                วิธีการสมัคร /
                                                ข้อมูลติดต่อ
                                            </label>

                                            <textarea
                                                value={
                                                    editContactInfo
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEditContactInfo(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="ระบุอีเมล เบอร์โทร หรือลิงก์สำหรับสมัครงาน..."
                                                rows={
                                                    3
                                                }
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[#4169E1]/20 resize-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* =================================================
                                       APPLICANTS
                                    ================================================= */

                                    <div className="space-y-4">
                                        {applicants.length >
                                            0 && (
                                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div>
                                                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                                                        การวิเคราะห์กลุ่ม
                                                    </span>

                                                    <span className="text-sm font-bold text-slate-700 mt-0.5 block">
                                                        ประเมิน Resume
                                                        ของผู้สมัครทั้งหมด
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={
                                                        runBulkAnalysis
                                                    }
                                                    disabled={
                                                        isAnalyzingBulk
                                                    }
                                                    className="inline-flex items-center gap-2 bg-[#4169E1] hover:bg-[#3152c4] text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                                                >
                                                    <Sparkles className="w-4 h-4" />

                                                    วิเคราะห์ทุกคนด้วย AI
                                                    (
                                                    {
                                                        applicants.length
                                                    }{" "}
                                                    คน)
                                                </button>
                                            </div>
                                        )}

                                        {loadingApplicants ? (
                                            <div className="py-12 text-center text-slate-400 text-sm">
                                                กำลังโหลดรายชื่อผู้สมัคร...
                                            </div>
                                        ) : applicants.length ===
                                          0 ? (
                                            <div className="py-12 text-center text-slate-400 text-sm">
                                                ยังไม่มีผู้สมัครส่ง Resume
                                                เข้ามาในตำแหน่งนี้
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left text-slate-500">
                                                    <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                                                        <tr>
                                                            <th className="px-4 py-3">
                                                                ผู้สมัคร
                                                            </th>

                                                            <th className="px-4 py-3">
                                                                ข้อมูลติดต่อ
                                                            </th>

                                                            <th className="px-4 py-3 text-center">
                                                                คะแนน AI
                                                            </th>

                                                            <th className="px-4 py-3 text-right">
                                                                การจัดการ
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody className="divide-y divide-slate-100">
                                                        {applicants.map(
                                                            (
                                                                app
                                                            ) => (
                                                                <tr
                                                                    key={
                                                                        app.ID
                                                                    }
                                                                    className="hover:bg-slate-50/50"
                                                                >
                                                                    <td className="px-4 py-4 font-bold text-slate-800">
                                                                        {app.Candidate
                                                                            ? `${app.Candidate.first_name} ${app.Candidate.last_name}`
                                                                            : "ไม่ระบุชื่อ"}
                                                                    </td>

                                                                    <td className="px-4 py-4 space-y-1 text-xs">
                                                                        <p>
                                                                            {
                                                                                app
                                                                                    .Candidate
                                                                                    ?.email
                                                                            }
                                                                        </p>

                                                                        <p className="text-slate-400">
                                                                            {
                                                                                app
                                                                                    .Candidate
                                                                                    ?.phone
                                                                            }
                                                                        </p>
                                                                    </td>

                                                                    <td className="px-4 py-4 text-center">
                                                                        {app.AIScreening ? (
                                                                            <div className="inline-flex items-center gap-2">
                                                                                <span
                                                                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white ${
                                                                                        app
                                                                                            .AIScreening
                                                                                            .skill_score >=
                                                                                        80
                                                                                            ? "bg-emerald-500"
                                                                                            : app
                                                                                                  .AIScreening
                                                                                                  .skill_score >=
                                                                                              50
                                                                                                ? "bg-amber-500"
                                                                                                : "bg-rose-500"
                                                                                    }`}
                                                                                >
                                                                                    {Math.round(
                                                                                        app
                                                                                            .AIScreening
                                                                                            .skill_score
                                                                                    )}
                                                                                </span>

                                                                                <button
                                                                                    onClick={() =>
                                                                                        setViewingAIScreening(
                                                                                            app.AIScreening
                                                                                        )
                                                                                    }
                                                                                    className="text-xs text-[#4169E1] hover:underline font-bold"
                                                                                >
                                                                                    ดูผลวิเคราะห์
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-md">
                                                                                ยังไม่ได้ประเมิน
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    <td className="px-4 py-4 text-right space-x-2">
                                                                        {app.resume_url && (
                                                                            <a
                                                                                href={`${getBackendBaseUrl()}${app.resume_url}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-600 px-3 py-1.5 rounded-lg text-xs font-bold"
                                                                            >
                                                                                <Download className="w-3.5 h-3.5" />

                                                                                เปิดไฟล์ Resume
                                                                            </a>
                                                                        )}

                                                                        <button
                                                                            onClick={() =>
                                                                                setViewingResume(
                                                                                    app.ResumeText ||
                                                                                        app.resume_text ||
                                                                                        ""
                                                                                )
                                                                            }
                                                                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold"
                                                                        >
                                                                            <Eye className="w-3.5 h-3.5" />

                                                                            ดู Resume
                                                                        </button>

                                                                        <button
                                                                            onClick={() =>
                                                                                navigate(
                                                                                    "/hr/screening",
                                                                                    {
                                                                                        state: {
                                                                                            resumeText:
                                                                                                app.ResumeText ||
                                                                                                app.resume_text ||
                                                                                                "",
                                                                                            jobId:
                                                                                                selectedJob?.ID,
                                                                                        },
                                                                                    }
                                                                                )
                                                                            }
                                                                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-[#4169E1] px-3 py-1.5 rounded-lg text-xs font-bold"
                                                                        >
                                                                            <Sparkles className="w-3.5 h-3.5" />

                                                                            ส่งให้ AI
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {viewingJobImageUrl && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
                    onClick={() => setViewingJobImageUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setViewingJobImageUrl(null)}
                        className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                        title="ปิดรูปเต็ม"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={viewingJobImageUrl}
                        alt="Job Announcement Full Size"
                        className="max-h-[92vh] max-w-[95vw] object-contain"
                        onClick={(event) => event.stopPropagation()}
                    />
                </div>
            )}

            {/* =====================================================
                RESUME MODAL
            ===================================================== */}

            {viewingResume && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6 flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#4169E1]" />

                                ประวัติผู้สมัคร
                            </h3>

                            <button
                                onClick={() =>
                                    setViewingResume(
                                        null
                                    )
                                }
                                className="text-slate-400 hover:text-slate-600 p-1.5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {
                                viewingResume
                            }
                        </div>

                        <div className="mt-4 text-right">
                            <button
                                onClick={() =>
                                    setViewingResume(
                                        null
                                    )
                                }
                                className="bg-[#4169E1] text-white font-bold px-6 py-2.5 rounded-xl text-xs"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                BULK AI MODAL
            ===================================================== */}

            {isAnalyzingBulk && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-[#4169E1]" />
                        </div>

                        <h3 className="font-bold text-slate-800 text-lg">
                            กำลังประเมินผู้สมัครด้วย AI
                        </h3>

                        <p className="text-slate-500 text-sm">
                            กรุณารอ ระบบกำลังวิเคราะห์ผู้สมัคร
                        </p>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-400">
                                <span>
                                    ความคืบหน้า
                                </span>

                                <span>
                                    {
                                        bulkProgress.current
                                    }{" "}
                                    /{" "}
                                    {
                                        bulkProgress.total
                                    }
                                </span>
                            </div>

                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-[#4169E1] h-2.5 rounded-full transition-all"
                                    style={{
                                        width: `${
                                            (bulkProgress.current /
                                                (bulkProgress.total ||
                                                    1)) *
                                            100
                                        }%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                AI SCREENING MODAL
            ===================================================== */}

            {viewingAIScreening && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />

                                ผลการวิเคราะห์โดยละเอียดด้วย AI
                            </h3>

                            <button
                                onClick={() =>
                                    setViewingAIScreening(
                                        null
                                    )
                                }
                                className="text-slate-400 hover:text-slate-600 p-1.5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div>
                                    <span className="text-xs text-slate-400 font-semibold block">
                                        คะแนนความเหมาะสม
                                    </span>

                                    <span className="text-2xl font-black text-slate-800 mt-1 block">
                                        {Math.round(
                                            viewingAIScreening.skill_score
                                        )}

                                        <span className="text-sm font-normal text-slate-400">
                                            {" "}
                                            / 100
                                        </span>
                                    </span>
                                </div>

                                <div className="text-right">
                                    <span className="text-xs text-slate-400 font-semibold block">
                                        โมเดลประมวลผล
                                    </span>

                                    <span className="text-sm font-bold text-slate-700 mt-2.5 block">
                                        {
                                            viewingAIScreening.model_used
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {
                                    viewingAIScreening.strengths
                                }
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                            <button
                                onClick={() =>
                                    setViewingAIScreening(
                                        null
                                    )
                                }
                                className="bg-[#4169E1] text-white font-bold px-6 py-2.5 rounded-xl text-xs"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
