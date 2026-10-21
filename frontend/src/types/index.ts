export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  profileImage?: string;
  createdAt?: string;
}

export interface Dustbin {
  id: number;
  deviceId: string;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  capacityLiters: number;
  fillLevel: number;
  status: 'AVAILABLE' | 'FULL' | 'OFFLINE';
  wasteType: 'WET' | 'DRY' | 'MIXED' | 'UNKNOWN';
  temperature: number;
  humidity: number;
  airQuality: number;
  moisture: number;
  batteryLevel: number;
  deviceStatus: 'ONLINE' | 'OFFLINE';
  lastSeen: string;
  distance?: number;
}

export interface SensorReading {
  id: number;
  dustbinId: number;
  fillLevel: number;
  temperature: number;
  humidity: number;
  airQuality: number;
  moisture: number;
  batteryLevel: number;
  recordedAt: string;
}

export interface Complaint {
  id: number;
  complaintId?: string;
  userId: number;
  dustbinId: number;
  dustbin?: Dustbin;
  title: string;
  description: string;
  imageUrl?: string;
  status: 'PENDING' | 'RECEIVED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  rating?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
}

export interface PickupRequest {
  id: number;
  pickupId: string;
  userId?: number;
  user?: User;
  wasteType: string;
  quantity?: string;
  address: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  imageUrl?: string;
  status: 'REQUESTED' | 'ASSIGNED' | 'ON_THE_WAY' | 'COLLECTED' | 'COMPLETED' | 'CANCELLED';
  assignedTeamId?: number;
  assignedTeam?: User;
  createdAt: string;
  updatedAt: string;
}

export interface WasteDetection {
  id: number;
  userId: number;
  imageUrl: string;
  detectedCategory: string;
  confidence: number;
  recommendedDisposal: string;
  createdAt: string;
}
