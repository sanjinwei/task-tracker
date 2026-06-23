import { Metadata } from 'next';
import SummaryPageClient from './SummaryPageClient';

export const metadata: Metadata = {
  title: 'AI 任务摘要',
  description: 'Generate AI-powered summaries of your tasks',
};

interface SummaryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const resolvedParams = await searchParams;
  const taskId = typeof resolvedParams.taskId === 'string' ? resolvedParams.taskId : undefined;
  const from = typeof resolvedParams.from === 'string' ? resolvedParams.from : undefined;

  return <SummaryPageClient taskId={taskId} from={from} />;
}
