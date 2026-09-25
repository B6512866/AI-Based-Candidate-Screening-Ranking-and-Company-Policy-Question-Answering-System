import apiClient, { getBackendBaseUrl } from "./apiClient";

export interface UserRole {
  ID: number;
  Name: string;
  Description?: string;
}

export interface UserProfile {
  ID: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string;
  phone?: string;
  address?: string;
  position?: string;
  department?: string;
  bio?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  role_id?: number;
  Role?: UserRole;
  hire_date?: string;
  CreatedAt?: string;
}

export const getProfile = async (): Promise<UserProfile> => {
  const res = await apiClient.get("/users/me");
  return res.data.data;
};

export const updateProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
  const res = await apiClient.put("/users/me", data);
  return res.data.data;
};

export const changePassword = async (data: { current_password: string; new_password: string }) => {
  const res = await apiClient.put("/users/change-password", data);
  return res.data;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const res = await apiClient.get("/users");
  return res.data.data;
};

export const updateUserByID = async (id: number, data: Partial<UserProfile>): Promise<UserProfile> => {
  const res = await apiClient.put(`/users/${id}`, data);
  return res.data.data;
};

export const uploadAvatar = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiClient.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const url: string = res.data.url;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${getBackendBaseUrl()}${url}`;
};

export const getFullImageUrl = (path?: string) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  return `${getBackendBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
};
