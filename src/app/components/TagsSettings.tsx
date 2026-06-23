'use client';

import { useState, useEffect } from 'react';
import { getTags, createTag, updateTag, deleteTag } from '@/app/settings/actions';

interface Tag {
  id: string;
  name: string;
  label: string;
}

export default function TagsSettings() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);
  const [isEditTagModalOpen, setIsEditTagModalOpen] = useState(false);
  const [isDeleteTagModalOpen, setIsDeleteTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagSysName, setNewTagSysName] = useState('');
  const [newTagSysTouched, setNewTagSysTouched] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagSysName, setEditTagSysName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [isDeletingTag, setIsDeletingTag] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  // Auto-generate system name from label (only when user hasn't manually edited it)
  useEffect(() => {
    if (!newTagSysTouched && newTagName) {
      setNewTagSysName(newTagName.trim().toLowerCase().replace(/\s+/g, '-'));
    }
  }, [newTagName, newTagSysTouched]);

  const loadTags = async () => {
    setIsLoadingTags(true);
    try {
      const tagsList = await getTags();
      setTags(tagsList);
    } catch (error) {
      console.error('Error loading tags:', error);
      setStatusMessage({
        type: 'error',
        text: '加载标签失败'
      });
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTagName.trim()) {
      return;
    }

    setIsAddingTag(true);
    setStatusMessage(null);

    try {
      const result = await createTag(newTagName, newTagSysName || undefined);

      if (result.success) {
        setIsAddTagModalOpen(false);
        setNewTagName('');
        setNewTagSysName('');
        setNewTagSysTouched(false);
        await loadTags();
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
      console.error('Error adding tag:', error);
      setStatusMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleEditTagClick = (tag: Tag) => {
    setEditingTag(tag);
    setEditTagName(tag.label);
    setEditTagSysName(tag.name);
    setIsEditTagModalOpen(true);
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editTagName.trim() || !editingTag) {
      return;
    }

    setIsEditingTag(true);
    setStatusMessage(null);

    try {
      const result = await updateTag(editingTag.id, editTagName, editTagSysName);

      if (result.success) {
        setIsEditTagModalOpen(false);
        setEditingTag(null);
        setEditTagName('');
        await loadTags();
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
      console.error('Error updating tag:', error);
      setStatusMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setIsEditingTag(false);
    }
  };

  const handleDeleteTagClick = (tag: Tag) => {
    setDeletingTag(tag);
    setIsDeleteTagModalOpen(true);
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) {
      return;
    }

    setIsDeletingTag(true);
    setStatusMessage(null);

    try {
      const result = await deleteTag(deletingTag.id);

      if (result.success) {
        closeDeleteTagModal();
        await loadTags();
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
      console.error('Error deleting tag:', error);
      setStatusMessage({
        type: 'error',
        text: '发生未知错误'
      });
    } finally {
      setIsDeletingTag(false);
    }
  };

  const closeEditTagModal = () => {
    setIsEditTagModalOpen(false);
    setEditingTag(null);
    setEditTagName('');
    setEditTagSysName('');
  };

  const closeDeleteTagModal = () => {
    setIsDeleteTagModalOpen(false);
    setDeletingTag(null);
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
        <h2 className="text-xl font-semibold text-gray-800">标签管理</h2>
        <button
          type="button"
          onClick={() => setIsAddTagModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          添加标签
        </button>
      </div>

      {isLoadingTags ? (
        <div className="text-center py-6">
          <p className="text-gray-500">加载标签中...</p>
        </div>
      ) : tags.length === 0 ? (
        <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-2">暂无标签</p>
          <p className="text-sm text-gray-500">
            标签帮助您整理和筛选任务。点击「添加标签」创建第一个标签。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  标签名称
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
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {tag.label}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {tag.name}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => handleEditTagClick(tag)}
                        className="text-gray-500 hover:text-blue-600"
                        title="编辑标签"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTagClick(tag)}
                        className="text-gray-500 hover:text-red-600"
                        title="删除标签"
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

      {/* 添加标签模态框 */}
      {isAddTagModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">添加新标签</h2>

            <form onSubmit={handleAddTag}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">标签名称</label>
                <input type="text" value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="例如：高优先级" required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">系统名称</label>
                <input type="text" value={newTagSysName}
                  onChange={(e) => { setNewTagSysName(e.target.value); setNewTagSysTouched(true); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                  placeholder="例如：high-priority"
                />
                <p className="mt-1 text-sm text-gray-500">建议英文小写+连字符</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddTagModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">取消</button>
                <button type="submit"
                  disabled={isAddingTag || !newTagName.trim() || !newTagSysName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                  {isAddingTag ? '添加中...' : '添加标签'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑标签模态框 */}
      {isEditTagModalOpen && editingTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">编辑标签</h2>

            <form onSubmit={handleUpdateTag}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">标签名称</label>
                <input type="text" value={editTagName} onChange={(e) => setEditTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" required />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">系统名称</label>
                <input type="text" value={editTagSysName} onChange={(e) => setEditTagSysName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm" required />
                <p className="mt-1 text-sm text-gray-500">建议英文小写+连字符</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={closeEditTagModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">取消</button>
                <button type="submit"
                  disabled={isEditingTag || !editTagName.trim() || !editTagSysName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                  {isEditingTag ? '更新中...' : '更新标签'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除标签确认模态框 */}
      {isDeleteTagModalOpen && deletingTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">删除标签</h2>

            <p className="text-gray-600 mb-2">
              确定要删除标签 <span className="font-medium">{deletingTag.label}</span> 吗？
            </p>
            <p className="text-sm text-gray-500 mb-6">
              此操作不可撤销。如有任务正在使用此标签，删除将失败。
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeDeleteTagModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteTag}
                disabled={isDeletingTag}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {isDeletingTag ? '删除中...' : '删除标签'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
