/**
 * Task interface representing a task in the system
 */
export interface Task {
  id: string;
  name: string | null;
  description: string | null;
  parentId: string | null;
  children?: Task[];
  date: Date;
  link: string | null;
  type: {
    name: string;
    label: string;
  };
  tags: {
    tag: {
      name: string;
      label: string;
    };
  }[];
} 