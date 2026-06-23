interface Task {
  id: string;
  name: string | null;
  description: string | null;
  parentId: string | null;
  children?: TaskWithType[];
  date: Date;
  link: string | null;
  report: string | null;
  typeId: string | null;
  createdAt: Date;
}

export interface TaskWithType extends Task {
  type: {
    name: string;
    label: string;
    sortOrder?: number;
  } | null;
  tags: {
    tag: {
      name: string;
      label: string;
    };
  }[];
}

import { getOrderedTaskTypes } from './actions';

/**
 * Gets the display text for a task, preferring name over description
 */
function getTaskDisplayText(task: Task): string {
  return task.name || task.description || '(No details)';
}

/**
 * Groups tasks by type, ensuring that types are ordered correctly
 */
async function groupTasksByTypeOrdered(tasks: TaskWithType[]) {
  // Get ordered task types
  const orderedTypes = await getOrderedTaskTypes();

  // Create a map of type name to order for quick lookups
  const typeOrderMap = new Map<string, number>();
  orderedTypes.forEach(type => {
    typeOrderMap.set(type.name, type.sortOrder);
  });

  // Separate parents and children
  const childMap = new Map<string, TaskWithType[]>();
  const topLevelTasks: TaskWithType[] = [];

  for (const task of tasks) {
    if (task.parentId) {
      if (!childMap.has(task.parentId)) {
        childMap.set(task.parentId, []);
      }
      childMap.get(task.parentId)!.push(task);
    } else {
      // Attach children from childMap if they were already processed
      const children = childMap.get(task.id) || [];
      topLevelTasks.push({ ...task, children });
    }
  }

  // Attach children to parents that might have been fetched before their children
  for (const task of topLevelTasks) {
    if (!task.children || task.children.length === 0) {
      const children = childMap.get(task.id);
      if (children) {
        (task as TaskWithType).children = children;
      }
    }
  }

  // Group tasks by type
  const groupedTasks = topLevelTasks.reduce((acc, task) => {
    // Skip tasks with no type
    if (!task.type) return acc;

    const typeName = task.type.name;
    if (!acc[typeName]) {
      acc[typeName] = {
        label: task.type.label,
        tasks: [],
        sortOrder: typeOrderMap.get(typeName) ?? 999
      };
    }
    acc[typeName].tasks.push(task);
    return acc;
  }, {} as Record<string, { label: string; tasks: TaskWithType[]; sortOrder: number }>);

  return groupedTasks;
}

/** Render a single task as an HTML list item with nested children */
function renderTaskItemHTML(task: TaskWithType): string {
  const linkHtml = task.link ? ` <a href="${task.link}">#</a>` : '';
  const displayText = getTaskDisplayText(task);

  if (task.children && task.children.length > 0) {
    const sortedChildren = [...task.children].sort((a, b) => a.date.getTime() - b.date.getTime());
    const childrenHtml = sortedChildren.map(child => {
      const childText = getTaskDisplayText(child);
      const childLink = child.link ? ` <a href="${child.link}">#</a>` : '';
      return `<li>${childText}${childLink}</li>`;
    }).join('');
    return `<li>${displayText}${linkHtml}<ul>${childrenHtml}</ul></li>`;
  }

  return `<li>${displayText}${linkHtml}</li>`;
}

