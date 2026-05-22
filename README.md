# CodeShot

A web application for creating YouTube-ready coding tutorials. Write content in a Markdown editor with a fixed 16:9 live preview, capture slides at 1920x1080 with `Ctrl+S`, add TTS narration per slide, paste or upload images, and export them as a ZIP of numbered PNGs or an MP4 video with narrated audio.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4 |
| Editor | Markdown Editor (via `@uiw/react-md-editor` + `rehype-highlight`) |
| Screenshot | html2canvas (fixed 1920x1080 output) |
| TTS | PocketTTS (voice cloning from a single audio sample) |
| Audio | scipy + ffmpeg (WAV generation, MP3 encoding at 128kbps) |
| Export | JSZip + file-saver, ffmpeg (server-side H.264 video with AAC audio) |
| Backend | FastAPI, SQLAlchemy 2 (async), Pydantic v2 |
| Database | SQLite (via aiosqlite) |
| Package Manager | npm (frontend), uv (backend) |

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.12
- **uv** — install via `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **ffmpeg** — required for MP4 video export and audio conversion

## Setup

### Backend

```bash
cd backend
uv sync
```

### Frontend

```bash
cd frontend
npm install
```

### Voice Sample

Place a voice sample MP3 file at `backend/data/voice-sample.mp3`. This file is used by PocketTTS for voice cloning. You can configure the path via the `VOICE_SAMPLE_PATH` environment variable.

## Running the Application

From the project root, run both servers with a single command:

```bash
./dev.sh
```

Ports are auto-detected — if the defaults (8000/5173) are busy, the next available port is used automatically. The actual URLs are printed on startup.

Or run individually if needed:

**Backend** (default port 8000):

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

**Frontend** (default port 5173):

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI).

## How It Works

### User Flow

1. **Home** — Click "Create New Recording" and enter a title
2. **Editor** — Write Markdown content in a split-pane editor. The right half is a fixed 16:9 (1920x1080) live preview with YouTube-optimized font sizes. Content that overflows the preview is clipped — what you see is exactly what gets captured
3. **Images** — Paste images directly into the editor or click the image toolbar button to pick a file. Images are uploaded to the server and inserted as clean URLs (no base64 clutter)
4. **Capture** — Press `Ctrl+S` (`Cmd+S` on Mac) or click "Screenshot" to capture the preview pane as a 1920x1080 PNG slide
5. **Slides** — Captured screenshots appear as numbered thumbnails in the right panel with selection checkboxes, duration controls, and narration support
6. **Narration** — Open the narration panel on any slide, enter text (with an expand-to-modal option for comfortable editing), and click "Generate" to create TTS audio using a cloned voice
7. **Preview** — Click any slide to open a full-screen preview modal with arrow-key navigation; play audio preview on narrated slides
8. **Export** — Export selected slides as a ZIP (`1.png`, `2.png`, ...) or an MP4 video (1920x1080, H.264) with narrated audio and configurable padding
9. **Manage** — View, edit titles, or delete recordings from the Recordings list page

### Screenshot Capture

The editor preview pane is constrained to a fixed 16:9 aspect ratio. When the user triggers a capture, `html2canvas` renders the preview pane to a canvas at exactly **1920x1080 pixels** (no scaling — fixed width/height). The canvas is converted to a PNG blob and uploaded to the backend via a multipart request along with the current Markdown source as `code_snapshot`. The backend stores the image as a BLOB in SQLite and assigns it a sequential slide number.

Preview font sizes are optimized for YouTube readability:
- Base text: 18px
- H1: 36px, H2: 27px, H3: 22.5px
- Code blocks: 15px monospace

### Image Handling

Images can be added to the editor in two ways:
1. **Paste** — Paste an image from the clipboard. It uploads to the server and inserts a clean `![image](/api/v1/images/{uuid}.png)` URL
2. **File picker** — Click the image toolbar button to pick a file from disk. Same upload-and-URL flow

Images are stored as files in `backend/data/images/` and served via a dedicated endpoint. The editor stays clean — no base64 inline data.

### TTS Narration

Each slide can have narration text. When the user clicks "Generate", PocketTTS converts the text to speech using a voice cloned from a global voice sample (`backend/data/voice-sample.mp3`). The TTS model is lazy-loaded on first use. The generated audio is converted from WAV to MP3 (128kbps) via ffmpeg and stored as a BLOB. The audio duration is calculated and stored for use in video export timing.

- **Left padding** (default 0.0s) — silence before audio starts
- **Right padding** (default 0.5s) — silence after audio ends
- **Total slide duration** = left_padding + audio_duration + right_padding
- Padding controls appear as soon as narration text is saved (before audio generation)
- Editing narration text clears the previously generated audio (user must regenerate)
- Slides without narration fall back to the manual duration slider
- A full-screen narration modal is available for comfortable long-form text editing

### Video Export

The MP4 export sends selected slide IDs to the backend. The export guards against slides that have narration text but no generated audio. For each slide:

1. **With audio**: The backend creates a padded audio track (silence + narration + silence) and generates a video segment combining the slide image with the audio using ffmpeg
2. **Without audio**: The backend creates a video segment from the image with a silent audio track, using the manual duration

All frames are scaled/padded to exactly 1920x1080 by ffmpeg (safety net). Segments are concatenated into a final H.264 MP4 video (`libx264`, `yuv420p`, 30fps, AAC audio at 128kbps).

### Auto Port Detection

The `dev.sh` startup script automatically finds available ports starting from 8000 (backend) and 5173 (frontend) using Python's `socket.bind()`. Both ports are exported as environment variables (`BACKEND_PORT`, `FRONTEND_PORT`) so the Vite proxy and CORS configuration adapt automatically.

## Architecture

```
coding-tutorial-screen-shoter/
├── backend/
│   ├── pyproject.toml              # uv dependencies
│   ├── data/
│   │   ├── app.db                  # SQLite database (auto-created)
│   │   ├── voice-sample.mp3        # Global voice sample for TTS
│   │   └── images/                 # Uploaded editor images
│   └── app/
│       ├── main.py                 # FastAPI app, CORS (reads FRONTEND_PORT), lifespan
│       ├── database.py             # SQLAlchemy async engine + session
│       ├── deps.py                 # FastAPI dependency (get_db)
│       ├── tts.py                  # PocketTTS wrapper (lazy-loaded model + voice state)
│       ├── models/
│       │   ├── recording.py        # Recording ORM model
│       │   └── screenshot.py       # Screenshot ORM model (image, audio, narration, padding)
│       ├── schemas/
│       │   ├── recording.py        # Pydantic request/response schemas
│       │   └── screenshot.py       # Screenshot metadata schema (has_audio computed)
│       └── routers/
│           ├── recordings.py       # CRUD: /api/v1/recordings
│           ├── screenshots.py      # Upload/serve/delete/export/narration/audio/padding
│           └── images.py           # Upload/serve editor images: /api/v1/images
├── frontend/
│   ├── package.json
│   ├── vite.config.ts              # Proxy /api → localhost:BACKEND_PORT
│   └── src/
│       ├── App.tsx                 # React Router (3 routes)
│       ├── components/
│       │   ├── Header.tsx          # Navigation bar
│       │   ├── LandingPage.tsx     # Home page with create button
│       │   ├── CreateRecordingModal.tsx
│       │   ├── RecordingsList.tsx  # CRUD list of all recordings
│       │   ├── RecordingEditor.tsx # Main editor layout (16:9 container + slides panel)
│       │   ├── MarkdownEditor.tsx  # Markdown editor (16:9 clipped preview, custom image upload)
│       │   ├── EditorToolbar.tsx   # Screenshot + Export ZIP/MP4 buttons
│       │   ├── ScreenshotPanel.tsx  # Right column with slide thumbnails
│       │   ├── ScreenshotCard.tsx   # Single slide with narration modal, audio, padding
│       │   ├── SlidePreviewModal.tsx # Full-screen slide viewer
│       │   └── DurationPopover.tsx  # Per-slide duration slider
│       ├── hooks/
│       │   ├── useRecordings.ts    # Recording CRUD state management
│       │   ├── useScreenshots.ts   # Screenshot state per recording (with updateScreenshot)
│       │   └── useScreenshotCapture.ts  # html2canvas capture at 1920x1080
│       ├── services/
│       │   └── api.ts              # Axios HTTP client + all API functions
│       ├── types/
│       │   └── index.ts            # TypeScript interfaces
│       └── utils/
│           ├── zipExport.ts        # JSZip export logic
│           └── videoExport.ts      # MP4 video export logic
├── dev.sh                          # Auto-port-detecting dev startup script
```

## API Endpoints

### Recordings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/recordings` | List all recordings |
| `POST` | `/api/v1/recordings` | Create a new recording |
| `GET` | `/api/v1/recordings/{id}` | Get recording with screenshots |
| `PUT` | `/api/v1/recordings/{id}` | Update recording title |
| `DELETE` | `/api/v1/recordings/{id}` | Delete recording + screenshots |

