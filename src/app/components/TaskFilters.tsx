'use client';

import { useState, useEffect, useRef } from 'react';

interface TaskFiltersProps {
  taskTypes: { name: string; label: string; }[];
  onFilterChange: (filters: {
    type: string;
    startDate: Date | null;
    endDate: Date | null;
    showCompleted: boolean | null;
  }) => void;
  initialFilters?: {
    type: string;
    startDate: string;
    endDate: string;
    showCompleted: boolean | null;
  };
  onClearFilters?: () => void;
}

export default function TaskFilters({
  taskTypes,
  onFilterChange,
  initialFilters = { type: '', startDate: '', endDate: '', showCompleted: null },
  onClearFilters,
}: TaskFiltersProps) {
  const [type, setType] = useState(initialFilters.type);
  const [startDate, setStartDate] = useState<string>(initialFilters.startDate);
  const [endDate, setEndDate] = useState<string>(initialFilters.endDate);
  const [showCompleted, setShowCompleted] = useState<string>(
    initialFilters.showCompleted === true ? 'completed' : initialFilters.showCompleted === false ? 'active' : 'all'
  );

  // Track if this is the initial render
  const isInitial = useRef(true);

  // Sync from parent initialFilters
  useEffect(() => {
    setType(initialFilters.type);
    setStartDate(initialFilters.startDate);
    setEndDate(initialFilters.endDate);
    setShowCompleted(
      initialFilters.showCompleted === true ? 'completed' : initialFilters.showCompleted === false ? 'active' : 'all'
    );
  }, [initialFilters]);

  // Auto-notify parent whenever any filter changes (skip initial mount)
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    onFilterChange({
      type,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      showCompleted: showCompleted === 'all' ? null : showCompleted === 'completed',
    });
  }, [type, startDate, endDate, showCompleted]);

  const handleClearFilters = () => {
    setType('');
    setStartDate('');
    setEndDate('');
    setShowCompleted('all');
    // onFilterChange will fire via the useEffect above, and onClearFilters via the parent
    if (onClearFilters) onClearFilters();
  };

  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">筛选任务</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">分类</label>
          <select value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-gray-900">
            <option value="">全部分类</option>
            {taskTypes.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">开始日期</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">结束日期</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">状态：</span>
          {[
            { value: 'all', label: '全部' },
            { value: 'active', label: '未完成' },
            { value: 'completed', label: '已完成' },
          ].map(o => (
            <label key={o.value} className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="completed" value={o.value}
                checked={showCompleted === o.value}
                onChange={(e) => setShowCompleted(e.target.value)}
                className="text-blue-600" />
              <span className="text-sm text-gray-700">{o.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={handleClearFilters} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 text-sm">
            清除筛选
          </button>
        </div>
      </div>
    </div>
  );
}
