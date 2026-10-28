import api from './api';
import type { Dustbin, SensorReading  } from '../types';

export const dustbinService = {
  getAllDustbins: async (): Promise<Dustbin[]> => {
    const res = await api.get('/dustbins');
    return res.data;
  },
  getNearbyDustbins: async (lat: number, lng: number, radius = 5): Promise<Dustbin[]> => {
    const res = await api.get('/dustbins/nearby', { params: { lat, lng, radius } });
    return res.data;
  },
  getDustbinById: async (id: number): Promise<Dustbin> => {
    const res = await api.get(`/dustbins/${id}`);
    return res.data;
  },
  getDustbinHistory: async (id: number, range: string): Promise<SensorReading[]> => {
    const res = await api.get(`/dustbins/${id}/history`, { params: { range } });
    return res.data;
  },
  createDustbin: async (data: Partial<Dustbin>): Promise<Dustbin> => {
    const res = await api.post('/dustbins', data);
    return res.data;
  },
  updateDustbin: async (id: number, data: Partial<Dustbin>): Promise<Dustbin> => {
    const res = await api.put(`/dustbins/${id}`, data);
    return res.data;
  },
  deleteDustbin: async (id: number): Promise<void> => {
    await api.delete(`/dustbins/${id}`);
  }
};