### Screenshots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/recordings/{id}/screenshots` | Upload screenshot (multipart) |
| `GET` | `/api/v1/recordings/{id}/screenshots/{sid}/image` | Serve PNG image |
| `GET` | `/api/v1/recordings/{id}/screenshots/{sid}/audio` | Serve MP3 audio |
| `DELETE` | `/api/v1/recordings/{id}/screenshots/{sid}` | Delete a screenshot |
| `PUT` | `/api/v1/recordings/{id}/screenshots/{sid}/narration` | Update narration text |
| `POST` | `/api/v1/recordings/{id}/screenshots/{sid}/generate-audio` | Generate TTS audio |
| `PUT` | `/api/v1/recordings/{id}/screenshots/{sid}/padding` | Update left/right padding |
| `GET` | `/api/v1/recordings/{id}/screenshots/export` | Download all as ZIP |
| `GET` | `/api/v1/recordings/{id}/screenshots/export-video` | Export slides as 1920x1080 MP4 |

### Images

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/images` | Upload an image, returns URL |
| `GET` | `/api/v1/images/{filename}` | Serve uploaded image |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |

## Database Schema

**recordings**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| title | VARCHAR(255) | Recording title |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last modified timestamp |

**screenshots**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| recording_id | INTEGER FK | References recordings(id), CASCADE delete |
| slide_number | INTEGER | Sequential slide number (unique per recording) |
| image_data | BLOB | PNG binary data (1920x1080) |
| code_snapshot | TEXT | Markdown source at time of capture |
| narration_text | TEXT | Narration script for TTS |
| audio_data | BLOB | Generated MP3 audio data (128kbps) |
| audio_duration | FLOAT | Duration of generated audio in seconds |
| left_padding | FLOAT | Silence before audio (default 0.0s) |
| right_padding | FLOAT | Silence after audio (default 0.5s) |
| created_at | DATETIME | Capture timestamp |

## Frontend Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | LandingPage | Home with "Create New Recording" |
| `/recordings` | RecordingsList | List, edit, delete recordings |
| `/recording/:id` | RecordingEditor | 16:9 Markdown editor + screenshot panel with narration |
