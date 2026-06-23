'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CiSettings } from 'react-icons/ci';

export default function TasksHeader() {
  const router = useRouter();

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
          onClick={() => router.push('/report')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          生成报告
        </button>

        <div className="relative group">
          <Link href="/settings" className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <CiSettings className="w-6 h-6" />
            <span className="sr-only">设置</span>
          </Link>
          <div className="absolute right-0 top-0 -translate-y-full hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap mb-1">
            设置
          </div>
        </div>
      </div>
    </div>
  );
}
