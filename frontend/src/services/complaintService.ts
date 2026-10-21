import api from './api';
import type { Complaint  } from '../types';

export const complaintService = {
  createComplaint: async (data: FormData): Promise<Complaint> => {
    const res = await api.post('/complaints', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  getMyComplaints: async (): Promise<Complaint[]> => {
    const res = await api.get('/complaints/my');
    return res.data;
  },
  getComplaintById: async (id: number): Promise<Complaint> => {
    const res = await api.get(`/complaints/${id}`);
    return res.data;
  }
};
