export type Violation = {
  file: string;
  skill: string;
  rule: string;
  fix: string;
  pattern?: string;
  filePattern?: string;
};

export type LearnedRule = {
  pattern: string;
  filePattern: string;
  message: string;
  skill: string;
  createdAt: string;
  llmOnly?: boolean;
};

export type DiffFile = { path: string; content: string };
