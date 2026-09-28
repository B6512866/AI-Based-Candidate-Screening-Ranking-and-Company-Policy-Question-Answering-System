import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import EmployeeLayout from "../layout/employee/EmployeeLayout";
import EmployeeChat from "../page/employee/Chat";
import EmployeeProfile from "../page/employee/ProfilePage";
import NotificationsPage from "../page/employee/NotificationsPage";

export function EmployeeRoutes() {
    return (
        <ProtectedRoute allowedRoles={["Employee"]}>
            <Routes>
                <Route element={<EmployeeLayout />}>
                    <Route index element={<EmployeeChat />} />
                    <Route path="chat" element={<EmployeeChat />} />
                    <Route path="profile" element={<EmployeeProfile />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="*" element={<EmployeeChat />} />
                </Route>
            </Routes>
        </ProtectedRoute>
    );
}
