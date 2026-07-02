import apiClient from "./apiClient";

export async function getalljobs() {
  const res = await apiClient.get("/job-positions");
  return res.data;
}

export async function getbyidjob(id: number) {
  const res = await apiClient.get("/job-positions/" + id);
  return res.data;
}

export async function createjob(title: string, description: string, criteria: string) {
  const res = await apiClient.post("/job-positions", { title, description, criteria });
  return res.data;
}

export async function updatejob(id: number, title: string, description: string, criteria: string) {
  const res = await apiClient.put(`/job-positions/${id}`, { title, description, criteria });
  return res.data;
}

export async function deletejob(id: number) {
  const res = await apiClient.delete(`/job-positions/${id}`);
  return res.data;
}
