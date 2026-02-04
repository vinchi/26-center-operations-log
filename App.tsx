
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StaffName, Task, AttendanceRecord, TaskStatus } from './types';
import { firebaseService } from './services/firebaseService';
import { STAFF_LIST, Icons } from './constants';
import AttendanceCard from './components/AttendanceCard';
import TaskItem from './components/TaskItem';
import { Toaster, toast } from 'sonner';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeStaff, setActiveStaff] = useState<StaffName>(STAFF_LIST[0] as StaffName);
  
  // 아카이브/월별 필터링 상태
  const [selectedDate, setSelectedDate] = useState(new Date());

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  // Edit task state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedTasks, fetchedAttendance] = await Promise.all([
        firebaseService.getTasks(selectedDate.getFullYear(), selectedDate.getMonth() + 1),
        firebaseService.getAttendance()
      ]);
      setTasks(fetchedTasks);
      setAttendance(fetchedAttendance);
      
      // 현재 실제 출근 중인 인원이 있다면 activeStaff를 해당 인원으로 자동 설정 (UX 개선)
      const onDutyStaff = STAFF_LIST.find(name => {
        const staffRecords = fetchedAttendance.filter(r => r.staffName === name);
        return staffRecords.length > 0 && staffRecords[0].type === 'IN';
      }) as StaffName | undefined;

      if (onDutyStaff) {
        setActiveStaff(onDutyStaff);
      }
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMonthChange = (offset: number) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  const handleAttendanceToggle = async (staff: StaffName, type: 'IN' | 'OUT') => {
    setIsActionLoading(true);
    try {
      // 상호 배타적 로직: 누군가 출근하면 다른 사람은 자동으로 퇴근 처리
      if (type === 'IN') {
        const otherStaff = STAFF_LIST.find(name => name !== staff) as StaffName;
        const otherRecords = attendance.filter(r => r.staffName === otherStaff);
        const isOtherOnDuty = otherRecords.length > 0 && otherRecords[0].type === 'IN';

        if (isOtherOnDuty) {
          await firebaseService.logAttendance(otherStaff, 'OUT');
        }
        // 출근하는 사람으로 현재 조작 주체 자동 변경
        setActiveStaff(staff);
      }
      
      await firebaseService.logAttendance(staff, type);
      await fetchData();
      toast.success(`${staff}님 ${type === 'IN' ? '출근' : '퇴근'} 처리가 완료되었습니다.`);
    } catch (error) {
      toast.error("출퇴근 기록 실패");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsActionLoading(true);
    try {
      // 업무 생성 시에도 가급적 현재 출근 중인 사람을 우선적으로 createdBy로 설정
      const currentOnDuty = STAFF_LIST.find(name => {
        const r = attendance.filter(rec => rec.staffName === name);
        return r.length > 0 && r[0].type === 'IN';
      }) as StaffName || activeStaff;

      await firebaseService.addTask({
        title: newTitle,
        description: newDesc,
        createdBy: currentOnDuty,
        status: TaskStatus.IN_PROGRESS
      });
      setNewTitle('');
      setNewDesc('');
      await fetchData();
      toast.success("새 업무가 성공적으로 등록 되었습니다.");
    } catch (error) {
      toast.error("업무 추가 실패");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setIsActionLoading(true);
    try {
      // 핵심 수정 사항: 현재 출근(IN) 상태인 과장님을 찾아서 완료자로 등록
      const currentOnDutyStaff = STAFF_LIST.find(name => {
        const staffRecords = attendance.filter(r => r.staffName === name);
        return staffRecords.length > 0 && staffRecords[0].type === 'IN';
      }) as StaffName | undefined;

      // 만약 아무도 출근 중이 아니라면(교대 중 등), 현재 드롭다운에서 선택된 사람을 사용
      const completer = currentOnDutyStaff || activeStaff;

      await firebaseService.updateTaskStatus(taskId, TaskStatus.COMPLETED, completer);
      await fetchData();
      toast.success("업무가 완료 되었습니다.");
    } catch (error) {
      toast.error("업무 완료 처리 실패");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("정말로 이 업무를 삭제하시겠습니까?")) return;

    setIsActionLoading(true);
    try {
      await firebaseService.deleteTask(taskId);
      await fetchData();
      toast.success("업무가 삭제되었습니다.");
    } catch (error) {
      toast.error("업무 삭제 실패");
    } finally {
      setIsActionLoading(false);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    setIsActionLoading(true);
    try {
      await firebaseService.updateTask(editingTask.id, {
        title: editTitle,
        description: editDesc
      });
      setEditingTask(null);
      await fetchData();
      toast.success("업무 정보가 수정되었습니다.");
    } catch (error) {
      toast.error("업무 수정 실패");
    } finally {
      setIsActionLoading(false);
    }
  };


  const filteredTasks = useMemo(() => ({
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED)
  }), [tasks]);

  return (
    <div className="min-h-screen pb-20">
      <Toaster richColors position="top-right" />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white font-black text-xl">26</div>
          <h1 className="text-xl font-bold text-slate-800">센터 업무일지</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">현재 조작:</span>
          <select 
            value={activeStaff}
            onChange={(e) => setActiveStaff(e.target.value as StaffName)}
            className="bg-slate-100 border-none rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all cursor-pointer"
          >
            {STAFF_LIST.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Section 1: Attendance */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Icons.Clock /> 출근부
            </h2>
            <span className="text-sm text-slate-500">{new Date().toLocaleDateString('ko-KR', { dateStyle: 'full' })}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STAFF_LIST.map(name => (
              <AttendanceCard 
                key={name}
                staffName={name as StaffName}
                records={attendance}
                onToggle={(type) => handleAttendanceToggle(name as StaffName, type)}
                isLoading={isActionLoading}
              />
            ))}
          </div>
        </section>

        {/* Section: Attendance History */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Icons.History /> 최근 출퇴근 기록
          </h3>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {attendance.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">기록된 출퇴근 내역이 없습니다.</p>
            ) : (
              attendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${record.type === 'IN' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                    <span className="font-bold text-slate-700 text-sm">{record.staffName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${record.type === 'IN' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      {record.type === 'IN' ? '출근' : '퇴근'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {new Date(record.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Section 2: Task Form */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Icons.Plus /> 새 업무 등록
          </h3>
          <form onSubmit={handleAddTask} className="space-y-6">
            <div className="flex flex-col gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">업무 제목</label>
                <input 
                  required
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="예: 센터 내부 보안 점검"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">상세 설명 (2~3줄 작성 가능)</label>
                <textarea 
                  rows={3}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="예: 모든 출입문 잠금 상태 확인 완료 및 특이사항 없음"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={isActionLoading}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95"
              >
                업무 등록
              </button>
            </div>
          </form>
        </section>


        {/* Section 4: Task Boards */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
              <h3 className="text-lg font-bold text-slate-800">업무 아카이브</h3>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl">
              <button 
                onClick={() => handleMonthChange(-1)}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600"
              >
                ◀
              </button>
              <div className="min-w-[120px] text-center font-bold text-slate-700">
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
              </div>
              <button 
                onClick={() => handleMonthChange(1)}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600"
              >
                ▶
              </button>
              <button 
                onClick={() => setSelectedDate(new Date())}
                className="ml-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all"
              >
                이번 달
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Progress Board */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                진행 중인 업무 ({filteredTasks.inProgress.length})
              </h3>
            <div className="space-y-3">
              {filteredTasks.inProgress.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                  진행 중인 업무가 없습니다.
                </div>
              ) : (
                filteredTasks.inProgress.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onComplete={handleCompleteTask} 
                    onEdit={openEditModal}
                    onDelete={handleDeleteTask}
                    isUpdating={isActionLoading} 
                  />
                ))
              )}
            </div>
          </div>

          {/* Completed Board */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-400 flex items-center gap-2 px-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              완료된 기록 ({filteredTasks.completed.length})
            </h3>
            <div className="space-y-3">
              {filteredTasks.completed.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center text-slate-300 italic">
                  아직 완료된 업무가 없습니다.
                </div>
              ) : (
                filteredTasks.completed.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onComplete={() => {}} 
                    onEdit={openEditModal}
                    onDelete={handleDeleteTask}
                    isUpdating={isActionLoading} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
        </section>
      </main>

      {/* Footer / Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-6 py-3 flex justify-center text-xs text-slate-400 font-medium">
        © 2024 26Center Operation System v1.2 • Real-time Attendance Aware Sync
      </footer>

      {isLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-600 font-bold">데이터를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Icons.Edit /> 업무 수정
              </h3>
              <button 
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isActionLoading}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateTask} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">업무 제목</label>
                  <input 
                    required
                    type="text" 
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">상세 설명</label>
                  <textarea 
                    rows={4}
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingTask(null)}
                  disabled={isActionLoading}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  disabled={isActionLoading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {isActionLoading ? '저장 중...' : '수정 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default App;
