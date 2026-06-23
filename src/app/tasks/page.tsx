import { Metadata } from 'next';
import TasksPageClient from './TasksPageClient';

export const metadata: Metadata = {
  title: 'Task Tracker',
  description: 'Add and manage your daily tasks and activities',
};

export default function TasksPage() {
  return <TasksPageClient />;
}