export async function generateReportHTML(tasks: TaskWithType[]): Promise<string> {
  const groupedTasks = await groupTasksByTypeOrdered(tasks);
  let html = '';

  // Sort entries by their sortOrder field
  const taskTypeEntries = Object.entries(groupedTasks)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder);

  // Add each task type section
  for (const [typeName, { label, tasks: originalTasks }] of taskTypeEntries) {
    if (originalTasks.length > 0) {
      html += `<h3>${label}</h3>`;

      // Special handling for MANUAL_REVIEW_WORK type (use stable system name)
      if (typeName === 'MANUAL_REVIEW_WORK') {
        // Filter Slack ping tasks
        const slackPingTasks = originalTasks.filter(task => 
          task.tags.some(tag => tag.tag.name === 'slack-ping')
        );
        
        // Filter out Slack ping tasks for the regular list
        const filteredTasks = originalTasks.filter(task => 
          !task.tags.some(tag => tag.tag.name === 'slack-ping')
        );
        
        // Sort tasks by date in ascending order
        const sortedTasks = filteredTasks.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Create a bulleted list for tasks
        html += `<ul>`;
        
        // Add Slack ping summary as the first bullet point if there are any
        if (slackPingTasks.length > 0) {
          html += `<li>${slackPingTasks.length} Slack ${slackPingTasks.length === 1 ? 'ping' : 'pings'} answered</li>`;
        }
        
        // Add the rest of the tasks with children nested
        for (const task of sortedTasks) {
          html += renderTaskItemHTML(task);
        }

        html += `</ul>`;
      } else {
        // For non-MANUAL_REVIEW_WORK types, just show all tasks
        // Sort tasks by date in ascending order
        const sortedTasks = originalTasks.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Create a bulleted list for tasks
        html += `<ul>`;
        for (const task of sortedTasks) {
          html += renderTaskItemHTML(task);
        }
        html += `</ul>`;
      }
    }
  }

  return html;
}

/** Render a single task as a Markdown list item with nested children */
function renderTaskItemMarkdown(task: TaskWithType, indent: number = 0): string {
  const link = task.link ? ` [#](${task.link})` : '';
  const displayText = getTaskDisplayText(task);
  const prefix = '  '.repeat(indent);

  if (task.children && task.children.length > 0) {
    const sortedChildren = [...task.children].sort((a, b) => a.date.getTime() - b.date.getTime());
    const childrenMd = sortedChildren.map(child => renderTaskItemMarkdown(child, indent + 1)).join('');
    return `${prefix}- ${displayText}${link}\n${childrenMd}`;
  }

  return `${prefix}- ${displayText}${link}\n`;
}

export async function generateReportMarkdown(tasks: TaskWithType[]): Promise<string> {
  const groupedTasks = await groupTasksByTypeOrdered(tasks);
  let markdown = '';

  // Sort entries by their sortOrder field
  const taskTypeEntries = Object.entries(groupedTasks)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder);

  // Add each task type section
  for (const [typeName, { label, tasks: originalTasks }] of taskTypeEntries) {
    if (originalTasks.length > 0) {
      markdown += `### ${label}\n\n`;

      // Special handling for MANUAL_REVIEW_WORK type (use stable system name)
      if (typeName === 'MANUAL_REVIEW_WORK') {
        // Filter Slack ping tasks
        const slackPingTasks = originalTasks.filter(task => 
          task.tags.some(tag => tag.tag.name === 'slack-ping')
        );
        
        // Filter out Slack ping tasks for the regular list
        const filteredTasks = originalTasks.filter(task => 
          !task.tags.some(tag => tag.tag.name === 'slack-ping')
        );
        
        // Sort tasks by date in ascending order
        const sortedTasks = filteredTasks.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Add Slack ping summary as the first bullet point if there are any
        if (slackPingTasks.length > 0) {
          markdown += `- ${slackPingTasks.length} Slack ${slackPingTasks.length === 1 ? 'ping' : 'pings'} answered\n`;
        }
        
        // Add the rest of the tasks with children nested
        for (const task of sortedTasks) {
          markdown += renderTaskItemMarkdown(task);
        }

        markdown += '\n';
      } else {
        // For non-MANUAL_REVIEW_WORK types, just show all tasks
        // Sort tasks by date in ascending order
        const sortedTasks = originalTasks.sort((a, b) => a.date.getTime() - b.date.getTime());

        for (const task of sortedTasks) {
          markdown += renderTaskItemMarkdown(task);
        }
        
        markdown += '\n';
      }
    }
  }

  return markdown;
} 