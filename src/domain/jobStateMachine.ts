export type JobStatus =
  | 'REQUEST_CREATED'
  | 'QUOTES_RECEIVED'
  | 'PROFESSIONAL_SELECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REVIEW_PENDING'
  | 'CLOSED'
  | 'CANCELLED';

export type JobAction =
  | 'SUBMIT_QUOTE'
  | 'ACCEPT_QUOTE'
  | 'START_JOB'
  | 'COMPLETE_JOB'
  | 'SUBMIT_REVIEW'
  | 'CLOSE_JOB'
  | 'CANCEL_JOB';

const transitions: Record<JobAction, { from: JobStatus[]; to: JobStatus }> = {
  SUBMIT_QUOTE: {
    from: ['REQUEST_CREATED', 'QUOTES_RECEIVED'],
    to: 'QUOTES_RECEIVED'
  },
  ACCEPT_QUOTE: {
    from: ['REQUEST_CREATED', 'QUOTES_RECEIVED'],
    to: 'PROFESSIONAL_SELECTED'
  },
  START_JOB: {
    from: ['PROFESSIONAL_SELECTED'],
    to: 'IN_PROGRESS'
  },
  COMPLETE_JOB: {
    from: ['IN_PROGRESS'],
    to: 'COMPLETED'
  },
  SUBMIT_REVIEW: {
    from: ['COMPLETED'],
    to: 'REVIEW_PENDING'
  },
  CLOSE_JOB: {
    from: ['REVIEW_PENDING'],
    to: 'CLOSED'
  },
  CANCEL_JOB: {
    from: ['REQUEST_CREATED', 'QUOTES_RECEIVED', 'PROFESSIONAL_SELECTED'],
    to: 'CANCELLED'
  }
};

export function canTransition(from: JobStatus, action: JobAction): boolean {
  return transitions[action].from.includes(from);
}

export function transitionJob(from: JobStatus, action: JobAction): JobStatus {
  const transition = transitions[action];
  if (!transition.from.includes(from)) {
    throw new Error(`INVALID_JOB_TRANSITION:${from}:${action}`);
  }
  return transition.to;
}

export function getAllowedJobActions(status: JobStatus): JobAction[] {
  return (Object.keys(transitions) as JobAction[]).filter((action) =>
    transitions[action].from.includes(status)
  );
}

export function getJobTransitionMap(): Readonly<Record<JobAction, { from: readonly JobStatus[]; to: JobStatus }>> {
  return transitions;
}
