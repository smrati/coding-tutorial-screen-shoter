import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  return (
    <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold tracking-tight">
        CodeShot
      </Link>
      <nav className="flex gap-4">
        <Link
          to="/"
          className={`text-sm ${location.pathname === "/" ? "text-blue-400" : "text-gray-300 hover:text-white"}`}
        >
          Home
        </Link>
        <Link
          to="/recordings"
          className={`text-sm ${location.pathname === "/recordings" ? "text-blue-400" : "text-gray-300 hover:text-white"}`}
        >
          Recordings
        </Link>
      </nav>
    </header>
  );
}
