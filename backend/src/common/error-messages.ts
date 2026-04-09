export const ERROR_MESSAGES = {
  AGENT_NOT_FOUND: 'Agent not found.',
  AGENT_ENROLLMENT_INCOMPLETE: 'Agent must accept mission terms before deployment.',
  AGENT_CODENAME_INVALID: 'Codename must have at least 3 non-space characters.',
  MEDIA_FILE_REQUIRED: 'Media file is required.',
  MEDIA_FILE_TYPE_INVALID: 'Only image files are allowed.',
  BATCH_EMPTY: (label: string) => `${label} batch cannot be empty.`,
  BATCH_LIMIT_EXCEEDED: (label: string, max: number) =>
    `${label} batch cannot exceed ${max} items.`,
} as const;
