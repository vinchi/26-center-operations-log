
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  doc, 
  query, 
  where,
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { Task, AttendanceRecord, StaffName, TaskStatus } from '../types';

/**
 * Firebase Configuration
 * 사용자의 Firebase 콘솔에서 프로젝트 설정 정보를 복사하여 아래에 입력하세요.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCcq_vv71cXMQmsv0DwWWWPzF0VGKWZWM8",
  authDomain: "business-journal-d0873.firebaseapp.com",
  projectId: "business-journal-d0873",
  storageBucket: "business-journal-d0873.firebasestorage.app",
  messagingSenderId: "290801841916",
  appId: "1:290801841916:web:40b457770e4840311cc979",
  measurementId: "G-7WB59N3K40"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = {
  TASKS: 'tasks',
  ATTENDANCE: 'attendance'
};

export const firebaseService = {
  // --- 업무(Task) 관련 작업 ---
  async getTasks(year?: number, month?: number): Promise<Task[]> {
    try {
      const tasksCol = collection(db, COLLECTIONS.TASKS);
      let q;

      if (year !== undefined && month !== undefined) {
        // 해당 월의 시작일과 다음 달의 시작일을 구함
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 1);

        q = query(
          tasksCol, 
          where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
          where("createdAt", "<", Timestamp.fromDate(endOfMonth)),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(tasksCol, orderBy("createdAt", "desc"), limit(100));
      }
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          ...data,
          id: docSnap.id,
          createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
          completedAt: (data.completedAt as Timestamp)?.toMillis() || undefined,
        } as Task;
      });
    } catch (error) {
      console.error("Firestore getTasks error:", error);
      return [];
    }
  },

  async addTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    try {
      const tasksCol = collection(db, COLLECTIONS.TASKS);
      await addDoc(tasksCol, {
        ...taskData,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Firestore addTask error:", error);
      throw error;
    }
  },

  async updateTaskStatus(taskId: string, status: TaskStatus, staffName: StaffName): Promise<void> {
    try {
      const taskRef = doc(db, COLLECTIONS.TASKS, taskId);
      await updateDoc(taskRef, {
        status,
        completedAt: status === TaskStatus.COMPLETED ? serverTimestamp() : null,
        completedBy: status === TaskStatus.COMPLETED ? staffName : null,
      });
    } catch (error) {
      console.error("Firestore updateTaskStatus error:", error);
      throw error;
    }
  },

  // --- 출퇴근(Attendance) 관련 작업 ---
  async getAttendance(): Promise<AttendanceRecord[]> {
    try {
      const attendanceCol = collection(db, COLLECTIONS.ATTENDANCE);
      const q = query(attendanceCol, orderBy("timestamp", "desc"), limit(100));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          timestamp: (data.timestamp as Timestamp)?.toMillis() || Date.now(),
        } as AttendanceRecord;
      });
    } catch (error) {
      console.error("Firestore getAttendance error:", error);
      return [];
    }
  },

  async logAttendance(staffName: StaffName, type: 'IN' | 'OUT'): Promise<void> {
    try {
      const attendanceCol = collection(db, COLLECTIONS.ATTENDANCE);
      await addDoc(attendanceCol, {
        staffName,
        type,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Firestore logAttendance error:", error);
      throw error;
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, COLLECTIONS.TASKS, taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error("Firestore deleteTask error:", error);
      throw error;
    }
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const taskRef = doc(db, COLLECTIONS.TASKS, taskId);
      await updateDoc(taskRef, updates);
    } catch (error) {
      console.error("Firestore updateTask error:", error);
      throw error;
    }
  }
};
