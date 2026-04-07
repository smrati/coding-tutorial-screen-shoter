export interface Recording {
  id: number;
  title: string;
  screenshot_count: number;
  created_at: string;
  updated_at: string;
}

export interface Screenshot {
  id: number;
  slide_number: number;
  code_snapshot: string | null;
  created_at: string;
}

export interface RecordingDetail extends Recording {
  screenshots: Screenshot[];
}
