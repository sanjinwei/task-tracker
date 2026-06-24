'use client';

import DOMPurify from 'dompurify';

interface ReportViewProps {
  reportHTML: string;
  onDownload: () => void;
}

export default function ReportView({ reportHTML, onDownload }: ReportViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onDownload}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          下载报告
        </button>
      </div>
      <div
        className="p-6 bg-white rounded-lg shadow text-gray-900 report-content"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportHTML) }}
      />
    </div>
  );
} 