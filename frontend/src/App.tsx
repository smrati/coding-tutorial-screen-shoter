import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import RecordingsList from "./components/RecordingsList";
import RecordingEditor from "./components/RecordingEditor";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950">
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/recordings" element={<RecordingsList />} />
          <Route path="/recording/:id" element={<RecordingEditor />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
