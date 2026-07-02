import apiClient from "./apiClient";

export async function getallknowledge() {
    const res = await apiClient.get("/knowledge"); //เรียกข้อมูลจาก Backend
    return res.data; //ส่งข้อมูลไปให้ User
}

export async function getbyidknowledge(id: number){
    const res = await apiClient.get("/knowledge/"+id); //เรียกข้อมูลจาก Backend
    return res.data; //ส่งข้อมูลไปให้ User
}

export async function createknowledge(filename: string,content: string){
    const res = await apiClient.post("/knowledge", {filename, content});
    return res.data;
}

export async function updateknowledge(id: number,filename: string,content: string){
    const res = await apiClient.put(`/knowledge/${id}`, {filename, content});
    return res.data;
}

export async function deleteknowledge(id: number){
    const res = await apiClient.delete(`/knowledge/${id}`);
    return res.data;
}