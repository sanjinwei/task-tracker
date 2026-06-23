'use client';

import { useState, useEffect } from 'react';
import {
  getOpenAIApiKey,
  updateOpenAIApiKey,
  getLMStudioEndpoint,
  updateLMStudioEndpoint,
  getOpenAIEndpoint,
  updateOpenAIEndpoint,
  getDeepSeekApiKey,
  updateDeepSeekApiKey,
  getDeepSeekEndpoint,
  updateDeepSeekEndpoint
} from '@/app/settings/actions';

export default function AIConfigSettings() {
  const [apiKey, setApiKey] = useState<string>('');
  const [lmStudioEndpoint, setLMStudioEndpoint] = useState<string>('');
  const [openAIEndpoint, setOpenAIEndpoint] = useState<string>('https://api.openai.com/v1/chat/completions');
  const [isEditingOpenAIEndpoint, setIsEditingOpenAIEndpoint] = useState(false);
  const [isEditingLMStudioEndpoint, setIsEditingLMStudioEndpoint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lmEndpointLoading, setLMEndpointLoading] = useState(false);
  const [openAIEndpointLoading, setOpenAIEndpointLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [lmStatusMessage, setLMStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [openAIEndpointMessage, setOpenAIEndpointMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // DeepSeek state
  const [deepSeekApiKey, setDeepSeekApiKey] = useState<string>('');
  const [deepSeekEndpoint, setDeepSeekEndpoint] = useState<string>('https://api.deepseek.com/v1/chat/completions');
  const [isEditingDeepSeekEndpoint, setIsEditingDeepSeekEndpoint] = useState(false);
  const [deepSeekKeyLoading, setDeepSeekKeyLoading] = useState(false);
  const [deepSeekEndpointLoading, setDeepSeekEndpointLoading] = useState(false);
  const [deepSeekKeyMessage, setDeepSeekKeyMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [deepSeekEndpointMessage, setDeepSeekEndpointMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load OpenAI API key
        const { value: apiKeyValue } = await getOpenAIApiKey();
        if (apiKeyValue) {
          setApiKey(apiKeyValue);
        }

        // Load OpenAI endpoint
        const { value: openAIEndpointValue } = await getOpenAIEndpoint();
        if (openAIEndpointValue) {
          setOpenAIEndpoint(openAIEndpointValue);
        } else {
          setOpenAIEndpoint('https://api.openai.com/v1/chat/completions');
        }

        // Load LM Studio endpoint
        const { value: endpointValue } = await getLMStudioEndpoint();
        if (endpointValue) {
          setLMStudioEndpoint(endpointValue);
        } else {
          setLMStudioEndpoint('http://localhost:1234/v1/chat/completions');
        }

        // Load DeepSeek API key
        const { value: deepSeekKeyValue } = await getDeepSeekApiKey();
        if (deepSeekKeyValue) {
          setDeepSeekApiKey(deepSeekKeyValue);
        }

        // Load DeepSeek endpoint
        const { value: deepSeekEndpointValue } = await getDeepSeekEndpoint();
        if (deepSeekEndpointValue) {
          setDeepSeekEndpoint(deepSeekEndpointValue);
        } else {
          setDeepSeekEndpoint('https://api.deepseek.com/v1/chat/completions');
        }
      } catch {
        setStatusMessage({
          type: 'error',
          text: '加载 AI 配置设置失败'
        });
      }
    };

    loadSettings();
  }, []);

  const handleSaveApiKey = async () => {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const result = await updateOpenAIApiKey(apiKey);

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: result.message
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOpenAIEndpoint = async () => {
    setOpenAIEndpointLoading(true);
    setOpenAIEndpointMessage(null);

    try {
      const result = await updateOpenAIEndpoint(openAIEndpoint);

      if (result.success) {
        setOpenAIEndpointMessage({
          type: 'success',
          text: result.message
        });
        setIsEditingOpenAIEndpoint(false);
      } else {
        setOpenAIEndpointMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch {
      setOpenAIEndpointMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setOpenAIEndpointLoading(false);
    }
  };

  const handleSaveLMStudioEndpoint = async () => {
    setLMEndpointLoading(true);
    setLMStatusMessage(null);

    try {
      const result = await updateLMStudioEndpoint(lmStudioEndpoint);

      if (result.success) {
        setLMStatusMessage({
          type: 'success',
          text: result.message
        });
        setIsEditingLMStudioEndpoint(false);
      } else {
        setLMStatusMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch {
      setLMStatusMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setLMEndpointLoading(false);
    }
  };

  const handleSaveDeepSeekApiKey = async () => {
    setDeepSeekKeyLoading(true);
    setDeepSeekKeyMessage(null);

    try {
      const result = await updateDeepSeekApiKey(deepSeekApiKey);

      if (result.success) {
        setDeepSeekKeyMessage({
          type: 'success',
          text: result.message
        });
      } else {
        setDeepSeekKeyMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch {
      setDeepSeekKeyMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setDeepSeekKeyLoading(false);
    }
  };

  const handleSaveDeepSeekEndpoint = async () => {
    setDeepSeekEndpointLoading(true);
    setDeepSeekEndpointMessage(null);

    try {
      const result = await updateDeepSeekEndpoint(deepSeekEndpoint);

      if (result.success) {
        setDeepSeekEndpointMessage({
          type: 'success',
          text: result.message
        });
        setIsEditingDeepSeekEndpoint(false);
      } else {
        setDeepSeekEndpointMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch {
      setDeepSeekEndpointMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setDeepSeekEndpointLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-md ${
          statusMessage.type === 'success'
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {statusMessage.text}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">AI 配置</h2>
      </div>

      <div className="max-w-lg space-y-8">
        {/* OpenAI API Key Section */}
        <div className="pt-2">
          <h4 className="text-md font-medium text-gray-900 mb-2">OpenAI API 密钥</h4>
          <p className="text-sm text-gray-600 mb-4">
            配置您的 OpenAI API 密钥以启用 AI 功能。
            您的 API 密钥将安全存储，仅用于生成任务摘要和分析。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API 密钥
              </label>
              <div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="sk-..."
                  disabled={isLoading}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                您可以在 OpenAI 账户控制台中找到 API 密钥。
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={isLoading || !apiKey.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? '保存中...' : '保存 API 密钥'}
              </button>
            </div>
          </div>
        </div>

        {/* OpenAI API Endpoint Section */}
        <div className="border-t border-gray-200 pt-6">
          {openAIEndpointMessage && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              openAIEndpointMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {openAIEndpointMessage.text}
            </div>
          )}

          <h4 className="text-md font-medium text-gray-900 mb-2">OpenAI API 端点</h4>
          <p className="text-sm text-gray-600 mb-4">
            OpenAI API 请求使用的端点地址。通常无需修改，除非您使用代理或自定义部署。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                端点 URL
              </label>
              <div className="relative">
                {isEditingOpenAIEndpoint ? (
                  <input
                    type="text"
                    value={openAIEndpoint}
                    onChange={(e) => setOpenAIEndpoint(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="https://api.openai.com/v1/chat/completions"
                    disabled={openAIEndpointLoading}
                  />
                ) : (
                  <div className="flex items-center">
                    <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700 text-sm overflow-x-auto">
                      {openAIEndpoint}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingOpenAIEndpoint(true)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                      title="编辑端点"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isEditingOpenAIEndpoint && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSaveOpenAIEndpoint}
                  disabled={openAIEndpointLoading || !openAIEndpoint.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {openAIEndpointLoading ? '保存中...' : '保存端点'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingOpenAIEndpoint(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LM Studio Endpoint Section */}
        <div className="border-t border-gray-200 pt-6">
          {lmStatusMessage && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              lmStatusMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {lmStatusMessage.text}
            </div>
          )}

          <h4 className="text-md font-medium text-gray-900 mb-2">LM Studio 配置</h4>
          <p className="text-sm text-gray-600 mb-4">
            配置本地 LM Studio 实例的端点地址。
            使用本地托管模型生成 AI 摘要时使用此配置。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LM Studio API 端点
              </label>
              <div className="relative">
                {isEditingLMStudioEndpoint ? (
                  <input
                    type="text"
                    value={lmStudioEndpoint}
                    onChange={(e) => setLMStudioEndpoint(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="http://localhost:1234/v1/chat/completions"
                    disabled={lmEndpointLoading}
                  />
                ) : (
                  <div className="flex items-center">
                    <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700 text-sm overflow-x-auto">
                      {lmStudioEndpoint}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingLMStudioEndpoint(true)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                      title="编辑端点"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                此地址应为 LM Studio 聊天补全端点的完整 URL。
              </p>
            </div>

            {isEditingLMStudioEndpoint && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSaveLMStudioEndpoint}
                  disabled={lmEndpointLoading || !lmStudioEndpoint.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {lmEndpointLoading ? '保存中...' : '保存端点'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingLMStudioEndpoint(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>

        {/* DeepSeek API Configuration Section */}
        <div className="border-t border-gray-200 pt-6">
          {deepSeekKeyMessage && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              deepSeekKeyMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {deepSeekKeyMessage.text}
            </div>
          )}

          <h4 className="text-md font-medium text-gray-900 mb-2">DeepSeek API 密钥</h4>
          <p className="text-sm text-gray-600 mb-4">
            配置您的 DeepSeek API 密钥以使用 DeepSeek 模型生成 AI 摘要。
            请从 DeepSeek 平台控制台获取 API 密钥。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API 密钥
              </label>
              <div>
                <input
                  type="password"
                  value={deepSeekApiKey}
                  onChange={(e) => setDeepSeekApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="sk-..."
                  disabled={deepSeekKeyLoading}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                您可以在 DeepSeek 账户控制台中找到 API 密钥。
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSaveDeepSeekApiKey}
                disabled={deepSeekKeyLoading || !deepSeekApiKey.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {deepSeekKeyLoading ? '保存中...' : '保存 API 密钥'}
              </button>
            </div>
          </div>
        </div>

        {/* DeepSeek API Endpoint Section */}
        <div className="border-t border-gray-200 pt-6">
          {deepSeekEndpointMessage && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              deepSeekEndpointMessage.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {deepSeekEndpointMessage.text}
            </div>
          )}

          <h4 className="text-md font-medium text-gray-900 mb-2">DeepSeek API 端点</h4>
          <p className="text-sm text-gray-600 mb-4">
            DeepSeek API 请求使用的端点地址。默认为 DeepSeek 官方 API 端点。
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                端点 URL
              </label>
              <div className="relative">
                {isEditingDeepSeekEndpoint ? (
                  <input
                    type="text"
                    value={deepSeekEndpoint}
                    onChange={(e) => setDeepSeekEndpoint(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="https://api.deepseek.com/v1/chat/completions"
                    disabled={deepSeekEndpointLoading}
                  />
                ) : (
                  <div className="flex items-center">
                    <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700 text-sm overflow-x-auto">
                      {deepSeekEndpoint}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingDeepSeekEndpoint(true)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                      title="编辑端点"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                此地址应为 DeepSeek 聊天补全端点的完整 URL。
              </p>
            </div>

            {isEditingDeepSeekEndpoint && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSaveDeepSeekEndpoint}
                  disabled={deepSeekEndpointLoading || !deepSeekEndpoint.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {deepSeekEndpointLoading ? '保存中...' : '保存端点'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDeepSeekEndpoint(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
