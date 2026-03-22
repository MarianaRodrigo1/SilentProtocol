export const ERROR_MESSAGES = {
  AGENT_NOT_FOUND: 'Agent not found.',
  AGENT_ENROLLMENT_INCOMPLETE: 'Agent must accept terms and confirm biometric checkpoint.',
  AGENT_CODENAME_INVALID: 'Codename must have at least 3 non-space characters.',
  LOCATION_OWNERSHIP_INVALID: 'Provided location_id does not belong to the specified agent.',
  MEDIA_FILE_REQUIRED: 'Media file is required.',
  MEDIA_FILE_TYPE_INVALID: 'Only image and video files are allowed.',
  BATCH_EMPTY: (label: string) => `${label} batch cannot be empty.`,
  BATCH_LIMIT_EXCEEDED: (label: string, max: number) =>
    `${label} batch cannot exceed ${max} items.`,
} as const;
