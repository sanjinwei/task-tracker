'use server';

import { prisma } from '@/app/lib/prisma';

/**
 * Gets all task types (categories) from the database
 */
export async function getTaskTypes(): Promise<{ id: string; name: string; label: string; sortOrder?: number }[]> {
  try {
    // Use $queryRaw to get task types ordered by sortOrder field
    const taskTypes = await prisma.$queryRaw`
      SELECT id, name, label, prompt, "sortOrder"
      FROM "TaskType"
      ORDER BY "sortOrder" ASC, label ASC
    `;

    return taskTypes as { id: string; name: string; label: string; prompt: string | null; sortOrder: number }[];
  } catch (error) {
    console.error('Error fetching task types:', error);
    return [];
  }
}

/**
 * Creates a new task type (category)
 * @param label - The display name for the category
 */
export async function createTaskType(label: string, name?: string, prompt?: string): Promise<{
  success: boolean;
  message: string;
  taskType?: { id: string; name: string; label: string; }
}> {
  try {
    const systemName = name?.trim() || label.trim().toUpperCase().replace(/\s+/g, '_');

    const existing = await prisma.taskType.findFirst({ where: { name: systemName } });
    if (existing) {
      return { success: false, message: '此系统名称已被占用' };
    }

    const maxOrderResult = await prisma.taskType.aggregate({
      _max: { sortOrder: true },
    });
    const newOrder = (maxOrderResult._max.sortOrder ?? -1) + 1;

    const taskType = await prisma.taskType.create({
      data: {
        name: systemName,
        label: label.trim(),
        sortOrder: newOrder,
        prompt: prompt || null,
      },
    });

    return { success: true, message: '分类添加成功', taskType };
  } catch (error) {
    console.error('Error creating task type:', error);
    return { success: false, message: '创建分类失败：' + (error instanceof Error ? error.message : String(error)) };
  }
}

/**
 * Updates an existing task type (category)
 * @param id - The ID of the task type to update
 * @param label - The new display name for the category
 */
export async function updateTaskType(id: string, label: string, name: string, prompt?: string): Promise<{
  success: boolean;
  message: string;
  taskType?: { id: string; name: string; label: string; }
}> {
  try {
    const existingTaskType = await prisma.taskType.findFirst({
      where: { name, NOT: { id } }
    });
    if (existingTaskType) {
      return { success: false, message: '此系统名称已被其他分类占用' };
    }

    const taskType = await prisma.taskType.update({
      where: { id },
      data: {
        name,
        label: label.trim(),
        prompt: prompt !== undefined ? prompt || null : undefined,
      }
    });
    
    return {
      success: true,
      message: 'Category updated successfully',
      taskType
    };
  } catch (error) {
    console.error('Error updating task type:', error);
    return {
      success: false,
      message: 'Failed to update category'
    };
  }
}

/**
 * Deletes a task type (category)
 * @param id - The ID of the task type to delete
 */
export async function deleteTaskType(id: string): Promise<{ 
  success: boolean; 
  message: string; 
}> {
  try {
    // Check if there are any tasks using this category
    const tasksUsingCategory = await prisma.task.count({
      where: { typeId: id }
    });
    
    if (tasksUsingCategory > 0) {
      return {
        success: false,
        message: `Cannot delete: ${tasksUsingCategory} task(s) are using this category`
      };
    }
    
    // Delete the task type
    await prisma.taskType.delete({
      where: { id }
    });
    
    return {
      success: true,
      message: 'Category deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting task type:', error);
    return {
      success: false,
      message: 'Failed to delete category'
    };
  }
}

/**
 * Gets all tags from the database
 */
export async function getTags(): Promise<{ id: string; name: string; label: string; }[]> {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: {
        label: 'asc'
      }
    });
    
    // Sort tags in case-insensitive manner
    return tags.sort((a: { label: string }, b: { label: string }) =>
      a.label.toLowerCase().localeCompare(b.label.toLowerCase())
    );
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

