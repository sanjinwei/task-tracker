'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import TaskFilters from './TaskFilters';
import { fetchTasks, getAllTaskTypes, getAllTags, updateTask, deleteTask, fetchParentTaskOptions } from '@/app/tasks/actions';
import { useTaskContext } from '@/app/lib/TaskContext';

interface Task {
  id: string;
  name: string | null;
  description: string | null;
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
}: {
  task: Task;
  isChild?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask?: (parentId: string) => void;
}) {
  return (
    <div className={`${isChild ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'} p-3 rounded-lg shadow-sm border hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {task.name && <p className={`text-gray-900 ${isChild ? 'text-sm font-medium' : 'font-medium'}`}>{task.name}</p>}
          {task.description && <p className={`text-gray-600 mt-0.5 ${isChild ? 'text-xs' : 'text-sm'}`}>{task.description}</p>}
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

export default function TaskList() {
  const { refreshTrigger, showNotification, setPrefillParentId } = useTaskContext();

  // Global ESC handler to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingTask(null);
        setDeletingTaskId(null);
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
    tag: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
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
      tag: filters.tag || undefined,
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
    tag: string;
    startDate: Date | null;
    endDate: Date | null;
  }) => {
    if (
      newFilters.type !== filters.type ||
      newFilters.tag !== filters.tag ||
      (newFilters.startDate?.getTime() !== filters.startDate?.getTime()) ||
      (newFilters.endDate?.getTime() !== filters.endDate?.getTime())
    ) {
      setFilters(newFilters);
    }
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
  };

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const initialFiltersValue = {
    type: filters.type,
    tag: filters.tag,
    startDate: formatDateForInput(filters.startDate),
    endDate: formatDateForInput(filters.endDate)
  };

  const handleClearFilters = () => {
    setFilters({ type: '', tag: '', startDate: null, endDate: null });
    setChildFilters({ type: '', tag: '', startDate: null, endDate: null });
  };

  // Find the deleting task for the warning message
  const deletingTask = deletingTaskId ? allTasks.find(t => t.id === deletingTaskId) : null;
  const deletingTaskChildCount = deletingTask?.children ? deletingTask.children.length : 0;

  // Slack-ping group logic: check both parents and children
  const slackPingParents = parentTasks.filter(t =>
    t.tags.some(({ tag }) => tag.name === 'slack-ping')
  );
  const allSlackPingTasks = [
    ...slackPingParents,
    ...Object.values(childrenMap).flat().filter(t =>
      t.tags.some(({ tag }) => tag.name === 'slack-ping')
    )
  ];

  return (
    <div>
      <TaskFilters
        taskTypes={taskTypes}
        tags={tags}
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
      ) : parentTasks.length === 0 ? (
        <div className="text-center py-8"><p className="text-gray-500">没有匹配的任务</p></div>
      ) : (
        <div className="space-y-3">
          {/* Slack Ping Tasks Group */}
          {allSlackPingTasks.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
              {isSlackPingGroupExpanded ? (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-blue-900 font-medium">Slack 消息 ({allSlackPingTasks.length})</h3>
                    <button onClick={() => setIsSlackPingGroupExpanded(false)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium">收起</button>
                  </div>
                  <div className="space-y-2">
                    {allSlackPingTasks
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(task => (
                        <TaskCard key={task.id} task={task} isChild={!!task.parentId}
                          onEdit={setEditingTask} onDelete={(id) => setDeletingTaskId(id)}
                          onAddSubtask={!task.parentId ? handleAddSubtask : undefined} />
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-blue-900 font-medium">
                    {allSlackPingTasks.length} Slack {allSlackPingTasks.length === 1 ? 'ping' : 'pings'} 已回复
                  </span>
                  <button onClick={() => setIsSlackPingGroupExpanded(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium">展开</button>
                </div>
              )}
            </div>
          )}

          {/* Parent Task Cards (hierarchical) */}
          {parentTasks
            .filter(t => !t.tags.some(({ tag }) => tag.name === 'slack-ping'))
            .map(parent => {
              const isExpanded = expandedParentIds.has(parent.id);
              const filteredChildren = getFilteredChildren(parent.id);

              return (
                <div key={parent.id}>
                  {/* Parent card */}
                  <div className="cursor-pointer" onClick={() => toggleExpand(parent.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-gray-500">
                        {filteredChildren.length > 0 ? `${filteredChildren.length} 个子任务` : '无子任务'}
                      </span>
                    </div>
                    <TaskCard task={parent}
                      onEdit={setEditingTask}
                      onDelete={(id) => setDeletingTaskId(id)}
                      onAddSubtask={handleAddSubtask} />
                  </div>

                  {/* Children section */}
                  {isExpanded && (
                    <div className="ml-6 pl-4 border-l-2 border-blue-200 mt-1 space-y-2">
                      {filteredChildren.length === 0 ? (
                        <p className="text-gray-400 text-sm py-2">没有匹配的子任务</p>
                      ) : (
                        filteredChildren
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map(child => (
                            <TaskCard key={child.id} task={child} isChild
                              onEdit={setEditingTask}
                              onDelete={(id) => setDeletingTaskId(id)} />
                          ))
                      )}
                    </div>
                  )}
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
    </div>
  );
}
