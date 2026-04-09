import { t } from '../../../i18n';

export type TaskType = 'location' | 'camera' | 'contacts' | 'bluetooth';

export interface TaskCompleteModalState {
  visible: boolean;
  taskNumber: number;
}

export type MissionLinkQuality = 'ok' | 'checking' | 'no_network' | 'no_backend';

export interface Task {
  id: TaskType;
  number: number;
  title: string;
  objective: string;
  instructions: string;
  completed: boolean;
}

export function createInitialTasks(): Task[] {
  return [
    {
      id: 'location',
      number: 1,
      title: t.mission.task1Title,
      objective: t.mission.task1Objective,
      instructions: t.mission.task1Instructions,
      completed: false,
    },
    {
      id: 'camera',
      number: 2,
      title: t.mission.task2Title,
      objective: t.mission.task2Objective,
      instructions: t.mission.task2Instructions,
      completed: false,
    },
    {
      id: 'contacts',
      number: 3,
      title: t.mission.task3Title,
      objective: t.mission.task3Objective,
      instructions: t.mission.task3Instructions,
      completed: false,
    },
    {
      id: 'bluetooth',
      number: 4,
      title: t.mission.task4Title,
      objective: t.mission.task4Objective,
      instructions: t.mission.task4Instructions,
      completed: false,
    },
  ];
}
