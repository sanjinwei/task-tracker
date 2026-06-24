'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AIChatBox from '@/app/components/AIChatBox';
import ApiKeyCheck from '@/app/components/ApiKeyCheck';
import {
  getOpenAIApiKey, getDeepSeekApiKey,
} from '@/app/settings/actions';
import {
  getTaskById, getRelatedTasks, getAllParentTasksWithChildren, saveTaskReport,
} from '@/app/tasks/actions';

type AIModel = 'lm-studio' | 'openai-gpt4o' | 'deepseek';

const DEFAULT_PROMPT = `你是一个专业的工作报告撰写助手。请基于以下信息，为当前任务生成一份简洁的进度报告。

%TASK_SUMMARY%

请生成一份结构化的报告，包含以下内容：
1. 任务概述
2. 关键进展
3. 遇到的问题与解决方案
4. 下一步计划`;

const PARENT_HINT = '\n\n注意：此任务是一个父任务（项目），请重点关注此项目的主要内容概述以及各个子任务的完成情况汇总。';
const CHILD_HINT = '\n\n注意：此任务是一个子任务（进度条目），请主要聚焦于此任务本身的具体内容和工作产出。';

// File upload size limit: 5 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// --- Types for related tasks ---
interface RelatedTask {
  id: string;
  name: string | null;
  description: string | null;
  report: string | null;
  date: Date;
  type: { name: string; label: string } | null;
  tags: { tag: { name: string; label: string } }[];
}

interface TaskPickerItem {
  id: string;
  name: string | null;
  children: { id: string; name: string | null; date: Date }[];
}

// --- Types for current task ---
interface CurrentTask {
  id: string;
  name: string | null;
  description: string | null;
  report: string | null;
  parentId: string | null;
  parent: { id: string; name: string | null; description: string | null } | null;
  children: RelatedTask[];
}

