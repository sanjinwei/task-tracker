'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { fetchTasks, saveTaskReport } from '@/app/tasks/actions';
import { TaskWithType } from '@/app/tasks/report';
import JSZip from 'jszip';

interface ParentGroup {
  parent: TaskWithType;
  children: TaskWithType[];
  dateRange: string;
}

interface CategoryGroup {
  label: string;
  parents: ParentGroup[];
}

function buildReportStructure(tasks: TaskWithType[]): CategoryGroup[] {
  const parentMap = new Map<string, TaskWithType>();
  const childMap = new Map<string, TaskWithType[]>();

  for (const task of tasks) {
    if (!task.parentId) {
      parentMap.set(task.id, task);
    } else {
      if (!childMap.has(task.parentId)) {
        childMap.set(task.parentId, []);
      }
      childMap.get(task.parentId)!.push(task);
    }
  }

  // Use a single "未分类" bucket for uncategorized, and type-based buckets for others
  const categorizedMap = new Map<string, CategoryGroup>();
  const uncategorized: ParentGroup[] = [];

  for (const parent of parentMap.values()) {
    const children = (childMap.get(parent.id) || []).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let dateRange: string;
    if (children.length > 0) {
      const childDates = children.map(c => new Date(c.date).getTime());
      const minDate = new Date(Math.min(...childDates));
      const maxDate = new Date(Math.max(...childDates));
      dateRange = minDate.getTime() === maxDate.getTime()
        ? format(minDate, 'yyyy/MM/dd')
        : `${format(minDate, 'yyyy/MM/dd')} - ${format(maxDate, 'yyyy/MM/dd')}`;
    } else {
      dateRange = format(new Date(parent.date), 'yyyy/MM/dd');
    }

    const group: ParentGroup = { parent, children, dateRange };

    if (parent.type) {
      const typeName = parent.type.name;
      if (!categorizedMap.has(typeName)) {
        categorizedMap.set(typeName, { label: parent.type.label, parents: [] });
      }
      categorizedMap.get(typeName)!.parents.push(group);
    } else {
      uncategorized.push(group);
    }
  }

  const result = Array.from(categorizedMap.values());
  if (uncategorized.length > 0) {
    result.push({ label: '未分类', parents: uncategorized });
  }
  return result;
}

