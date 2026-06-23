'use client';

import { useEffect, useState, useRef } from 'react';
import { getAllTags, getAllTaskTypes, addTask, fetchParentTaskOptions } from '@/app/tasks/actions';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTaskContext } from '@/app/lib/TaskContext';
import { getAutomationRules, AutomationRule } from '@/app/settings/automationActions';

interface TaskType {
  name: string;
  label: string;
  sortOrder?: number;
}

interface Tag {
  name: string;
  label: string;
}

export default function TaskForm() {
  const { triggerRefresh, showNotification, prefillParentId, setPrefillParentId } = useTaskContext();
  const formRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    tags: [] as string[],
    date: new Date(),
    link: ''
  });

  const [parentId, setParentId] = useState<string>('');
  const [parentOptions, setParentOptions] = useState<{ id: string; name: string | null }[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [tags, types, rules, parents] = await Promise.all([
          getAllTags(),
          getAllTaskTypes(),
          getAutomationRules(),
          fetchParentTaskOptions()
        ]);
        setAllTags(tags);
        // Sort task types by sortOrder if available
        setTaskTypes([...types].sort((a, b) => {
          // Safely access sortOrder property or default to 0
          const orderA = 'sortOrder' in a ? (a as unknown as {sortOrder: number}).sortOrder : 0;
          const orderB = 'sortOrder' in b ? (b as unknown as {sortOrder: number}).sortOrder : 0;
          
          // If orders are the same, sort by label alphabetically
          if (orderA === orderB) {
            return a.label.localeCompare(b.label);
          }
          
          return orderA - orderB;
        }));
        setParentOptions(parents);
        setAutomationRules(rules);
      } catch (err) {
        console.error('Error loading form data:', err);
        setError('加载分类和标签失败，请重试');
        showNotification('error', '加载分类和标签失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [showNotification]);

  // Handle prefillParentId from context (when "add subtask" is clicked in TaskList)
  useEffect(() => {
    if (prefillParentId) {
      setParentId(prefillParentId);
      // Scroll form into view
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Clear the prefill after applying
      setPrefillParentId(null);
    }
  }, [prefillParentId, setPrefillParentId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'link') {
      // Apply automation rules for link
      applyAutomationRules(name, value);
    } else if (name === 'description') {
      // Apply automation rules for description
      applyAutomationRules(name, value);
    } else {
      // Normal input handling for non-link and non-description fields
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const applyAutomationRules = (field: string, value: string) => {
    // Basic update to start
    const updatedFormData = { ...formData, [field]: value };
    
    // Process automation rules
    for (const rule of automationRules) {
      // Only process rules for the current field type
      if (rule.trigger !== field) continue;
      
      // Skip if pattern is empty or value doesn't include the pattern
      if (!rule.pattern || !value.includes(rule.pattern)) continue;
      
      // Rule matches - apply task type
      updatedFormData.type = rule.type;
      
      // Apply tags from the rule (avoid duplicates)
      const uniqueTags = new Set([...updatedFormData.tags]);
      rule.tags.forEach(tag => uniqueTags.add(tag));
      updatedFormData.tags = Array.from(uniqueTags);
      
      // Only apply the first matching rule (for now)
      break;
    }
    
    setFormData(updatedFormData);
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await addTask({
        ...formData,
        parentId: parentId || undefined,
        date: formData.date.toISOString().split('T')[0]
      });
      
      // Reset form after successful submission
      setFormData({
        name: '',
        description: '',
        type: '',
        tags: [],
        date: new Date(),
        link: ''
      });
      setParentId('');
      // Trigger refresh of the task list
      triggerRefresh();
      // Show success notification instead of alert
      showNotification('success', '任务添加成功！');
    } catch (err) {
      console.error('Error adding task:', err);
      setError('添加任务失败，请重试');
      // Show error notification
      showNotification('error', '添加任务失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={formRef} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">添加新任务</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-1">
            任务名称
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="输入任务名称"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-800 mb-1">
            描述
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="输入详细描述（可选）"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="parentId" className="block text-sm font-medium text-gray-800 mb-1">
            父任务（可选）
          </label>
          <select
            id="parentId"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={isLoading || parentOptions.length === 0}
          >
            <option value="">无（顶级任务）</option>
            {parentOptions.map(p => (
              <option key={p.id} value={p.id}>
                {p.name || '(未命名任务)'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-800 mb-1">
            分类
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={isLoading || taskTypes.length === 0}
          >
            <option value="">选择分类</option>
            {taskTypes.map(type => (
              <option key={type.name} value={type.name}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            标签
          </label>
          {allTags.length === 0 ? (
            <p className="text-sm text-gray-400">暂无标签，请先在设置中添加</p>
          ) : (
            <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto grid grid-cols-2 gap-1">
              {allTags.map(tag => (
                <label key={tag.name} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tags.includes(tag.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, tag.name] }));
                      } else {
                        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag.name) }));
                      }
                    }}
                    disabled={isLoading}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{tag.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-800 mb-1">
            日期
          </label>
          <DatePicker
            id="date"
            selected={formData.date}
            onChange={handleDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            dateFormat="MMM d, yyyy"
            disabled={isLoading}
            required
          />
        </div>
        
        <div>
          <label htmlFor="link" className="block text-sm font-medium text-gray-800 mb-1">
            链接（可选）
          </label>
          <input
            type="url"
            id="link"
            name="link"
            value={formData.link}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? '提交中...' : '添加任务'}
        </button>
      </form>
    </div>
  );
}