/**
 * Creates a new tag
 * @param label - The display name for the tag
 */
export async function createTag(label: string, name?: string): Promise<{
  success: boolean;
  message: string;
  tag?: { id: string; name: string; label: string; }
}> {
  try {
    const systemName = name?.trim() || label.trim().toLowerCase().replace(/\s+/g, '-');

    const existing = await prisma.tag.findFirst({ where: { name: systemName } });
    if (existing) {
      return { success: false, message: '此系统名称已被占用' };
    }

    const tag = await prisma.tag.create({
      data: { name: systemName, label: label.trim() }
    });

    return { success: true, message: '标签添加成功', tag };
  } catch (error) {
    console.error('Error creating tag:', error);
    return { success: false, message: '创建标签失败' };
  }
}

/**
 * Updates an existing tag
 * @param id - The ID of the tag to update
 * @param label - The new display name for the tag
 */
export async function updateTag(id: string, label: string, name: string): Promise<{
  success: boolean;
  message: string;
  tag?: { id: string; name: string; label: string; }
}> {
  try {
    const existing = await prisma.tag.findFirst({
      where: { name, NOT: { id } }
    });
    if (existing) {
      return { success: false, message: '此系统名称已被其他标签占用' };
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: { name, label: label.trim() }
    });
    
    return {
      success: true,
      message: 'Tag updated successfully',
      tag
    };
  } catch (error) {
    console.error('Error updating tag:', error);
    return {
      success: false,
      message: 'Failed to update tag'
    };
  }
}

/**
 * Deletes a tag
 * @param id - The ID of the tag to delete
 */
export async function deleteTag(id: string): Promise<{ 
  success: boolean; 
  message: string; 
}> {
  try {
    // Check if there are any tasks using this tag
    const tasksUsingTag = await prisma.taskTag.count({
      where: { tagId: id }
    });
    
    if (tasksUsingTag > 0) {
      return {
        success: false,
        message: `Cannot delete: ${tasksUsingTag} task(s) are using this tag`
      };
    }
    
    // Delete the tag
    await prisma.tag.delete({
      where: { id }
    });
    
    return {
      success: true,
      message: 'Tag deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting tag:', error);
    return {
      success: false,
      message: 'Failed to delete tag'
    };
  }
}

/**
 * Updates the order of a task type (category)
 * @param id - The ID of the task type to update
 * @param newOrder - The new order value
 */
export async function updateTaskTypeOrder(id: string, newOrder: number): Promise<{ 
  success: boolean; 
  message: string; 
}> {
  try {
    await prisma.taskType.update({
      where: { id },
      data: { sortOrder: newOrder },
    });

    return {
      success: true,
      message: '分类排序更新成功'
    };
  } catch (error) {
    console.error('Error updating category order:', error);
    return {
      success: false,
      message: 'Failed to update category order'
    };
  }
}

/**
 * Gets a setting value by key from the Setting table
 * @param key - The setting key
 */
export async function getSetting(key: string): Promise<{ value: string | null }> {
  try {
    // Use raw query to get the setting
    const result = await prisma.$queryRaw`
      SELECT value FROM "Setting" WHERE key = ${key}
    ` as { value: string }[];
    
    return { 
      value: result.length > 0 ? result[0].value : null
    };
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return { value: null };
  }
}

/**
 * Updates a setting value in the Setting table
 * @param key - The setting key
 * @param value - The setting value
 */
export async function updateSetting(key: string, value: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if the setting exists
    const existingResult = await prisma.$queryRaw`
      SELECT key FROM "Setting" WHERE key = ${key}
    ` as { key: string }[];
    
    if (existingResult.length > 0) {
      // Update existing setting
      await prisma.$executeRaw`
        UPDATE "Setting" SET value = ${value}, "updatedAt" = CURRENT_TIMESTAMP WHERE key = ${key}
      `;
    } else {
      // Insert new setting
      await prisma.$executeRaw`
        INSERT INTO "Setting" (key, value, "updatedAt") VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
      `;
    }
    
    return { 
      success: true, 
      message: 'Setting updated successfully' 
    };
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    return { 
      success: false, 
      message: 'Failed to update setting' 
    };
  }
}

