'use client';

import { useState, useEffect } from 'react';
import { getTaskTypes, createTaskType, updateTaskType, deleteTaskType, updateTaskTypeOrder } from '@/app/settings/actions';

interface TaskType {
  id: string;
  name: string;
  label: string;
  sortOrder?: number;
  prompt?: string | null;
}

export default function CategoriesSettings() {
  // ESC to close all modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddCategoryModalOpen(false);
        setIsEditCategoryModalOpen(false);
        setIsDeleteCategoryModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [isLoadingTaskTypes, setIsLoadingTaskTypes] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySysName, setNewCategorySysName] = useState('');
  const [newSysTouched, setNewSysTouched] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskType | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TaskType | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategorySysName, setEditCategorySysName] = useState('');
  const [newCategoryPrompt, setNewCategoryPrompt] = useState('');
  const [editCategoryPrompt, setEditCategoryPrompt] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  useEffect(() => {
    loadTaskTypes();
  }, []);

  const DEFAULT_PROMPT = `你是一个专业的工作报告撰写助手。请基于以下信息，为当前任务生成一份简洁的进度报告。

%TASK_SUMMARY%

请生成一份结构化的报告，包含以下内容：
1. 任务概述
2. 关键进展
3. 遇到的问题与解决方案
4. 下一步计划`;

  // Auto-generate system name from label (only when user hasn't manually edited it)
  useEffect(() => {
    if (!newSysTouched && newCategoryName) {
      setNewCategorySysName(newCategoryName.trim().toUpperCase().replace(/\s+/g, '_'));
    }
  }, [newCategoryName, newSysTouched]);

  const loadTaskTypes = async () => {
    setIsLoadingTaskTypes(true);
    try {
      const types = await getTaskTypes();
      setTaskTypes(types);
    } catch (error) {
      console.error('Error loading task types:', error);
      setStatusMessage({
        type: 'error',
        text: '加载分类失败'
      });
    } finally {
      setIsLoadingTaskTypes(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      return;
    }

    setIsAddingCategory(true);
    setStatusMessage(null);

    try {
      const result = await createTaskType(newCategoryName, newCategorySysName || undefined, newCategoryPrompt || undefined);

      if (result.success) {
        setIsAddCategoryModalOpen(false);
        setNewCategoryName('');
        setNewCategorySysName('');
        setNewSysTouched(false);
        setNewCategoryPrompt('');
        await loadTaskTypes();
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
    } catch (error) {
      console.error('Error adding category:', error);
      setStatusMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleEditCategoryClick = (category: TaskType) => {
    setEditingCategory(category);
    setEditCategoryName(category.label);
    setEditCategorySysName(category.name);
    setEditCategoryPrompt(category.prompt || '');
    setIsEditCategoryModalOpen(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editCategoryName.trim() || !editingCategory) {
      return;
    }

    setIsEditingCategory(true);
    setStatusMessage(null);

    try {
      const result = await updateTaskType(editingCategory.id, editCategoryName, editCategorySysName, editCategoryPrompt || undefined);

      if (result.success) {
        setIsEditCategoryModalOpen(false);
        setEditingCategory(null);
        setEditCategoryName('');
        await loadTaskTypes();
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
    } catch (error) {
      console.error('Error updating category:', error);
      setStatusMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setIsEditingCategory(false);
    }
  };

  const handleDeleteCategoryClick = (category: TaskType) => {
    setDeletingCategory(category);
    setIsDeleteCategoryModalOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) {
      return;
    }

    setIsDeletingCategory(true);
    setStatusMessage(null);

    try {
      const result = await deleteTaskType(deletingCategory.id);

      if (result.success) {
        closeDeleteModal();
        await loadTaskTypes();
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
    } catch (error) {
      console.error('Error deleting category:', error);
      setStatusMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const closeEditModal = () => {
    setIsEditCategoryModalOpen(false);
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategorySysName('');
    setEditCategoryPrompt('');
  };

  const closeDeleteModal = () => {
    setIsDeleteCategoryModalOpen(false);
    setDeletingCategory(null);
  };

  const handleMoveCategoryUp = async (category: TaskType, index: number) => {
    if (index === 0) return;

    const prevCategory = taskTypes[index - 1];

    try {
      setStatusMessage(null);
      await updateTaskTypeOrder(category.id, prevCategory.sortOrder || 0);
      await updateTaskTypeOrder(prevCategory.id, category.sortOrder || 0);
      await loadTaskTypes();
      setStatusMessage({
        type: 'success',
        text: '分类排序更新成功'
      });
    } catch (error) {
      console.error('Error moving category up:', error);
      setStatusMessage({
        type: 'error',
        text: '分类排序更新失败'
      });
    }
  };

  const handleMoveCategoryDown = async (category: TaskType, index: number) => {
    if (index === taskTypes.length - 1) return;

    const nextCategory = taskTypes[index + 1];

    try {
      setStatusMessage(null);
      await updateTaskTypeOrder(category.id, nextCategory.sortOrder || 0);
      await updateTaskTypeOrder(nextCategory.id, category.sortOrder || 0);
      await loadTaskTypes();
      setStatusMessage({
        type: 'success',
        text: '分类排序更新成功'
      });
    } catch (error) {
      console.error('Error moving category down:', error);
      setStatusMessage({
        type: 'error',
        text: '分类排序更新失败'
      });
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
        <h2 className="text-xl font-semibold text-gray-800">分类管理</h2>
        <button
          type="button"
          onClick={() => setIsAddCategoryModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          添加分类
        </button>
      </div>

      {isLoadingTaskTypes ? (
        <div className="text-center py-6">
          <p className="text-gray-500">加载分类中...</p>
        </div>
      ) : taskTypes.length === 0 ? (
        <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-2">暂无分类</p>
          <p className="text-sm text-gray-500">
            分类帮助您整理任务。点击「添加分类」创建第一个分类。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  排序
                </th>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                  分类名称
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  系统名称
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {taskTypes.map((category, index) => (
                <tr key={category.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                    {category.sortOrder !== undefined ? category.sortOrder : '-'}
                  </td>
                  <td className="whitespace-nowrap py-4 pr-3 text-sm font-medium text-gray-900">
                    {category.label}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {category.name}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => handleMoveCategoryUp(category, index)}
                        className={`text-gray-500 hover:text-blue-600 ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="上移"
                        disabled={index === 0}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveCategoryDown(category, index)}
                        className={`text-gray-500 hover:text-blue-600 ${index === taskTypes.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="下移"
                        disabled={index === taskTypes.length - 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditCategoryClick(category)}
                        className="text-gray-500 hover:text-blue-600"
                        title="编辑分类"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategoryClick(category)}
                        className="text-gray-500 hover:text-red-600"
                        title="删除分类"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 添加分类模态框 */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onDoubleClick={(e) => { if (e.target === e.currentTarget) { setIsAddCategoryModalOpen(false); setIsEditCategoryModalOpen(false); setIsDeleteCategoryModalOpen(false); } }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">添加新分类</h2>

            <form onSubmit={handleAddCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="例如：代码审查"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">系统名称</label>
                <input
                  type="text"
                  value={newCategorySysName}
                  onChange={(e) => { setNewCategorySysName(e.target.value); setNewSysTouched(true); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                  placeholder="例如：CODE_REVIEW"
                />
                <p className="mt-1 text-sm text-gray-500">建议英文大写+下划线，代码中引用使用</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI 提示词
                  <span className="ml-1 text-xs text-gray-400 font-normal">（用于 AI 摘要，支持 %TASK_SUMMARY% 占位符）</span>
                </label>
                <textarea value={newCategoryPrompt}
                  onChange={(e) => setNewCategoryPrompt(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 font-mono"
                  placeholder={DEFAULT_PROMPT}
                />
                <p className="mt-1 text-sm text-gray-500">留空则使用系统默认提示词</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">取消</button>
                <button type="submit" disabled={isAddingCategory || !newCategoryName.trim() || !newCategorySysName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                  {isAddingCategory ? '添加中...' : '添加分类'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑分类模态框 */}
      {isEditCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onDoubleClick={(e) => { if (e.target === e.currentTarget) { setIsAddCategoryModalOpen(false); setIsEditCategoryModalOpen(false); setIsDeleteCategoryModalOpen(false); } }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">编辑分类</h2>

            <form onSubmit={handleUpdateCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
                <input type="text" value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" required />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">系统名称</label>
                <input type="text" value={editCategorySysName}
                  onChange={(e) => setEditCategorySysName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm" required />
                <p className="mt-1 text-sm text-gray-500">建议英文大写+下划线，代码中引用使用</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI 提示词
                  <span className="ml-1 text-xs text-gray-400 font-normal">（用于 AI 摘要）</span>
                </label>
                <textarea value={editCategoryPrompt}
                  onChange={(e) => setEditCategoryPrompt(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 font-mono"
                  placeholder={DEFAULT_PROMPT}
                />
                <p className="mt-1 text-sm text-gray-500">留空则使用系统默认提示词</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">取消</button>
                <button type="submit"
                  disabled={isEditingCategory || !editCategoryName.trim() || !editCategorySysName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                  {isEditingCategory ? '更新中...' : '更新分类'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除分类确认模态框 */}
      {isDeleteCategoryModalOpen && deletingCategory && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onDoubleClick={(e) => { if (e.target === e.currentTarget) { setIsAddCategoryModalOpen(false); setIsEditCategoryModalOpen(false); setIsDeleteCategoryModalOpen(false); } }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">删除分类</h2>

            <p className="text-gray-600 mb-2">
              确定要删除分类 <span className="font-medium">{deletingCategory.label}</span> 吗？
            </p>
            <p className="text-sm text-gray-500 mb-6">
              此操作不可撤销。如有任务正在使用此分类，删除将失败。
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={isDeletingCategory}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {isDeletingCategory ? '删除中...' : '删除分类'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
