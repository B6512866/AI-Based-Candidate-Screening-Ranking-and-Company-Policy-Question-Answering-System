
// frontend/src/services/jobPositionService.ts

import apiClient from "./apiClient";

export const JOB_STATUS_OPEN = "เปิดรับสมัคร" as const;
export const JOB_STATUS_CLOSED = "ปิดรับสมัครแล้ว" as const;
export type JobStatus = typeof JOB_STATUS_OPEN | typeof JOB_STATUS_CLOSED;

/* =========================================================
   TYPES
========================================================= */

export interface SubCriterion {
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

export interface Criterion {
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

export interface JobPosition {
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

export interface ExtractJobData {
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

export interface ExtractJobResponse {
    data: ExtractJobData;
    image_url: string;
    image_urls?: string[];
    status: string;
}

/* =========================================================
   GET ALL JOBS
========================================================= */

export async function getalljobs() {
    const res =
        await apiClient.get(
            "/job-positions"
        );

    return res.data;
}

/* =========================================================
   GET JOB BY ID
========================================================= */

export async function getbyidjob(
    id: number
) {
    const res =
        await apiClient.get(
            `/job-positions/${id}`
        );

    return res.data;
}

/* =========================================================
   CREATE JOB
========================================================= */

export async function createjob(
    title: string,
    description: string,
    criteria: Criterion[] = [],
    department: string = "",
    location: string = "",
    salary: string = "",
    jobType: string = "",
    benefits: string = "",
    contactInfo: string = "",
    status: JobStatus = JOB_STATUS_OPEN,
    imageUrl: string = "",
    applicationStartDate: string = "",
    applicationEndDate: string = "",
    imageUrls: string[] = []
) {
    const res =
        await apiClient.post(
            "/job-positions",
            {
                title,

                description,

                criteria,

                department,

                location,

                salary,

                type: jobType,

                benefits,

                contact_info:
                    contactInfo,

                status,

                image_url:
                    imageUrl,

                image_urls: imageUrls,

                application_start_date:
                    applicationStartDate || null,

                application_end_date:
                    applicationEndDate || null,
            }
        );

    return res.data;
}

/* =========================================================
   UPDATE JOB
========================================================= */

export async function updatejob(
    id: number,
    title: string,
    description: string,
    criteria: Criterion[] = [],
    department: string = "",
    location: string = "",
    salary: string = "",
    jobType: string = "",
    benefits: string = "",
    contactInfo: string = "",
    status: JobStatus = JOB_STATUS_OPEN,
    imageUrl: string = "",
    applicationStartDate: string = "",
    applicationEndDate: string = "",
    imageUrls: string[] = []
) {
    const res =
        await apiClient.put(
            `/job-positions/${id}`,
            {
                title,

                description,

                criteria,

                department,

                location,

                salary,

                type: jobType,

                benefits,

                contact_info:
                    contactInfo,

                status,

                image_url:
                    imageUrl,

                image_urls: imageUrls,

                application_start_date:
                    applicationStartDate || null,

                application_end_date:
                    applicationEndDate || null,
            }
        );

    return res.data;
}

export async function updateJobStatus(
    id: number,
    status: JobStatus
) {
    const res = await apiClient.patch(
        `/job-positions/${id}/status`,
        { status }
    );

    return res.data;
}

export async function updateApplicationStatus(
    appId: string | number,
    status: string
) {
    const res = await apiClient.patch(
        `/applications/${appId}/status`,
        { status }
    );

    return res.data;
}

/* =========================================================
   DELETE JOB
========================================================= */

export async function deletejob(
    id: number
) {
    const res =
        await apiClient.delete(
            `/job-positions/${id}`
        );

    return res.data;
}

/* =========================================================
   APPLY JOB
========================================================= */

export async function applyjob(
    jobId: number,
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    resumeText: string,
    resumeUrl: string,
    transcriptUrl: string = "",
    transcriptText: string = ""
) {
    const res =
        await apiClient.post(
            `/job-positions/${jobId}/apply`,
            {
                first_name:
                    firstName,

                last_name:
                    lastName,

                email,

                phone,

                resume_text:
                    resumeText,

                resume_url:
                    resumeUrl,

                transcript_url:
                    transcriptUrl,

                transcript_text:
                    transcriptText,
            }
        );

    return res.data;
}

/* =========================================================
   GET APPLICATIONS
========================================================= */

export async function getapplications(
    jobId: number
) {
    const res =
        await apiClient.get(
            `/job-positions/${jobId}/applications`
        );

    return res.data;
}

/* =========================================================
   UPDATE AI SCREENING
========================================================= */

export async function updateApplicationScreening(
    appId: number,
    score: number,
    strengths: string,
    modelUsed: string = "typhoon2.5-qwen3-4b",
    resumeText: string = "",
    analysisData: string = "",
    resumeExtractedJSON: string = ""
) {
    const res = await apiClient.put(
        `/applications/${appId}/screening`,
        {
            score,
            strengths,
            analysis_data: analysisData,
            model_used: modelUsed,
            resume_text: resumeText,
            resume_extracted_json: resumeExtractedJSON,
        }
    );

    return res.data;
}

/* =========================================================
   DELETE APPLICATION
========================================================= */

export async function deleteapplication(
    appId: number
) {
    const res =
        await apiClient.delete(
            `/applications/${appId}`
        );

    return res.data;
}

/* =========================================================
   CHECK APPLICATION STATUS
========================================================= */

export async function checkApplicationStatus(
    appCode: string
) {
    const res =
        await apiClient.get(
            `/applications/status/${appCode}`
        );

    return res.data;
}

export async function getJobPositionDocuments(
    jobId: number
) {
    const res = await apiClient.get(`/job-positions/${jobId}/documents`);
    return res.data;
}

export async function uploadApplicationDocument(
    jobPositionId: number,
    files: File[],
    documentType: string,
    title: string,
    description: string = ""
) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("job_position_id", String(jobPositionId));
    formData.append("document_type", documentType);
    formData.append("title", title);
    formData.append("description", description);

    const res = await apiClient.post(
        "/job-positions/documents/upload",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return res.data;
}

export async function deleteApplicationDocument(docId: number) {
    const res = await apiClient.delete(`/job-positions/documents/${docId}`);
    return res.data;
}

/* =========================================================
   AI EXTRACT JOB INFO FROM IMAGE
========================================================= */

export async function extractJobInfoFromImage(
    files: File | File[]
): Promise<ExtractJobResponse> {
    const formData =
        new FormData();

    const selectedFiles = Array.isArray(files) ? files : [files];
    selectedFiles.forEach((file) => formData.append("images", file));

    const res =
        await apiClient.post<ExtractJobResponse>(
            "/v1/jobs/extract-image",
            formData,
            {
                headers: {
                    "Content-Type":
                        "multipart/form-data",
                },

                timeout: 180000,
            }
        );

    return res.data;
}
