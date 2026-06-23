'use client';

import { useState, useEffect } from 'react';
import { getOpenAIApiKey, getLMStudioEndpoint, getOpenAIEndpoint, getDeepSeekApiKey, getDeepSeekEndpoint } from '@/app/settings/actions';

// Default fallback endpoint for OpenAI (used only if not found in settings)
const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

interface AIChatBoxProps {
  prompt: string;
  content: string;
  previousFeedback?: string | null;
  relatedTasks?: string;
  relatedFiles?: string;
  onEdit?: (newContent: string) => void;
  onPromptEdit?: (newPrompt: string) => void;
  onSendToAI?: (response: string) => void;
  onLoadingStateChange?: (loading: boolean) => void;
  selectedModel?: 'lm-studio' | 'openai-gpt4o' | 'deepseek';
}

export default function AIChatBox({
  prompt,
  content,
  previousFeedback = null,
  relatedTasks,
  relatedFiles,
  onEdit,
  onPromptEdit,
  onSendToAI,
  onLoadingStateChange,
  selectedModel = 'openai-gpt4o'
}: AIChatBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [editedContent, setEditedContent] = useState(content);
  const [isLoading, setIsLoading] = useState(false);

  // Sync props to state when not editing (handles async data loading)
  useEffect(() => {
    if (!isEditing) {
      setEditedPrompt(prompt);
      setEditedContent(content);
    }
  }, [prompt, content, isEditing]);
  const [openAIApiKey, setOpenAIApiKey] = useState<string>('');
  const [lmStudioEndpoint, setLMStudioEndpoint] = useState<string>('http://localhost:1234/v1/chat/completions');
  const [openAIEndpoint, setOpenAIEndpoint] = useState<string>(DEFAULT_OPENAI_ENDPOINT);
  const [deepSeekApiKey, setDeepSeekApiKey] = useState<string>('');
  const [deepSeekEndpoint, setDeepSeekEndpoint] = useState<string>('https://api.deepseek.com/v1/chat/completions');
  
  // Fetch API settings from the Settings table
  useEffect(() => {
    const fetchAPISettings = async () => {
      try {
        // Always fetch both endpoints regardless of selected model
        const { value: lmEndpoint } = await getLMStudioEndpoint();
        if (lmEndpoint) {
          setLMStudioEndpoint(lmEndpoint);
        }
        
        const { value: oaiEndpoint } = await getOpenAIEndpoint();
        if (oaiEndpoint) {
          setOpenAIEndpoint(oaiEndpoint);
        }
        
        // Fetch OpenAI API key if that model is selected
        if (selectedModel === 'openai-gpt4o') {
          const { value } = await getOpenAIApiKey();
          setOpenAIApiKey(value || '');
        }

        // Fetch DeepSeek settings
        if (selectedModel === 'deepseek') {
          const { value: dsKey } = await getDeepSeekApiKey();
          if (dsKey) setDeepSeekApiKey(dsKey);

          const { value: dsEndpoint } = await getDeepSeekEndpoint();
          if (dsEndpoint) setDeepSeekEndpoint(dsEndpoint);
        }
      } catch (error) {
        console.error('Error fetching API settings:', error);
      }
    };
    
    fetchAPISettings();
  }, [selectedModel]);

  // Update edited content when content prop changes
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  // Update edited prompt when prompt prop changes
  useEffect(() => {
    setEditedPrompt(prompt);
  }, [prompt]);

  // Update loading state in parent component
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(isLoading);
    }
  }, [isLoading, onLoadingStateChange]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onEdit) {
      // Pass the edited content back to the parent
      onEdit(editedContent);
    }
    
    if (onPromptEdit) {
      // Pass the edited prompt back to the parent
      onPromptEdit(editedPrompt);
    }
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPrompt(prompt);
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleSendToAI = async () => {
    if (!onSendToAI) return;
    
    setIsLoading(true);
    
    try {
      // Use props directly (not state) to always get latest data
      let finalPrompt = prompt.replace('%TASK_SUMMARY%', content);

      // Replace optional placeholders if they exist in prompt
      if (previousFeedback) {
        finalPrompt = finalPrompt.replace('%SUMMARIZED_PREVIOUS_FEEDBACK%', previousFeedback);
      }
      if (relatedTasks) {
        finalPrompt = finalPrompt.replace('%RELATED_TASKS%', relatedTasks);
      }
      if (relatedFiles) {
        finalPrompt = finalPrompt.replace('%RELATED_FILES%', relatedFiles);
      }

      // Remove any remaining placeholder sections
      finalPrompt = finalPrompt
        .replace(/## Previous Feedback Context\n%SUMMARIZED_PREVIOUS_FEEDBACK%\n\n/g, '')
        .replace(/## 相关任务\n%RELATED_TASKS%\n\n/g, '')
        .replace(/## 相关文件\n%RELATED_FILES%\n\n/g, '');
      
      // Determine AI provider settings
      let apiEndpoint: string;
      let apiKey = '';
      let modelName: string;
      if (selectedModel === 'lm-studio') {
        apiEndpoint = lmStudioEndpoint;
        modelName = 'meta-llama-3.1-8b-instruct';
      } else if (selectedModel === 'deepseek') {
        apiEndpoint = deepSeekEndpoint;
        modelName = 'deepseek-chat';
        if (!deepSeekApiKey) throw new Error('缺少 DeepSeek API 密钥');
        apiKey = deepSeekApiKey;
      } else {
        apiEndpoint = openAIEndpoint;
        modelName = 'gpt-4o';
        if (!openAIApiKey) throw new Error('缺少 OpenAI API 密钥');
        apiKey = openAIApiKey;
      }

      // Call AI through server-side proxy to avoid CORS
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: apiEndpoint,
          apiKey,
          model: modelName,
          messages: [{ role: 'user', content: finalPrompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error((err as { error?: string }).error || `请求失败 (${response.status})`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'AI 未返回响应';

      // Pass the AI response back to the parent
      onSendToAI(aiResponse);
    } catch (error: unknown) {
      console.error(`Error calling ${selectedModel} API:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`从 ${selectedModel === 'openai-gpt4o' ? 'OpenAI' : selectedModel === 'deepseek' ? 'DeepSeek' : 'LM Studio'} 获取 AI 摘要失败：${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-500 mb-1">AI 助手</div>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提示词</label>
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  rows={3}
                  placeholder="输入提示词，可使用 %TASK_SUMMARY% 和 %SUMMARIZED_PREVIOUS_FEEDBACK% 占位符"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务内容</label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  rows={4}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="text-gray-900 whitespace-pre-wrap pr-16">{editedPrompt}</div>
              <div className="absolute top-0 right-0 flex space-x-2">
                <button
                  onClick={handleSendToAI}
                  disabled={isLoading}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="发送给 AI 生成摘要"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleEdit}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="编辑提示词和内容"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 