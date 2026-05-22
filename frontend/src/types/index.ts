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
  narration_text: string | null;
  has_audio: boolean;
  audio_duration: number | null;
  left_padding: number;
  right_padding: number;
  created_at: string;
}

export interface RecordingDetail extends Recording {
  screenshots: Screenshot[];
}
