export enum UploadState {
  InProgress = 'InProgress',
  Success = 'Success',
  Fail = 'Fail',
}

export type FileUploadState = {
  status: UploadState;
  errorMessage?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawError?: any;
};

export const SystemFolderNames = ['Point clouds', 'SiteOrchestration data'];