// Inline editable report section
function ReportSection({
  label,
  report,
  placeholder,
  taskId,
  colorClass,
  onReportChanged,
}: {
  label: string;
  report: string | null;
  placeholder: string;
  taskId: string;
  colorClass: string;
  onReportChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(report || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setSaving(true);
    await saveTaskReport(taskId, editText);
    setSaving(false);
    setEditing(false);
    onReportChanged();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await saveTaskReport(taskId, '');
    setDeleting(false);
    setEditText('');
    onReportChanged();
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium text-sm text-gray-700">{label}</h5>
        <div className="flex items-center gap-1">
          {report && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(!editing); if (!editing) setEditText(report || ''); }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {editing ? '取消' : '修改'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700"
              >
                {deleting ? '删除中...' : '删除'}
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/tasks/summary?taskId=${taskId}&from=report`); }}
            className="text-xs text-purple-600 hover:text-purple-800 font-medium"
          >
            AI 摘要
          </button>
        </div>
      </div>
      {editing ? (
        <div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[120px] p-3 border border-gray-300 rounded text-sm text-gray-800"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      ) : report ? (
        <div className="text-sm text-gray-700 whitespace-pre-wrap">{report}</div>
      ) : (
        <p className="text-gray-400 text-sm italic">{placeholder}</p>
      )}
    </div>
  );
}

export default function ReportContent() {
  // ESC to close download modal
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDownloadModal(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const [tasks, setTasks] = useState<TaskWithType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  // Force re-render counter when reports change
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const typeParam = searchParams.get('type');
        const tagParam = searchParams.get('tag');

        let startDate: Date | undefined;
        let endDate: Date | undefined;
        if (startDateParam && endDateParam) {
          startDate = new Date(startDateParam);
          endDate = new Date(endDateParam);
        }

        const fetchedTasks = await fetchTasks({
          startDate, endDate,
          type: typeParam || undefined,
          tag: tagParam || undefined,
        });
        setTasks(fetchedTasks);
      } catch (err) {
        console.error('Error generating report:', err);
        setError('生成报告失败，请重试');
      } finally {
        setIsLoading(false);
      }
    };
    loadReport();
  }, [searchParams, refreshKey]);

  const reportStructure = useMemo(() => buildReportStructure(tasks), [tasks]);

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const toggleChild = (childId: string) => {
    setExpandedChildren(prev => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  };

  const handleReportChanged = () => setRefreshKey(k => k + 1);

  // Download modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedDownloadIds, setSelectedDownloadIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  // Collect all downloadable items (parent reports + child reports)
  const downloadItems = useMemo(() => {
    const items: { parentId: string; parentName: string; taskId: string; taskName: string; report: string; isParent: boolean }[] = [];
    for (const cat of reportStructure) {
      for (const { parent, children } of cat.parents) {
        if (parent.report) {
          items.push({ parentId: parent.id, parentName: parent.name || '(未命名)', taskId: parent.id, taskName: parent.name || '(未命名)', report: parent.report, isParent: true });
        }
        for (const child of children) {
          if (child.report) {
            items.push({ parentId: parent.id, parentName: parent.name || '(未命名)', taskId: child.id, taskName: child.name || '(未命名)', report: child.report, isParent: false });
          }
        }
      }
    }
    return items;
  }, [reportStructure]);

  const toggleDownloadSelect = (taskId: string) => {
    setSelectedDownloadIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAll = () => setSelectedDownloadIds(new Set(downloadItems.map(i => i.taskId)));
  const deselectAll = () => setSelectedDownloadIds(new Set());

  const handleDownloadZip = async () => {
    const selected = downloadItems.filter(i => selectedDownloadIds.has(i.taskId));
    if (selected.length === 0) return;

    setDownloading(true);
    try {
      if (selected.length === 1) {
        // Single download - direct file
        const item = selected[0];
        const prefix = item.isParent ? '项目报告' : '进度报告';
        const content = `# ${prefix} - ${item.parentName} - ${item.taskName}\n\n${item.report}`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.taskName}-report.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Multiple download - create zip
        const zip = new JSZip();
        // Group by parent
        const grouped = new Map<string, typeof selected>();
        for (const item of selected) {
          if (!grouped.has(item.parentId)) grouped.set(item.parentId, []);
          grouped.get(item.parentId)!.push(item);
        }
        for (const [, items] of grouped) {
          const parentName = items[0].parentName.replace(/[/\\:*?"<>|]/g, '_');
          for (const item of items) {
            const prefix = item.isParent ? '项目报告' : '进度报告';
            const content = `# ${prefix} - ${item.taskName}\n\n${item.report}`;
            const fileName = item.isParent
              ? `${parentName}/项目报告-${item.taskName.replace(/[/\\:*?"<>|]/g, '_')}.md`
              : `${parentName}/进度报告-${item.taskName.replace(/[/\\:*?"<>|]/g, '_')}.md`;
            zip.file(fileName, content);
          }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setShowDownloadModal(false);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-gray-50 pb-4 flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">工作报告</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/tasks')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            返回任务
          </button>
          <button onClick={() => router.push('/tasks/summary')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium">
            摘要编写
          </button>
          <button onClick={() => { setShowDownloadModal(true); deselectAll(); }} disabled={downloadItems.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            下载报告
          </button>
          <a href="/settings" className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors" title="设置">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><p className="text-gray-500">生成报告中...</p></div>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
      ) : reportStructure.length === 0 ? (
        <div className="text-center py-12"><p className="text-gray-500">无报告内容</p></div>
      ) : (
        <div className="space-y-8">
          {reportStructure.map(cat => (
            <div key={cat.label} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  {cat.label}
                  <span className="text-sm font-normal text-gray-500 ml-2">({cat.parents.length} 个项目)</span>
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {cat.parents.map(({ parent, children, dateRange }) => {
                  const isParentExpanded = expandedParents.has(parent.id);

                  return (
                    <div key={parent.id} className="px-6 py-4">
                      {/* Parent task header - click to expand parent report + child list */}
                      <div
                        className="flex items-start justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded"
                        onClick={() => toggleParent(parent.id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <svg xmlns="http://www.w3.org/2000/svg"
                            className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${isParentExpanded ? 'rotate-90' : ''}`}
                            viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <h3 className="font-medium text-gray-900">{parent.name || '(未命名项目)'}</h3>
                            {parent.description && (
                              <p className="text-sm text-gray-500 mt-0.5">{parent.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                            <span className="text-xs text-gray-400">{dateRange}</span>
                            <span className="text-xs text-gray-400">{children.length} 个子任务</span>
                          </div>
                        </div>
                      </div>

                      {/* Parent expanded: show project report + child list */}
                      {isParentExpanded && (
                        <div className="mt-4 ml-7 space-y-4">
                          {/* Parent project report */}
                          <ReportSection
                            label="项目报告"
                            report={parent.report || null}
                            placeholder="暂无报告，点击 AI 摘要生成"
                            taskId={parent.id}
                            colorClass="border-blue-200 bg-blue-50/50"
                            onReportChanged={handleReportChanged}
                          />

                          {/* Child task list */}
                          {children.length > 0 ? (
                            <div className="space-y-3 ml-4 border-l-2 border-gray-200 pl-4">
                              {children.map(child => {
                                const isChildExpanded = expandedChildren.has(child.id);
                                return (
                                  <div key={child.id}>
                                    {/* Child header - click to expand child report */}
                                    <div
                                      className="flex items-center gap-2 mb-1 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded"
                                      onClick={() => toggleChild(child.id)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg"
                                        className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isChildExpanded ? 'rotate-90' : ''}`}
                                        viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-sm font-medium text-gray-700">{child.name || '(未命名)'}</span>
                                      <span className="text-xs text-gray-400">{format(new Date(child.date), 'MM/dd')}</span>
                                      {child.tags.map(({ tag }) => (
                                        <span key={tag.name} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                          {tag.label}
                                        </span>
                                      ))}
                                      {child.report && <span className="text-xs text-green-500 ml-1">✓</span>}
                                    </div>
                                    {child.description && (
                                      <p className="text-xs text-gray-500 ml-5 mb-1">{child.description}</p>
                                    )}
                                    {/* Child report - shown when child is expanded */}
                                    {isChildExpanded && (
                                      <div className="ml-6">
                                        <ReportSection
                                          label="进度报告"
                                          report={child.report || null}
                                          placeholder="暂无报告，点击 AI 摘要生成"
                                          taskId={child.id}
                                          colorClass="border-gray-200 bg-gray-50"
                                          onReportChanged={handleReportChanged}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm ml-4">暂无子任务</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onDoubleClick={(e) => { if (e.target === e.currentTarget) setShowDownloadModal(false); }}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">选择下载报告</h2>
              <button onClick={() => setShowDownloadModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-800">全选</button>
              <button onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-700">取消全选</button>
              <span className="text-xs text-gray-400 ml-auto">
                已选 {selectedDownloadIds.size} / {downloadItems.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {(() => {
                // Group items by parent for display
                const parentGroups = new Map<string, { parentName: string; items: typeof downloadItems }>();
                for (const item of downloadItems) {
                  if (!parentGroups.has(item.parentId)) {
                    parentGroups.set(item.parentId, { parentName: item.parentName, items: [] });
                  }
                  parentGroups.get(item.parentId)!.items.push(item);
                }
                return Array.from(parentGroups.entries()).map(([parentId, group]) => (
                  <div key={parentId} className="border border-gray-200 rounded-lg p-3">
                    <h3 className="font-medium text-sm text-gray-800 mb-2">{group.parentName}</h3>
                    <div className="space-y-1.5 ml-2">
                      {group.items.map(item => (
                        <label key={item.taskId} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedDownloadIds.has(item.taskId)}
                            onChange={() => toggleDownloadSelect(item.taskId)}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm text-gray-700">
                            {item.isParent ? '📊 项目报告' : '📝 进度报告'} - {item.taskName}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
              <button onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                取消
              </button>
              <button onClick={handleDownloadZip} disabled={downloading || selectedDownloadIds.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {downloading ? '打包中...' : selectedDownloadIds.size === 1 ? '下载报告' : `下载 (${selectedDownloadIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