export default function SummaryPageClient({ taskId, from }: { taskId?: string; from?: string }) {
  // AI state
  const [selectedModel, setSelectedModel] = useState<AIModel>('openai-gpt4o');
  const [aiResponse, setAIResponse] = useState<string | null>(null);
  const selectedModelRef = useRef<AIModel>('openai-gpt4o');
  useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);

  // Current task state
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);

  // Related tasks state
  const [relatedTasks, setRelatedTasks] = useState<RelatedTask[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskPickerData, setTaskPickerData] = useState<TaskPickerItem[]>([]);
  // ESC to close task picker
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowTaskPicker(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Related files state
  const [relatedFiles, setRelatedFiles] = useState<{ name: string; content: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // AI response editing
  const [editableResponse, setEditableResponse] = useState<string>('');
  const [isEditingResponse, setIsEditingResponse] = useState(false);

  // AI Prompt (set dynamically when task loads)
  const [aiPrompt, setAiPrompt] = useState('');

  // Child report summaries: childId → one-sentence summary (Plan A: summarize before parent)
  const [childSummaries, setChildSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeProgress, setSummarizeProgress] = useState('');

  // Fetch API keys and auto-select model
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const { value: openAIKey } = await getOpenAIApiKey();
        const { value: dsKey } = await getDeepSeekApiKey();

        const hasOpenAI = openAIKey && openAIKey.trim() !== '';
        const hasDeepSeek = dsKey && dsKey.trim() !== '';
        if (hasOpenAI) setSelectedModel('openai-gpt4o');
        else if (hasDeepSeek) setSelectedModel('deepseek');
        else setSelectedModel('lm-studio');
      } catch (err) {
        console.error('Error fetching API keys:', err);
      }
    };
    fetchApiKeys();
  }, []);

  // Load current task and related tasks
  useEffect(() => {
    if (!taskId) return;
    const loadTaskData = async () => {
      setTaskLoading(true);
      // Immediately clear previous AI response when switching tasks
      setAIResponse(null);
      setEditableResponse('');
      try {
        const task = await getTaskById(taskId);
        if (task) {
          setCurrentTask(task as unknown as CurrentTask);

          // Determine AI prompt based on category and parent/child status
          let prompt = DEFAULT_PROMPT;
          const typePrompt = (task as Record<string, unknown>).type as { prompt?: string } | null;
          if (typePrompt?.prompt) {
            prompt = typePrompt.prompt;
          }

          // Add parent/child specific hints
          const isParent = !task.parentId;
          const hasChildren = task.children && task.children.length > 0;
          if (isParent && hasChildren) {
            prompt += PARENT_HINT;
          } else if (!isParent) {
            prompt += CHILD_HINT;
          }

          setAiPrompt(prompt);

          // Load related tasks
          const related = await getRelatedTasks(taskId);
          setRelatedTasks(related as unknown as RelatedTask[]);

          // Plan A: Auto-summarize child reports for parent tasks
          if (isParent && hasChildren) {
            setSummarizing(true);
            const children = (task as unknown as CurrentTask).children || [];
            const childrenWithReports = children.filter(c => c.report);
            const newSummaries: Record<string, string> = {};
            for (let i = 0; i < childrenWithReports.length; i++) {
              const child = childrenWithReports[i];
              setSummarizeProgress(`正在为子任务生成摘要 (${i + 1}/${childrenWithReports.length}): ${child.name}`);
              try {
                const summary = await summarizeChildReport(child.report!, selectedModelRef.current);
                newSummaries[child.id] = summary;
              } catch { /* skip failed summarizations */ }
            }
            setChildSummaries(newSummaries);
            setSummarizing(false);
            setSummarizeProgress('');
          }
        }
      } catch (err) {
        console.error('Error loading task:', err);
      } finally {
        setTaskLoading(false);
        setSummarizing(false);
      }
    };
    loadTaskData();
  }, [taskId]);

  // Load task picker data when modal opens
  const openTaskPicker = async () => {
    setShowTaskPicker(true);
    setPickerLoading(true);
    try {
      const data = await getAllParentTasksWithChildren();
      setTaskPickerData(data as unknown as TaskPickerItem[]);
    } catch (err) {
      console.error('Error loading task picker:', err);
    } finally {
      setPickerLoading(false);
    }
  };

  const addRelatedTask = (task: { id: string; name: string | null }) => {
    if (relatedTasks.some(t => t.id === task.id)) return;
    // Add as a minimal related task entry (report comes from AI)
    setRelatedTasks(prev => [...prev, {
      id: task.id,
      name: task.name,
      description: null,
      report: null,
      date: new Date(),
      type: null,
      tags: [],
    }]);
  };

  const removeRelatedTask = (taskId: string) => {
    setRelatedTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // File handling
  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        alert(`文件 ${file.name} 超过 5MB 限制，已跳过`);
        continue;
      }
      try {
        const content = await readFileContent(file);
        setRelatedFiles(prev => [...prev, { name: file.name, content }]);
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) resolve(e.target.result as string);
        else reject(new Error('读取文件内容失败'));
      };
      reader.onerror = () => reject(new Error('文件读取错误'));
      reader.readAsText(file);
    });
  };

  const removeFile = (idx: number) => {
    setRelatedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Summarize a child's report into one sentence
  const summarizeChildReport = async (report: string, _model: AIModel): Promise<string> => {
    try {
      const modelName = _model === 'deepseek' ? 'deepseek-chat'
        : _model === 'lm-studio' ? 'meta-llama-3.1-8b-instruct'
        : 'gpt-4o';

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: `请用3-5句话总结以下报告的核心内容。要求：保留所有重要细节、关键数据、特殊要求和未完成事项，不要省略任何明确写出的要求。\n\n${report.substring(0, 2500)}` }],
        }),
      });
      if (!resp.ok) throw new Error('Summarize failed');
      const data = await resp.json();
      return data.choices?.[0]?.message?.content?.trim() || '(摘要生成失败)';
    } catch {
      return report.substring(0, 100) + '...(摘要失败)';
    }
  };

  // Compute effective related tasks: for parent, use children from getTaskById;
  // for child, use siblings from getRelatedTasks; also merge manually added tasks
  const effectiveRelatedTasks = useMemo(() => {
    const autoTasks: RelatedTask[] = [];

    if (currentTask) {
      const isParent = !currentTask.parentId;
      if (isParent && currentTask.children) {
        // Parent task: use its children as related tasks
        autoTasks.push(...currentTask.children);
      } else if (relatedTasks.length > 0) {
        // Child task: use siblings from getRelatedTasks
        autoTasks.push(...relatedTasks);
      }
    }

    // Merge with manually added tasks (deduplicate by id)
    const allIds = new Set(autoTasks.map(t => t.id));
    const manualTasks = relatedTasks.filter(t => !allIds.has(t.id));

    return [...autoTasks, ...manualTasks];
  }, [currentTask, relatedTasks]);

  // Build combined context for AI prompt
  const buildFullContext = (): string => {
    const parts: string[] = [];

    // Current task
    parts.push('## 当前任务');
    if (currentTask) {
      parts.push(`- 任务名称: ${currentTask.name || '(未命名)'}`);
      if (currentTask.description) parts.push(`- 描述: ${currentTask.description}`);
      if (currentTask.report) parts.push(`- 已有报告: ${currentTask.report}`);
    } else {
      parts.push('(无)');
    }

    // Related tasks (use effective set that includes auto-loaded + manually added)
    parts.push('\n## 相关任务');
    if (effectiveRelatedTasks.length === 0) {
      parts.push('(无)');
    } else {
      effectiveRelatedTasks.forEach(t => {
        let text = `- ${t.name || '(未命名)'}`;
        if (t.description) text += ` | 描述: ${t.description}`;
        // Use pre-generated summary if available, with truncated original as fallback
        const summary = childSummaries[t.id];
        if (t.report && summary) {
          text += ` | 报告摘要: ${summary}`;
          // Also include first 150 chars of original as safety net
          if (t.report.length > 150) {
            text += ` | 原文首段: ${t.report.substring(0, 150)}...`;
          }
        } else if (t.report) {
          text += ` | 报告: ${t.report.substring(0, 400)}`;
        }
        parts.push(text);
      });
    }

    // Related files
    parts.push('\n## 相关文件');
    if (relatedFiles.length === 0) {
      parts.push('(无)');
    } else {
      relatedFiles.forEach(f => {
        parts.push(`### 文件: ${f.name}`);
        parts.push(f.content.substring(0, 3000));
      });
    }

    return parts.join('\n');
  };

  const handleSendToAI = (response: string) => {
    setAIResponse(response);
    setEditableResponse(response);
  };

  // Reset AI response when context changes (user must re-generate after changes)
  const fullContext = buildFullContext();
  const contextRef = useRef(fullContext);
  useEffect(() => {
    if (contextRef.current !== fullContext && aiResponse) {
      setAIResponse(null);
      setEditableResponse('');
    }
    contextRef.current = fullContext;
  }, [fullContext, aiResponse]);

  // Save report to current task
  const handleSaveReport = async () => {
    if (!taskId || !editableResponse) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await saveTaskReport(taskId, editableResponse);
      setSaveMessage(result.message);
    } catch {
      setSaveMessage('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-50 pb-4 flex justify-between items-center mb-6">
          <div></div>

          <div className="flex items-center gap-2">
            <Link href={from === 'report' ? '/report' : '/tasks'}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              {from === 'report' ? '返回报告' : '返回任务'}
            </Link>
            <Link href="/tasks"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Home
            </Link>
            <a href="/settings" className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors" title="设置">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>

        <div className="space-y-6">
          <ApiKeyCheck />

          {/* Current Task Info */}
          {taskId && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">当前任务</h2>
              {taskLoading ? (
                <p className="text-gray-400 text-sm">加载中...</p>
              ) : currentTask ? (
                <div>
                  <p className="font-medium text-gray-800">{currentTask.name || '(未命名)'}</p>
                  {currentTask.description && <p className="text-sm text-gray-500 mt-1">{currentTask.description}</p>}
                  {currentTask.parent && (
                    <p className="text-xs text-gray-400 mt-1">
                      所属项目：{currentTask.parent.name || '(未命名)'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">未选择任务</p>
              )}
            </div>
          )}

          {/* Summarizing progress indicator */}
          {summarizing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <p className="text-sm text-blue-700">{summarizeProgress}</p>
            </div>
          )}

          {/* AI Model Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">AI 模型选择</h2>
            <div className="max-w-xs">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as AIModel)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md text-gray-900"
              >
                <option value="lm-studio">LM Studio</option>
                <option value="openai-gpt4o">OpenAI (GPT-4o)</option>
                <option value="deepseek">DeepSeek (deepseek-chat)</option>
              </select>
            </div>
          </div>

          {/* AI Chat Box */}
          <AIChatBox
            prompt={aiPrompt}
            content={fullContext}
            previousFeedback={null}
            onEdit={() => {}}
            onPromptEdit={setAiPrompt}
            onSendToAI={handleSendToAI}
            selectedModel={selectedModel}
          />

          {/* AI Response Display */}
          {aiResponse && (
            <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-900">AI 生成报告</h2>
                <button
                  onClick={() => setIsEditingResponse(!isEditingResponse)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {isEditingResponse ? '完成编辑' : '修改'}
                </button>
              </div>
              {isEditingResponse ? (
                <textarea
                  value={editableResponse}
                  onChange={(e) => setEditableResponse(e.target.value)}
                  className="w-full min-h-[300px] p-4 border border-gray-300 rounded-md text-gray-800 text-sm leading-relaxed focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
                  <div className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                    {editableResponse}
                  </div>
                </div>
              )}
              {taskId && (
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleSaveReport()}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存为当前任务报告'}
                  </button>
                  {saveMessage && (
                    <span className={`text-sm ${saveMessage.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Related Tasks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-900">相关任务</h2>
              <button
                onClick={openTaskPicker}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200"
                title="添加相关任务"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {effectiveRelatedTasks.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无相关任务，点击 + 添加</p>
            ) : (
              <div className="space-y-2">
                {effectiveRelatedTasks.map(t => {
                  const isAuto = currentTask?.children?.some(c => c.id === t.id);
                  return (
                  <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-md p-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700">{t.name || '(未命名)'}</span>
                      {t.description && <span className="text-xs text-gray-500 ml-2">- {t.description}</span>}
                      {t.report && <span className="text-xs text-green-600 ml-2">[已有报告]</span>}
                      {isAuto && <span className="text-xs text-blue-500 ml-2">[自动]</span>}
                    </div>
                    {!isAuto && (
                      <button onClick={() => removeRelatedTask(t.id)}
                        className="text-gray-400 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* Related Files */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-900">相关文件</h2>
              <button
                onClick={handleFileSelect}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                title="添加文件"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
                accept=".md,.txt,.js,.ts,.tsx,.jsx,.py,.json,.yaml,.yml,.css,.html"
              />
            </div>
            {relatedFiles.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无文件，点击 + 上传相关文档或代码文件</p>
            ) : (
              <div className="space-y-2">
                {relatedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{f.name}</span>
                      <span className="text-xs text-gray-400">({f.content.length} 字符)</span>
                    </div>
                    <button onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Task Picker Modal */}
        {showTaskPicker && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onDoubleClick={(e) => { if (e.target === e.currentTarget) setShowTaskPicker(false); }}>
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">选择相关任务</h2>
                <button onClick={() => setShowTaskPicker(false)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {pickerLoading ? (
                <p className="text-gray-500">加载中...</p>
              ) : (
                <div className="space-y-3">
                  {taskPickerData.map(parent => (
                    <div key={parent.id}>
                      <button
                        onClick={() => addRelatedTask(parent)}
                        className="w-full text-left px-3 py-2 rounded font-medium text-gray-800 hover:bg-blue-50"
                        disabled={relatedTasks.some(t => t.id === parent.id)}
                      >
                        {parent.name || '(未命名项目)'}
                        {relatedTasks.some(t => t.id === parent.id) && <span className="text-xs text-green-600 ml-2">已添加</span>}
                      </button>
                      {parent.children.length > 0 && (
                        <div className="ml-4 border-l-2 border-gray-100 pl-3 space-y-1">
                          {parent.children.map(child => (
                            <button
                              key={child.id}
                              onClick={() => addRelatedTask(child)}
                              className="w-full text-left px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-50"
                              disabled={relatedTasks.some(t => t.id === child.id)}
                            >
                              {child.name || '(未命名)'}
                              {relatedTasks.some(t => t.id === child.id) && <span className="text-xs text-green-600 ml-2">已添加</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
