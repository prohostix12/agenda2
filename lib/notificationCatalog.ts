export type NotificationChannel = 'whatsapp' | 'email';

export interface NotificationCatalogEntry {
  key: string;
  label: string;
  description: string;
  trigger: string;
  channels: NotificationChannel[];
}

export const NOTIFICATION_CATALOG: NotificationCatalogEntry[] = [
  {
    key: 'daily_reminder_assignee',
    label: 'Daily Reminder — Assignee',
    description: 'Meeting name, task, deadline, status, and a "Mark as Done" link.',
    trigger: 'Every day (cron) while the task is open.',
    channels: ['whatsapp', 'email'],
  },
  {
    key: 'daily_reminder_admin',
    label: 'Daily Reminder — Meeting Admin',
    description: 'Same reminder, sent to the meeting admin so they can track it too.',
    trigger: 'Daily, once the task is ≤3 days from its deadline.',
    channels: ['whatsapp', 'email'],
  },
  {
    key: 'overdue_extend_assignee',
    label: 'Overdue: Submit / Extend — Assignee',
    description: 'Prompts the assignee to either submit the task done or request a deadline extension.',
    trigger: 'Daily, once the task is due or overdue. (Email version is the Daily Reminder email above, with both buttons shown.)',
    channels: ['whatsapp'],
  },
  {
    key: 'extension_requested_admin',
    label: 'Extension Requested — Meeting Admin',
    description: 'Notifies the admin that an extension was requested, with a link to approve/reject it.',
    trigger: 'When an assignee submits the extend-request form.',
    channels: ['whatsapp', 'email'],
  },
  {
    key: 'task_submitted_admin',
    label: 'Task Submitted — Meeting Admin',
    description: 'Notifies the admin a task was marked done, including the submitter\'s title/notes/Drive links.',
    trigger: 'When an assignee submits the submit-task form.',
    channels: ['whatsapp', 'email'],
  },
  {
    key: 'extension_approved_assignee',
    label: 'Extension Approved — Assignee',
    description: 'Tells the assignee their extension was approved and shows the new deadline.',
    trigger: 'When the meeting admin approves an extension request.',
    channels: ['whatsapp', 'email'],
  },
];
