
import React from 'react';
import { StaffName, AttendanceRecord } from '../types';
import { Icons } from '../constants';

interface AttendanceCardProps {
  staffName: StaffName;
  records: AttendanceRecord[];
  onToggle: (type: 'IN' | 'OUT') => void;
  isLoading: boolean;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ staffName, records, onToggle, isLoading }) => {
  const staffRecords = records.filter(r => r.staffName === staffName);
  const lastRecord = staffRecords[0];
  const isOnDuty = lastRecord?.type === 'IN';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${isOnDuty ? 'bg-green-100' : 'bg-slate-100'}`}>
            <Icons.User />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{staffName}</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Manager</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isOnDuty ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {isOnDuty ? '근무 중' : '비번'}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">최근 기록</span>
          <span className="text-slate-700 font-medium">
            {lastRecord ? new Date(lastRecord.timestamp).toLocaleTimeString() : '기록 없음'}
          </span>
        </div>
      </div>

      <button
        disabled={isLoading}
        onClick={() => onToggle(isOnDuty ? 'OUT' : 'IN')}
        className={`w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
          isOnDuty 
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
        }`}
      >
        {isLoading ? '처리 중...' : (isOnDuty ? '퇴근 처리' : '출근 처리')}
      </button>
    </div>
  );
};

export default AttendanceCard;
