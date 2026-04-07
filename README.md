# CodeShot

A web application for creating coding tutorials. Write Python code in a Monaco editor, capture screenshots as slides with `Ctrl+S`, and export them all as a ZIP of numbered PNGs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Code Editor | Monaco Editor (via `@monaco-editor/react`) |
| Screenshot | html2canvas |
| Export | JSZip + file-saver |
| Backend | FastAPI, SQLAlchemy 2 (async), Pydantic v2 |
| Database | SQLite (via aiosqlite) |
| Package Manager | npm (frontend), uv (backend) |

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.12
- **uv** — install via `curl -LsSf https://astral.sh/uv/install.sh | sh`

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

## Running the Application

From the project root, run both servers with a single command:

```bash
./dev.sh
```

Or run individually if needed:

**Backend** (port 8000):

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

**Frontend** (port 5173):

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI).

## How It Works

### User Flow

1. **Home** — Click "Create New Recording" and enter a title
2. **Editor** — Write Python code with syntax highlighting and autocomplete
3. **Capture** — Press `Ctrl+S` (`Cmd+S` on Mac) or click "Screenshot" to capture the editor as a PNG slide
4. **Slides** — Captured screenshots appear as numbered thumbnails in the right panel
5. **Export** — Click "Export All Screenshots" to download a ZIP containing `1.png`, `2.png`, etc.
6. **Manage** — View, edit titles, or delete recordings from the Recordings list page

### Screenshot Capture

When the user triggers a capture, `html2canvas` renders the Monaco Editor wrapper DOM to a canvas at 2x resolution. The canvas is converted to a PNG blob and uploaded to the backend via a multipart request. The backend stores the image as a BLOB in SQLite and assigns it a sequential slide number.

## Architecture

```
coding-tutorial-screen-shoter/
├── backend/
│   ├── pyproject.toml              # uv dependencies
│   └── app/
│       ├── main.py                 # FastAPI app, CORS, lifespan (DB init)
│       ├── database.py             # SQLAlchemy async engine + session
│       ├── deps.py                 # FastAPI dependency (get_db)
│       ├── models/
│       │   ├── recording.py        # Recording ORM model
│       │   └── screenshot.py       # Screenshot ORM model (image_data BLOB)
│       ├── schemas/
│       │   ├── recording.py        # Pydantic request/response schemas
│       │   └── screenshot.py       # Screenshot metadata schema
│       └── routers/
│           ├── recordings.py       # CRUD: /api/v1/recordings
│           └── screenshots.py      # Upload/serve/delete/export screenshots
├── frontend/
│   ├── package.json
│   ├── vite.config.ts              # Proxy /api → localhost:8000
│   └── src/
│       ├── App.tsx                 # React Router (3 routes)
│       ├── components/
│       │   ├── Header.tsx          # Navigation bar
│       │   ├── LandingPage.tsx     # Home page with create button
│       │   ├── CreateRecordingModal.tsx
│       │   ├── RecordingsList.tsx  # CRUD list of all recordings
│       │   ├── RecordingEditor.tsx # Main editor page layout
│       │   ├── CodeEditor.tsx      # Monaco Editor wrapper
│       │   ├── EditorToolbar.tsx   # Screenshot + Export buttons
│       │   ├── ScreenshotPanel.tsx  # Right column with slide thumbnails
│       │   └── ScreenshotCard.tsx   # Single slide with delete
│       ├── hooks/
│       │   ├── useRecordings.ts    # Recording CRUD state management
│       │   ├── useScreenshots.ts   # Screenshot state per recording
│       │   └── useScreenshotCapture.ts  # html2canvas capture logic
│       ├── services/
│       │   └── api.ts              # Axios HTTP client
│       ├── types/
│       │   └── index.ts            # TypeScript interfaces
│       └── utils/
│           └── zipExport.ts        # JSZip export logic
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
| `DELETE` | `/api/v1/recordings/{id}/screenshots/{sid}` | Delete a screenshot |
| `GET` | `/api/v1/recordings/{id}/screenshots/export` | Download all as ZIP |

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
| image_data | BLOB | PNG binary data |
| code_snapshot | TEXT | Source code at time of capture |
| created_at | DATETIME | Capture timestamp |

## Frontend Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | LandingPage | Home with "Create New Recording" |
| `/recordings` | RecordingsList | List, edit, delete recordings |
| `/recording/:id` | RecordingEditor | Code editor + screenshot panel |
