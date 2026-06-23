import { PrismaClient } from '@prisma/client';
import { addDays } from "date-fns";

const prisma = new PrismaClient();

// Helper: Get last Friday from any date
function getLastFriday(date: Date): Date {
  const day = date.getDay();
  const diff = (day >= 5) ? day - 5 : day + 2;
  const lastFriday = new Date(date);
  lastFriday.setDate(date.getDate() - diff);
  lastFriday.setHours(0, 0, 0, 0);
  return lastFriday;
}

async function main() {
  try {
    // Reset database - handle foreign key constraints
    // Delete in proper order to respect relations
    await prisma.taskTag.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.taskType.deleteMany({});
    
    // Seed task types with alphabetical ordering
    const taskTypes = [
      { name: 'COMMUNICATION', label: '沟通协作', sortOrder: 0 },
      { name: 'DOCUMENTATION', label: '文档编写', sortOrder: 1 },
      { name: 'LEARNING', label: '学习成长', sortOrder: 2 },
      { name: 'MANUAL_REVIEW_WORK', label: '人工审核工作', sortOrder: 3 },
      { name: 'OTHERS', label: '其他', sortOrder: 4 },
      { name: 'PROJECT', label: '项目开发', sortOrder: 5 },
      { name: 'SQUAD', label: '合规小组工作', sortOrder: 6 }
    ];
    
    // Insert each task type individually
    for (const taskType of taskTypes) {
      await prisma.taskType.create({
        data: taskType
      });
    }
    
    // Seed tags
    await prisma.tag.createMany({
      data: [
        { name: 'slack-ping', label: 'Slack 消息' },
        { name: 'ticket', label: '工单' },
        { name: 'gut-check', label: '直觉检查' },
        { name: 'p2-post', label: 'P2 帖子' },
        { name: 'p2-discussion', label: 'P2 讨论' },
        { name: 'slack-discussion', label: 'Slack 讨论' },
        { name: 'team-call', label: '团队会议' },
        { name: '1-1', label: '一对一沟通' },
        { name: 'internal-tools', label: '内部工具' },
        { name: 'workflow-improvement', label: '流程优化' },
        { name: 'buddying', label: '伙伴互助' },
        { name: 'tool-exploration', label: '工具探索' },
        { name: 'deep-dive', label: '深度研究' },
        { name: 'shared-insight', label: '分享见解' },
        { name: 'fraud-pattern', label: '欺诈模式' },
        { name: 'webinar', label: '网络研讨会' },
        { name: 'e-learning', label: '在线学习' },
        { name: 'coaching', label: '辅导培训' },
        { name: 'reading', label: '阅读' },
        { name: 'fu-update', label: '欺诈小组大学更新' },
        { name: 'survey', label: '问卷调查' },
        { name: 'admin', label: '行政事务' },
        { name: 'hr-feedback', label: 'HR 反馈' },
        { name: 'ai', label: 'AI' },
        { name: 'data-analysis', label: '数据分析' },
        { name: 'meetup', label: '线下聚会' },
        { name: 'event', label: '活动' },
        { name: 'other', label: '其他' }
      ]
    });

 
  } catch (e) {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