/**
 * Gets the OpenAI API key from the Settings table
 */
export async function getOpenAIApiKey(): Promise<{ value: string | null }> {
  try {
    return await getSetting('openaikey');
  } catch (error) {
    console.error('Error fetching OpenAI API key:', error);
    return { value: null };
  }
}

/**
 * Updates the OpenAI API key in the Settings table
 * @param apiKey - The OpenAI API key
 */
export async function updateOpenAIApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    return await updateSetting('openaikey', apiKey);
  } catch (error) {
    console.error('Error updating OpenAI API key:', error);
    return { success: false, message: 'Failed to update API key' };
  }
}

/**
 * Gets the LM Studio endpoint from the Settings table
 */
export async function getLMStudioEndpoint(): Promise<{ value: string | null }> {
  try {
    return await getSetting('lmstudioendpoint');
  } catch (error) {
    console.error('Error fetching LM Studio endpoint:', error);
    return { value: null };
  }
}

/**
 * Updates the LM Studio endpoint in the Settings table
 * @param endpoint - The LM Studio API endpoint URL
 */
export async function updateLMStudioEndpoint(endpoint: string): Promise<{ success: boolean; message: string }> {
  try {
    return await updateSetting('lmstudioendpoint', endpoint);
  } catch (error) {
    console.error('Error updating LM Studio endpoint:', error);
    return { success: false, message: 'Failed to update LM Studio endpoint' };
  }
}

/**
 * Gets the OpenAI API endpoint from the Settings table
 */
export async function getOpenAIEndpoint(): Promise<{ value: string | null }> {
  try {
    return await getSetting('openapiendpoint');
  } catch (error) {
    console.error('Error fetching OpenAI API endpoint:', error);
    return { value: null };
  }
}

/**
 * Updates the OpenAI API endpoint in the Settings table
 * @param endpoint - The OpenAI API endpoint URL
 */
export async function updateOpenAIEndpoint(endpoint: string): Promise<{ success: boolean; message: string }> {
  try {
    return await updateSetting('openapiendpoint', endpoint);
  } catch (error) {
    console.error('Error updating OpenAI API endpoint:', error);
    return { success: false, message: 'Failed to update OpenAI API endpoint' };
  }
}

/**
 * Gets the DeepSeek API key from the Settings table
 */
export async function getDeepSeekApiKey(): Promise<{ value: string | null }> {
  try {
    return await getSetting('deepseekapikey');
  } catch (error) {
    console.error('Error fetching DeepSeek API key:', error);
    return { value: null };
  }
}

/**
 * Updates the DeepSeek API key in the Settings table
 * @param apiKey - The DeepSeek API key
 */
export async function updateDeepSeekApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    return await updateSetting('deepseekapikey', apiKey);
  } catch (error) {
    console.error('Error updating DeepSeek API key:', error);
    return { success: false, message: 'Failed to update DeepSeek API key' };
  }
}

/**
 * Gets the DeepSeek API endpoint from the Settings table
 */
export async function getDeepSeekEndpoint(): Promise<{ value: string | null }> {
  try {
    return await getSetting('deepseekendpoint');
  } catch (error) {
    console.error('Error fetching DeepSeek API endpoint:', error);
    return { value: null };
  }
}

/**
 * Updates the DeepSeek API endpoint in the Settings table
 * @param endpoint - The DeepSeek API endpoint URL
 */
export async function updateDeepSeekEndpoint(endpoint: string): Promise<{ success: boolean; message: string }> {
  try {
    return await updateSetting('deepseekendpoint', endpoint);
  } catch (error) {
    console.error('Error updating DeepSeek endpoint:', error);
    return { success: false, message: 'Failed to update DeepSeek API endpoint' };
  }
}
