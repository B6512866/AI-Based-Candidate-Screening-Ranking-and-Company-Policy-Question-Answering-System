import { Routes, Route } from "react-router-dom";
import HRDashboard from "../layout/hr/Dashboard";
import HRLayout from "../layout/hr/HRLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import PositionsPage from "../page/hr/PositionsPage";
import CandidatesPage from "../page/hr/CandidatesPage";
import InterviewsPage from "../page/hr/InterviewsPage";
import InterviewResultsPage from "../page/hr/InterviewResultsPage";
import CasesPage from "../page/hr/CasesPage";
import ScreeningPage from "../page/hr/ScreeningPage";
import KnowledgePage from "../page/hr/KnowledgePage";
import UploadDocumentsPage from "../page/hr/UploadDocumentsPage";

export function HRRoutes() {
    return (
        <ProtectedRoute allowedRoles={["HRManager"]}>
            <Routes>
                <Route element={<HRLayout />}>
                    <Route index element={<HRDashboard />} />
                    <Route path="dashboard" element={<HRDashboard />} />
                    <Route path="screening" element={<ScreeningPage />} />
                    <Route path="knowledge" element={<KnowledgePage />} />
                    <Route path="upload-documents" element={<UploadDocumentsPage />} />
                    <Route path="positions" element={<PositionsPage />} />
                    <Route path="candidates" element={<CandidatesPage />} />
                    <Route path="interviews" element={<InterviewsPage />} />
                    <Route path="interview-results" element={<InterviewResultsPage />} />
                    <Route path="cases" element={<CasesPage />} />
                    <Route path="*" element={<HRDashboard />} />
                </Route>
            </Routes>
        </ProtectedRoute>
    );
}
