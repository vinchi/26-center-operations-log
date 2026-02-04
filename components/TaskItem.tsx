
import React from 'react';
import { Task, TaskStatus, StaffName } from '../types';
import { Icons } from '../constants';

interface TaskItemProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isUpdating: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onComplete, onEdit, onDelete, isUpdating }) => {
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const duration = isCompleted && task.completedAt 
    ? Math.floor((task.completedAt - task.createdAt) / 60000) 
    : Math.floor((Date.now() - task.createdAt) / 60000);

  return (
    <div className={`p-5 rounded-2xl border transition-all ${isCompleted ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-lg font-bold ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {task.title}
            </h4>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isCompleted ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
              {task.status}
            </span>
          </div>
          <p className={`text-sm mb-3 ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
            {task.description}
          </p>
          
          <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Icons.User />
              <span>{task.createdBy}</span>
            </div>
            <div className="flex items-center gap-1">
              <Icons.Clock />
              <span>시작: {new Date(task.createdAt).toLocaleString()}</span>
            </div>
            {isCompleted && task.completedAt && (
              <div className="flex items-center gap-1 text-green-600">
                <Icons.Check />
                <span>완료: {new Date(task.completedAt).toLocaleString()} ({task.completedBy})</span>
              </div>
            )}
            {!isCompleted && (
              <div className="flex items-center gap-1 text-blue-500 font-medium">
                <Icons.History />
                <span>진행 중: {duration}분 경과</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!isCompleted && (
            <button
              onClick={() => onComplete(task.id)}
              disabled={isUpdating}
              className="flex-shrink-0 p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-100 disabled:opacity-50"
              title="완료"
            >
              <Icons.Check />
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(task)}
              disabled={isUpdating}
              className={`p-2 rounded-lg transition-colors ${isCompleted ? 'text-slate-300 hover:text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
              title="수정"
            >
              <Icons.Edit />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              disabled={isUpdating}
              className={`p-2 rounded-lg transition-colors ${isCompleted ? 'text-slate-300 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
              title="삭제"
            >
              <Icons.Trash />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
