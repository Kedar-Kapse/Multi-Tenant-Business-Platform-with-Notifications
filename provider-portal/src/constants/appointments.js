export const APPOINTMENT_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'LAB_REVIEW', label: 'Lab review' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'TELEHEALTH', label: 'Telehealth' },
];

export const APPOINTMENT_MODES = [
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'TELEHEALTH', label: 'Video visit' },
];

export const APPOINTMENT_STATUS_LABEL = { SCHEDULED: 'Scheduled', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No-show' };
export const APPOINTMENT_STATUS_BADGE = { SCHEDULED: 'teal', COMPLETED: 'success', CANCELLED: 'gray', NO_SHOW: 'warning' };

export const typeLabel = (t) => APPOINTMENT_TYPES.find((x) => x.value === t)?.label || t || 'Appointment';
