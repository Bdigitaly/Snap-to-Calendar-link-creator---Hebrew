
export type RecurrenceFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface EventDetails {
  title: string;
  startDate: string; // ISO String
  endDate: string; // ISO String
  location: string;
  description: string;
  allDay?: boolean;
  recurrence: RecurrenceFrequency;
  recurrenceInterval?: number;
  recurrenceEnds?: 'NEVER' | 'ON' | 'AFTER';
  recurrenceCount?: number;
  recurrenceUntil?: string; // ISO String
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

export enum CalendarAction {
  TEMPLATE = 'TEMPLATE',
}
