'use client';

import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import TasksHeader from '../components/TasksHeader';
import { TaskProvider, useTaskContext } from '../lib/TaskContext';
import Notification from '../components/Notification';
import { useEffect } from 'react';

function TasksPageContent() {
  const { showAddTaskForm, setShowAddTaskForm } = useTaskContext();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAddTaskForm(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setShowAddTaskForm]);

  return (
    <>
      <div className="sticky top-0 z-10 bg-gray-50 pb-4 mb-8">
        <TasksHeader />
      </div>

      <div className="relative">
        <div className="sticky top-0 z-50">
          <Notification />
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Tasks</h2>
            <TaskList />
          </div>
        </div>
      </div>

      {showAddTaskForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-[10vh] p-4 z-50"
          onDoubleClick={(e) => { if (e.target === e.currentTarget) setShowAddTaskForm(false); }}>
          <div className="w-full max-w-lg resize overflow-auto" onClick={(e) => e.stopPropagation()}
            style={{ minWidth: '380px', maxHeight: '90vh' }}>
            <div className="relative">
              <button onClick={() => setShowAddTaskForm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <TaskForm />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function TasksPageClient() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <TaskProvider>
          <TasksPageContent />
        </TaskProvider>
      </div>
    </main>
  );
}
