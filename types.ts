export enum ProcessStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type ContentType = 'text' | 'formula' | 'chart_description' | 'table';

export interface ContentSegment {
  type: ContentType;
  content: string; // The text, latex, or description
  confidence: number; // 0-100 score
}

export interface AIAnalysisResult {
  title: string;
  language: string;
  // Summary removed as per user request for detailed extraction
  segments: ContentSegment[];
}

export interface FileItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ProcessStatus;
  progress: number; // 0 to 100
  result?: AIAnalysisResult;
  error?: string;
  selected: boolean;
}

// For Gemini API Structured Output
export interface GeminiResponseSchema {
  title: string;
  language: string;
  segments: {
    type: string;
    content: string;
    confidence: number;
  }[];
}