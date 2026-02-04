
export type StaffName = '전민수 과장' | '김지민 과장';

export enum TaskStatus {
  IN_PROGRESS = '진행중',
  COMPLETED = '완료'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdBy: StaffName;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
  completedBy?: StaffName;
}

export interface AttendanceRecord {
  id: string;
  staffName: StaffName;
  type: 'IN' | 'OUT';
  timestamp: number;
}

export interface ShiftStatus {
  staffName: StaffName;
  isOnDuty: boolean;
  lastCheckIn?: number;
}
