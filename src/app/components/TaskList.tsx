'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import TaskFilters from './TaskFilters';
import { fetchTasks, getAllTaskTypes, getAllTags, updateTask, deleteTask, fetchParentTaskOptions, getReports, createReport, updateReport, deleteReport, toggleTaskComplete } from '@/app/tasks/actions';
import { useTaskContext } from '@/app/lib/TaskContext';

interface TaskReport {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Task {
  id: string;
  name: string | null;
  description: string | null;
  report: string | null;
  reports?: TaskReport[];
  completed?: boolean;
  parentId: string | null;
  children?: Task[];
  date: Date;
  link: string | null;
  type: {
    name: string;
    label: string;
  } | null;
  tags: {
    tag: {
      name: string;
      label: string;
    };
  }[];
}

interface EditModalProps {
  task: Task;
  taskTypes: { name: string; label: string; }[];
  tags: { name: string; label: string; }[];
  parentOptions: { id: string; name: string | null }[];
  onClose: () => void;
  onSave: (updatedTask: {
    id: string;
    name?: string;
    description?: string;
    type?: string;
    tags?: string[];
    date: string;
    link?: string;
    parentId?: string;
  }) => Promise<void>;
}

function EditModal({ task, taskTypes, tags, parentOptions, onClose, onSave }: EditModalProps) {
  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const [name, setName] = useState(task.name || '');
  const [description, setDescription] = useState(task.description || '');
  const [type, setType] = useState(task.type?.name || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    task.tags.map(({ tag }) => tag.name)
  );
  const [date, setDate] = useState(format(new Date(task.date), 'yyyy-MM-dd'));
  const [link, setLink] = useState(task.link || '');
  const [parentId, setParentId] = useState(task.parentId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasChildren = task.children && task.children.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        id: task.id,
        name,
        description,
        type,
        tags: selectedTags,
        date,
        link: link || undefined,
        parentId: parentId || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onDoubleClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">编辑任务</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">任务名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              placeholder="输入任务名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              placeholder="输入详细描述（可选）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">
              父任务（可选）
              {hasChildren && <span className="ml-1 text-xs text-amber-600">（此任务有子任务，不可设为其他任务的子任务）</span>}
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              disabled={isSubmitting || hasChildren}
            >
              <option value="">无（顶级任务）</option>
              {parentOptions
                .filter(p => p.id !== task.id)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name || '(未命名任务)'}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">分类</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
            >
              <option value="">选择分类</option>
              {taskTypes.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">标签</label>
            <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto grid grid-cols-2 gap-1 mt-1">
              {tags.map(tag => (
                <label key={tag.name} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTags([...selectedTags, tag.name]);
                      } else {
                        setSelectedTags(selectedTags.filter(t => t !== tag.name));
                      }
                    }}
                    disabled={isSubmitting}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{tag.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">链接（可选）</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper: render a single task card (reused for parent and child)
function TaskCard({
  task,
  isChild,
  onEdit,
  onDelete,
  onAddSubtask,
  onReport,
  onComplete,
}: {
  task: Task;
  isChild?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask?: (parentId: string) => void;
  onReport?: (task: Task) => void;
  onComplete?: (task: Task) => void;
}) {
  return (
    <div className={`${isChild ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'} p-3 rounded-lg shadow-sm border hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {task.name && <p className={`${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'} ${isChild ? 'text-sm font-medium' : 'font-medium'}`}>{task.name}</p>}
          {task.description && <p className={`${task.completed ? 'text-gray-400' : 'text-gray-600'} mt-0.5 ${isChild ? 'text-xs' : 'text-sm'}`}>{task.description}</p>}
          {!task.name && !task.description && <p className="text-gray-400 text-sm italic">无详情</p>}
          {task.link && (
            <a href={task.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs block mt-1 truncate max-w-md">
              {task.link}
            </a>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {task.type.label}
              </span>
            )}
            {task.tags.map(({ tag }) => (
              <span key={tag.name} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {tag.label}
              </span>
            ))}
            {(task.reports && task.reports.length > 0) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {task.reports.length} 份报告
              </span>
            )}
          </div>
        </div>
        <div className="ml-4 flex-shrink-0 flex items-center space-x-1">
          <time className={`${isChild ? 'text-xs' : 'text-sm'} text-gray-500`}>
            {(() => {
              // For parent tasks with children, show date range
              if (!isChild && task.children && task.children.length > 0) {
                const childDates = task.children.map(c => new Date(c.date).getTime());
                const minDate = new Date(Math.min(...childDates));
                const maxDate = new Date(Math.max(...childDates));
                if (minDate.getTime() === maxDate.getTime()) {
                  return format(minDate, 'MMM d, yyyy');
                }
                return `${format(minDate, 'MMM d')} - ${format(maxDate, 'MMM d, yyyy')}`;
              }
              return format(new Date(task.date), 'MMM d, yyyy');
            })()}
          </time>
          {onComplete && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(task); }}
              className={`p-1 ${task.completed ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-green-500'}`}
              title={task.completed ? '取消完成' : '标记完成'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {onAddSubtask && !isChild && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddSubtask(task.id); }}
              className="p-1 text-gray-400 hover:text-green-600"
              title="添加子任务"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {onReport && (
            <button
              onClick={(e) => { e.stopPropagation(); onReport(task); }}
              className="p-1 text-gray-400 hover:text-purple-600"
              title="撰写报告"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button onClick={() => onEdit(task)} className="p-1 text-gray-500 hover:text-blue-600" title="编辑任务">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-gray-500 hover:text-red-600" title="删除任务">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportEditor({
  task,
  onClose,
  onRefresh,
}: {
  task: Task;
  onClose: () => void;
  onRefresh: () => void;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const [reports, setReports] = useState<TaskReport[]>(task.reports || []);
  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.id || null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load reports from server
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getReports(task.id);
        setReports(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [task.id]);

  // Sync content when selected report changes
  useEffect(() => {
    const r = reports.find(r => r.id === selectedId);
    setContent(r?.content || '');
  }, [selectedId, reports]);

  const selectedReport = reports.find(r => r.id === selectedId);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      if (selectedId) {
        await updateReport(selectedId, content);
        setReports(prev => prev.map(r => r.id === selectedId ? { ...r, content } : r));
      } else {
        const created = await createReport(task.id, content);
        setReports(prev => [created, ...prev]);
        setSelectedId(created.id);
      }
      onRefresh();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleNew = () => {
    setSelectedId(null);
    setContent('');
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('确定要删除这份报告吗？此操作不可撤销。')) return;
    try {
      await deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      if (selectedId === reportId) {
        const remaining = reports.filter(r => r.id !== reportId);
        setSelectedId(remaining[0]?.id || null);
      }
      onRefresh();
    } catch { /* ignore */ }
  };

  const formatDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onDoubleClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-lg shadow-xl flex flex-col md:flex-row max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Left sidebar: report list */}
        <div className="w-full md:w-56 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 text-sm truncate">{task.name || '未命名任务'}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-gray-400 text-xs p-3">加载中...</p>
            ) : reports.length === 0 ? (
              <p className="text-gray-400 text-xs p-3">暂无报告</p>
            ) : (
              reports.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 hover:bg-gray-100 transition-colors ${
                    selectedId === r.id ? 'bg-purple-50 border-l-2 border-l-purple-500 font-medium text-purple-900' : 'text-gray-700'
                  }`}
                >
                  <div className="truncate">{r.content.substring(0, 40) || '(空报告)'}</div>
                  <div className="text-gray-400 mt-0.5">{formatDate(r.createdAt)}</div>
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={handleNew}
              className="w-full py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-md transition-colors flex items-center justify-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              新建报告
            </button>
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <div className="text-sm text-gray-500">
              {selectedId ? (selectedReport ? `编辑报告 · ${formatDate(selectedReport.createdAt)}` : '编辑报告') : '新建报告'}
            </div>
            <div className="flex items-center gap-2">
              {selectedId && (
                <button onClick={() => handleDelete(selectedId)}
                  className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">
                  删除
                </button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="flex-1 block w-full border-0 resize-none focus:ring-0 text-gray-900 text-sm leading-relaxed p-4"
            placeholder="在此撰写任务报告..."
            autoFocus
          />
          <div className="flex justify-between items-center p-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-400">{content.length} 字</span>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-md">
                取消
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskList() {
  const { refreshTrigger, showNotification, setPrefillParentId, setShowAddTaskForm } = useTaskContext();

  // Global ESC handler to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingTask(null);
        setDeletingTaskId(null);
        setReportingTask(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskTypes, setTaskTypes] = useState<{ name: string; label: string; }[]>([]);
  const [tags, setTags] = useState<{ name: string; label: string; }[]>([]);
  const [parentOptions, setParentOptions] = useState<{ id: string; name: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    showCompleted: null as boolean | null,
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [reportingTask, setReportingTask] = useState<Task | null>(null);
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(new Set());
  const [isSlackPingGroupExpanded, setIsSlackPingGroupExpanded] = useState(false);

  // Child-level filters
  const [childFilters, setChildFilters] = useState({
    type: '',
    tag: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });

  // Load reference data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [types, tagList, parents] = await Promise.all([
          getAllTaskTypes(),
          getAllTags(),
          fetchParentTaskOptions()
        ]);
        setTaskTypes(types);
        setTags(tagList);
        setParentOptions(parents);
      } catch (err) {
        console.error('Error loading filter data:', err);
        setError('加载分类和标签失败');
        showNotification('error', '加载分类和标签失败');
      }
    };

    loadData();
  }, [showNotification]);

  // Compute parent tasks and children map from flat task list
  const { parentTasks, childrenMap } = useMemo(() => {
    const parents: Task[] = [];
    const children: Record<string, Task[]> = {};

    for (const task of allTasks) {
      if (!task.parentId) {
        parents.push(task);
      } else {
        if (!children[task.parentId]) {
          children[task.parentId] = [];
        }
        children[task.parentId].push(task);
      }
    }

    return { parentTasks: parents, childrenMap: children };
  }, [allTasks]);

  // Apply child-level filters
  const getFilteredChildren = useCallback((parentId: string): Task[] => {
    const childList = childrenMap[parentId] || [];
    return childList.filter(child => {
      if (childFilters.type && child.type?.name !== childFilters.type) return false;
      if (childFilters.tag && !child.tags.some(({ tag }) => tag.name === childFilters.tag)) return false;
      if (childFilters.startDate && new Date(child.date) < childFilters.startDate) return false;
      if (childFilters.endDate) {
        const endOfDay = new Date(childFilters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (new Date(child.date) > endOfDay) return false;
      }
      return true;
    });
  }, [childrenMap, childFilters]);

  const fetchTasksWithCurrentFilter = useCallback(async () => {
    return await fetchTasks({
      type: filters.type || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    });
  }, [filters]);

  // Fetch tasks whenever filters change or refreshTrigger changes
  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const filteredTasks = await fetchTasksWithCurrentFilter();
        setAllTasks(filteredTasks);
      } catch (err) {
        console.error('Error fetching filtered tasks:', err);
        setError('加载任务失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [filters, refreshTrigger, fetchTasksWithCurrentFilter]);

  const handleFilterChange = (newFilters: {
    type: string;
    startDate: Date | null;
    endDate: Date | null;
    showCompleted: boolean | null;
  }) => {
    setFilters(newFilters);
  };

  const handleEditTask = async (updatedTask: {
    id: string;
    name?: string;
    description?: string;
    type?: string;
    tags?: string[];
    date: string;
    link?: string;
    parentId?: string;
  }) => {
    try {
      await updateTask(updatedTask);
      const filteredTasks = await fetchTasksWithCurrentFilter();
      setAllTasks(filteredTasks);
      // Refresh parent options for dropdowns
      const parents = await fetchParentTaskOptions();
      setParentOptions(parents);
      showNotification('success', '任务更新成功！');
    } catch (err) {
      console.error('Error updating task:', err);
      setError('更新任务失败');
      showNotification('error', '更新任务失败');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      const filteredTasks = await fetchTasksWithCurrentFilter();
      setAllTasks(filteredTasks);
      const parents = await fetchParentTaskOptions();
      setParentOptions(parents);
      showNotification('success', '任务删除成功');
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('删除任务失败');
      showNotification('error', '删除任务失败');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const refreshTasks = async () => {
    const filteredTasks = await fetchTasksWithCurrentFilter();
    setAllTasks(filteredTasks);
  };

  const handleComplete = async (task: Task) => {
    try {
      const result = await toggleTaskComplete(task.id);
      if (result.success) {
        showNotification('success', result.message);
        await refreshTasks();
      } else {
        showNotification('error', result.message);
      }
    } catch {
      showNotification('error', '操作失败');
    }
  };

  const toggleExpand = (parentId: string) => {
    setExpandedParentIds(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const handleAddSubtask = (parentId: string) => {
    setPrefillParentId(parentId);
    setShowAddTaskForm(true);
  };

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const initialFiltersValue = {
    type: filters.type,
    startDate: formatDateForInput(filters.startDate),
    endDate: formatDateForInput(filters.endDate),
    showCompleted: filters.showCompleted,
  };

  const handleClearFilters = () => {
    setFilters({ type: '', startDate: null, endDate: null, showCompleted: null });
    setChildFilters({ type: '', tag: '', startDate: null, endDate: null });
  };

  // Find the deleting task for the warning message
  const deletingTask = deletingTaskId ? allTasks.find(t => t.id === deletingTaskId) : null;
  const deletingTaskChildCount = deletingTask?.children ? deletingTask.children.length : 0;

  // Slack-ping group logic
  const slackPingParents = parentTasks.filter(t =>
    t.tags.some(({ tag }) => tag.name === 'slack-ping')
  );
  const allSlackPingTasks = [
    ...slackPingParents,
    ...Object.values(childrenMap).flat().filter(t =>
      t.tags.some(({ tag }) => tag.name === 'slack-ping')
    )
  ];

  // ---- Tag section definitions ----
  const TAG_SECTION_ORDER = [
    'urgent-important',
    'not-urgent-important',
    'not-urgent-not-important',
    'urgent-not-important',
  ];
  const TAG_COLORS: Record<string, { bg: string; border: string; header: string }> = {
    'urgent-important':       { bg: 'bg-red-50', border: 'border-red-200', header: 'text-red-800' },
    'not-urgent-important':   { bg: 'bg-yellow-50', border: 'border-yellow-200', header: 'text-yellow-800' },
    'not-urgent-not-important': { bg: 'bg-green-50', border: 'border-green-200', header: 'text-green-800' },
    'urgent-not-important':   { bg: 'bg-blue-50', border: 'border-blue-200', header: 'text-blue-800' },
  };

  // Filter tasks by showCompleted
  const filterByCompleted = (task: Task): boolean => {
    if (filters.showCompleted === null) return true;
    return filters.showCompleted ? !!task.completed : !task.completed;
  };

  // Build tag → tasks map from allTasks (both parents and children)
  const tagTaskMap = useMemo(() => {
    const map = new Map<string, { parents: Task[]; children: Task[] }>();
    for (const t of allTasks) {
      if (!filterByCompleted(t)) continue;
      for (const { tag: tg } of t.tags) {
        if (!map.has(tg.name)) map.set(tg.name, { parents: [], children: [] });
        const entry = map.get(tg.name)!;
        if (t.parentId) entry.children.push(t);
        else entry.parents.push(t);
      }
    }
    return map;
  }, [allTasks, filters.showCompleted]);

  // Ordered tag names for display
  const orderedTagNames = useMemo(() => {
    const existing = new Set(tagTaskMap.keys());
    const ordered = TAG_SECTION_ORDER.filter(t => existing.has(t));
    // Append any user-created tags not in default order
    for (const name of existing) {
      if (!TAG_SECTION_ORDER.includes(name)) ordered.push(name);
    }
    return ordered;
  }, [tagTaskMap]);

  // Get tag label by name
  const getTagLabel = (name: string): string => {
    const tag = tags.find(t => t.name === name);
    return tag?.label || name;
  };

  return (
    <div>
      <TaskFilters
        taskTypes={taskTypes}
        onFilterChange={handleFilterChange}
        initialFilters={initialFiltersValue}
        onClearFilters={handleClearFilters}
      />

      <div className="flex gap-2 mb-4">
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}

      {/* Child-level filter bar (visible when any parent is expanded) */}
      {expandedParentIds.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-900 mb-2">子任务筛选</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select
              value={childFilters.type}
              onChange={(e) => setChildFilters(prev => ({ ...prev, type: e.target.value }))}
              className="p-2 border border-gray-300 rounded-md text-sm text-gray-900">
              <option value="">全部分类</option>
              {taskTypes.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
            </select>
            <select
              value={childFilters.tag}
              onChange={(e) => setChildFilters(prev => ({ ...prev, tag: e.target.value }))}
              className="p-2 border border-gray-300 rounded-md text-sm text-gray-900">
              <option value="">全部标签</option>
              {tags.map(t => <option key={t.name} value={t.name}>{t.label}</option>)}
            </select>
            <input type="date" value={formatDateForInput(childFilters.startDate)}
              onChange={(e) => setChildFilters(prev => ({ ...prev, startDate: e.target.value ? new Date(e.target.value) : null }))}
              className="p-2 border border-gray-300 rounded-md text-sm text-gray-900" placeholder="开始日期" />
            <input type="date" value={formatDateForInput(childFilters.endDate)}
              onChange={(e) => setChildFilters(prev => ({ ...prev, endDate: e.target.value ? new Date(e.target.value) : null }))}
              className="p-2 border border-gray-300 rounded-md text-sm text-gray-900" placeholder="结束日期" />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8"><p className="text-gray-500">加载中...</p></div>
      ) : orderedTagNames.length === 0 ? (
        <div className="text-center py-8"><p className="text-gray-500">没有匹配的任务</p></div>
      ) : (
        <div className={`grid gap-4 ${orderedTagNames.length <= 4 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {orderedTagNames.map(tagName => {
            const section = tagTaskMap.get(tagName);
            if (!section) return null;
            const color = TAG_COLORS[tagName] || { bg: 'bg-gray-50', border: 'border-gray-200', header: 'text-gray-700' };
            const allInSection = [...section.parents, ...section.children]
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return (
              <div key={tagName} className={`rounded-lg border shadow-sm ${color.bg} ${color.border}`}>
                <div className={`px-4 py-2.5 border-b ${color.border} flex justify-between items-center`}>
                  <h3 className={`font-semibold text-sm ${color.header}`}>
                    {getTagLabel(tagName)}
                    <span className="ml-2 font-normal text-xs opacity-70">({allInSection.length})</span>
                  </h3>
                </div>
                <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                  {/* Group children under their parents within this tag section */}
                  {section.parents.map(parent => {
                    const isExpanded = expandedParentIds.has(parent.id);
                    const childTasks = section.children.filter(c => c.parentId === parent.id);
                    const hasChildren = (parent.children || []).length > 0;
                    return (
                      <div key={parent.id}>
                        <div className="cursor-pointer" onClick={() => toggleExpand(parent.id)}>
                          {hasChildren && (
                            <div className="flex items-center gap-1 mb-0.5 ml-1">
                              <svg xmlns="http://www.w3.org/2000/svg"
                                className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-gray-400">{childTasks.length} 子任务</span>
                            </div>
                          )}
                          <TaskCard task={parent}
                            onEdit={setEditingTask}
                            onDelete={(id) => setDeletingTaskId(id)}
                            onAddSubtask={handleAddSubtask}
                            onReport={setReportingTask}
                            onComplete={handleComplete} />
                        </div>
                        {isExpanded && hasChildren && (
                          <div className="ml-4 pl-3 border-l-2 border-gray-200 mt-0.5 space-y-1">
                            {childTasks.map(child => (
                              <TaskCard key={child.id} task={child} isChild
                                onEdit={setEditingTask}
                                onDelete={(id) => setDeletingTaskId(id)}
                                onReport={setReportingTask}
                                onComplete={handleComplete} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Orphan children (parent not in this tag section, or no parent) */}
                  {section.children
                    .filter(c => !section.parents.some(p => p.id === c.parentId))
                    .map(child => (
                      <TaskCard key={child.id} task={child} isChild
                        onEdit={setEditingTask}
                        onDelete={(id) => setDeletingTaskId(id)}
                        onReport={setReportingTask}
                        onComplete={handleComplete} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <EditModal
          task={editingTask}
          taskTypes={taskTypes}
          tags={tags}
          parentOptions={parentOptions}
          onClose={() => setEditingTask(null)}
          onSave={handleEditTask}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTaskId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onDoubleClick={(e) => { if (e.target === e.currentTarget) setDeletingTaskId(null); }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">删除任务</h2>
            {deletingTaskChildCount > 0 ? (
              <p className="text-gray-600 mb-6">
                此任务有 <span className="font-bold text-red-600">{deletingTaskChildCount}</span> 个子任务，删除后子任务也将被一并删除。确定要继续吗？
              </p>
            ) : (
              <p className="text-gray-600 mb-6">
                确定要删除此任务吗？此操作不可撤销。
              </p>
            )}
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeletingTaskId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                取消
              </button>
              <button onClick={() => handleDeleteTask(deletingTaskId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Editor Modal */}
      {reportingTask && (
        <ReportEditor
          task={reportingTask}
          onClose={() => setReportingTask(null)}
          onRefresh={refreshTasks}
        />
      )}
    </div>
  );
}
