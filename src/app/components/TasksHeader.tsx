'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CiSettings, CiLogout } from 'react-icons/ci';
import { useTaskContext } from '@/app/lib/TaskContext';

export default function TasksHeader() {
  const router = useRouter();
  const { setShowAddTaskForm } = useTaskContext();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">任务追踪</h1>
        <p className="mt-2 text-sm text-gray-600">
          添加和管理日常任务与活动
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowAddTaskForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
        >
          添加新任务
        </button>
        <button
          onClick={() => router.push('/report')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          生成报告
        </button>
        <button
          onClick={() => router.push('/tasks/summary')}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
        >
          摘要编写
        </button>

        <div className="relative group">
          <Link href="/settings" className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <CiSettings className="w-6 h-6" />
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
          title="登出"
        >
          <CiLogout className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
