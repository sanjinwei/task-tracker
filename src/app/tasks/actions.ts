'use server';

// actions.ts
import { prisma } from '@/app/lib/prisma';

export async function getAllTaskTypes() {
  // Get all task types ordered by sortOrder
  return await prisma.taskType.findMany({
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Gets all task types ordered by their sortOrder field and then by label
 */
export async function getOrderedTaskTypes() {
  try {
    // Use $queryRaw to get task types ordered by sortOrder field
    const taskTypes = await prisma.$queryRaw`
      SELECT id, name, label, "sortOrder" 
      FROM "TaskType" 
      ORDER BY "sortOrder" ASC, label ASC
    `;
    
    return taskTypes as { id: string; name: string; label: string; sortOrder: number }[];
  } catch (error) {
    console.error('Error fetching ordered task types:', error);
    return [];
  }
}

export async function getAllTags() {
  return await prisma.tag.findMany({
    select: { name: true, label: true }
  });
}

export async function addTask({ name, description, type, tags, date, link, parentId }: {
  name?: string;
  description?: string;
  type?: string;
  tags?: string[];
  date: string;
  link?: string;
  parentId?: string;
}) {
  let taskType = null;
  if (type) {
    taskType = await prisma.taskType.findUnique({
      where: { name: type }
    });

    if (!taskType) throw new Error('Invalid task type');
  }

  let allTagIds: string[] = [];
  if (tags && tags.length > 0) {
    const existingTags = await prisma.tag.findMany({
      where: { name: { in: tags } }
    });

    const newTags = tags.filter(
      tag => !existingTags.find((et: { name: string }) => et.name === tag)
    ).map(tag => ({
      name: tag,
      label: tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const createdTags = await prisma.$transaction(
      newTags.map(tag => prisma.tag.create({ data: tag }))
    );

    allTagIds = [
      ...existingTags.map((t: { id: string }) => t.id),
      ...createdTags.map((t: { id: string }) => t.id)
    ];
  }

  return await prisma.task.create({
    data: {
      name,
      description,
      typeId: taskType?.id,
      parentId: parentId || null,
      date: new Date(date),
      link,
      tags: allTagIds.length > 0 ? {
        create: allTagIds.map(tagId => ({
          tag: { connect: { id: tagId } }
        }))
      } : undefined
    }
  });
}

export async function fetchTasks(filters: {
  type?: string;
  tag?: string;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const { type, tag, startDate, endDate } = filters;
  
  // Create a new end date that includes the entire day
  const adjustedEndDate = endDate ? new Date(endDate) : undefined;
  if (adjustedEndDate) {
    // Set to end of day (23:59:59.999)
    adjustedEndDate.setHours(23, 59, 59, 999);
  }
  
  return await prisma.task.findMany({
    where: {
      ...(type && { type: { name: type } }),
      ...(tag && { tags: { some: { tag: { name: tag } } } }),
      ...(startDate && adjustedEndDate && {
        date: {
          gte: startDate,
          lte: adjustedEndDate,
        },
      }),
      ...(startDate && !adjustedEndDate && {
        date: {
          gte: startDate,
        },
      }),
      ...(!startDate && adjustedEndDate && {
        date: {
          lte: adjustedEndDate,
        },
      }),
    },
    include: {
      type: {
        select: {
          name: true,
          label: true,
        },
      },
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
      children: {
        include: {
          type: {
            select: { name: true, label: true },
          },
          tags: {
            include: {
              tag: {
                select: { name: true, label: true },
              },
            },
          },
          reports: {
            select: { id: true, content: true, createdAt: true, updatedAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { date: 'asc' },
      },
      tags: {
        include: {
          tag: {
            select: {
              name: true,
              label: true,
            },
          },
        },
      },
      reports: {
        select: { id: true, content: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });
}

export async function updateTask({
  id,
  name,
  description,
  type,
  tags,
  date,
  link,
  parentId,
}: {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  tags?: string[];
  date: string;
  link?: string;
  parentId?: string;
}) {
  let taskType = null;
  if (type) {
    taskType = await prisma.taskType.findUnique({
      where: { name: type }
    });
    if (!taskType) throw new Error('Invalid task type');
  }

  // Prevent a task from being its own parent
  if (parentId && parentId === id) {
    throw new Error('A task cannot be its own parent');
  }

  // Process tags
  const tagsList = tags || [];
  let allTagIds: string[] = [];
  if (tagsList.length > 0) {
    const existingTags = await prisma.tag.findMany({
      where: { name: { in: tagsList } }
    });

    // Create any new tags that don't exist
    const newTags = tagsList.filter(
      tag => !existingTags.find((et: { name: string }) => et.name === tag)
    ).map(tag => ({
      name: tag,
      label: tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const createdTags = await prisma.$transaction(
      newTags.map(tag => prisma.tag.create({ data: tag }))
    );

    allTagIds = [
      ...existingTags.map((t: { id: string }) => t.id),
      ...createdTags.map((t: { id: string }) => t.id)
    ];
  }

  // Delete existing task-tag relationships
  await prisma.taskTag.deleteMany({
    where: { taskId: id }
  });

  // Build update data
  const updateData: Record<string, unknown> = {
    date: new Date(date),
  };
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  updateData.typeId = taskType?.id ?? null;
  if (parentId !== undefined) updateData.parentId = parentId || null;
  if (link !== undefined) updateData.link = link;
  if (allTagIds.length > 0) {
    updateData.tags = {
      create: allTagIds.map(tagId => ({
        tag: { connect: { id: tagId } }
      }))
    };
  }

  // Update the task
  return await prisma.task.update({
    where: { id },
    data: updateData
  });
}

/**
 * Toggle task completion status with validation:
 * - Parent task: requires at least 1 report
 * - Child task: requires description or at least 1 report
 */
export async function toggleTaskComplete(id: string): Promise<{ success: boolean; message: string }> {
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      parentId: true,
      description: true,
      reports: { select: { id: true } },
    },
  });
  if (!task) return { success: false, message: '任务不存在' };

  const hasReports = task.reports.length > 0;
  const hasDescription = task.description && task.description.trim() !== '';

  // Check if it's currently completed → allow un-completing without checks
  const current = await prisma.task.findUnique({ where: { id }, select: { completed: true } });
  if (!current?.completed) {
    if (task.parentId) {
      // Child task: needs description or at least one report
      if (!hasDescription && !hasReports) {
        return { success: false, message: '子任务必须填写描述或至少有一份报告才能标记为完成' };
      }
    } else {
      // Parent task: needs at least one report
      if (!hasReports) {
        return { success: false, message: '父任务必须至少有一份报告才能标记为完成，请先撰写工作日志' };
      }
    }
  }

  await prisma.task.update({
    where: { id },
    data: { completed: !current?.completed },
  });
  return { success: true, message: current?.completed ? '已取消完成标记' : '任务已完成' };
}

export async function deleteTask(id: string) {
  // Find all child tasks
  const children = await prisma.task.findMany({
    where: { parentId: id },
    select: { id: true },
  });
  const childIds = children.map(c => c.id);

  // Delete TaskTag rows for all children
  if (childIds.length > 0) {
    await prisma.taskTag.deleteMany({
      where: { taskId: { in: childIds } }
    });
  }

  // Delete all children
  await prisma.task.deleteMany({
    where: { parentId: id }
  });

  // Delete parent's TaskTag rows
  await prisma.taskTag.deleteMany({
    where: { taskId: id }
  });

  // Delete the parent task
  return await prisma.task.delete({
    where: { id }
  });
}

/**
 * Returns all top-level tasks (parentId IS NULL) for the parent task dropdown
 */
export async function fetchParentTaskOptions(): Promise<{ id: string; name: string | null }[]> {
  return await prisma.task.findMany({
    where: { parentId: null },
    select: { id: true, name: true },
    orderBy: { date: 'desc' },
  });
}

// ---- Report CRUD ----

export async function getReports(taskId: string) {
  return await prisma.report.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createReport(taskId: string, content: string) {
  return await prisma.report.create({
    data: { taskId, content },
  });
}

export async function updateReport(reportId: string, content: string) {
  return await prisma.report.update({
    where: { id: reportId },
    data: { content },
  });
}

export async function deleteReport(reportId: string) {
  await prisma.report.delete({
    where: { id: reportId },
  });
}

/**
 * @deprecated — use createReport instead. Kept for backward compat.
 */
export async function saveTaskReport(taskId: string, report: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.report.create({
      data: { taskId, content: report },
    });
    return { success: true, message: '报告保存成功' };
  } catch (error) {
    console.error('Error saving task report:', error);
    return { success: false, message: '报告保存失败' };
  }
}

/**
 * Get a task by ID with full details including parent, children, and type/tags
 */
export async function getTaskById(taskId: string) {
  return await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      type: { select: { name: true, label: true, prompt: true } },
      tags: { include: { tag: { select: { name: true, label: true } } } },
      parent: { select: { id: true, name: true, description: true } },
      children: {
        include: {
          type: { select: { name: true, label: true, prompt: true } },
          tags: { include: { tag: { select: { name: true, label: true } } } },
          reports: {
            select: { id: true, content: true, createdAt: true, updatedAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { date: 'asc' },
      },
      reports: {
        select: { id: true, content: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

/**
 * Get related tasks for a task:
 * - If it's a child task: return its siblings (other children of the same parent)
 * - If it's a parent task: return its children
 */
export async function getRelatedTasks(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { parentId: true },
  });
  if (!task) return [];

  if (task.parentId) {
    // Child task: return siblings
    return await prisma.task.findMany({
      where: { parentId: task.parentId, id: { not: taskId } },
      select: {
        id: true, name: true, description: true, report: true, date: true,
        link: true, parentId: true, typeId: true, createdAt: true,
        type: { select: { name: true, label: true, prompt: true } },
        tags: { include: { tag: { select: { name: true, label: true } } } },
        reports: {
          select: { id: true, content: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { date: 'asc' },
    });
  } else {
    // Parent task: return children
    return await prisma.task.findMany({
      where: { parentId: taskId },
      select: {
        id: true, name: true, description: true, report: true, date: true,
        link: true, parentId: true, typeId: true, createdAt: true,
        type: { select: { name: true, label: true, prompt: true } },
        tags: { include: { tag: { select: { name: true, label: true } } } },
        reports: {
          select: { id: true, content: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { date: 'asc' },
    });
  }
}

/**
 * Get all parent tasks for the task picker
 */
export async function getAllParentTasksWithChildren() {
  return await prisma.task.findMany({
    where: { parentId: null },
    select: {
      id: true,
      name: true,
      children: {
        select: { id: true, name: true, date: true },
        orderBy: { date: 'asc' },
      },
    },
    orderBy: { date: 'desc' },
  });
}

