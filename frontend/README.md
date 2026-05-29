# CodeShot Frontend

React 19 + Vite + TypeScript + Tailwind CSS v4 frontend for the CodeShot tutorial builder.

## Development

```bash
npm install
npm run dev
```

The dev server reads `BACKEND_PORT` from the environment (set by `dev.sh`) and proxies `/api` requests to the backend.

## Build

```bash
npm run build
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@uiw/react-md-editor` | Markdown editor with live preview |
| `@excalidraw/excalidraw` | Freeform canvas editor for drawing slides |
| `html2canvas` | Captures Markdown preview as 1920x1080 PNG |
| `axios` | HTTP client for backend API |
| `jszip` + `file-saver` | ZIP export of slide images |

## Project Structure

```
src/
├── App.tsx                 # React Router (3 routes)
├── components/
│   ├── Header.tsx          # Navigation bar
│   ├── LandingPage.tsx     # Home page with create button
│   ├── CreateRecordingModal.tsx
│   ├── RecordingsList.tsx  # CRUD list of all recordings
│   ├── RecordingEditor.tsx # Main editor (mode switcher, fullscreen, edit mode, 16:9 container)
│   ├── MarkdownEditor.tsx  # Markdown editor (16:9 clipped preview, custom image upload)
│   ├── CanvasEditor.tsx    # Excalidraw canvas (bg color sync, onChange files, export compositing)
│   ├── EditorModeSwitcher.tsx # Markdown/Canvas toggle tabs
│   ├── EditorToolbar.tsx   # Toolbar (Screenshot/Save Edit, Fullscreen, Export, edit badge)
│   ├── ScreenshotPanel.tsx  # Right column with slide thumbnails
│   ├── ScreenshotCard.tsx   # Slide card (mode badge, edit, clone, narration, audio, padding)
│   ├── SlidePreviewModal.tsx # Full-screen slide viewer
│   └── DurationPopover.tsx  # Per-slide duration slider
├── hooks/
│   ├── useRecordings.ts    # Recording CRUD state management
│   ├── useScreenshots.ts   # Screenshot state (upload, clone, update, remove)
│   └── useScreenshotCapture.ts  # html2canvas capture at 1920x1080
├── services/
│   └── api.ts              # Axios HTTP client + all API functions
├── types/
│   └── index.ts            # TypeScript interfaces
└── utils/
    ├── zipExport.ts        # JSZip export logic
    └── videoExport.ts      # MP4 video export logic
```
