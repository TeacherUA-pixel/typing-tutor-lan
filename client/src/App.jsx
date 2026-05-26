import React, { useState, useEffect } from "react";
import TeacherDashboard from "./components/TeacherDashboard";
import AcademyView from "./components/Academy/AcademyView";
import SoloTrainerView from "./components/SoloTrainerView";

// Dynamically connect to the host's backend port (3000)
export const BACKEND_URL = `http://${window.location.hostname}:3000`;

function App() {
  const isAdmin = window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1" ||
                  window.location.search.includes("admin=true");

  // Main tool selection: "trainer" | "academy" | "teacher"
  const [activeTool, setActiveTool] = useState("trainer");

  return (
    <div className="app-wrapper">
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <div className="app-container">
        <header className="app-header">
          <div className="logo" onClick={() => setActiveTool("trainer")} style={{ cursor: "pointer" }}>
            <span>⌨️</span> Академія набору
          </div>
          <div className="header-actions">
            {isAdmin && (
              activeTool === "teacher" ? (
                <button className="btn btn-secondary" onClick={() => setActiveTool("trainer")}>
                  ← Повернутися
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => setActiveTool("teacher")}>
                  👨‍🏫 Кабінет вчителя
                </button>
              )
            )}
          </div>
        </header>

        <main style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ─── Main tool navigation ─── */}
          {activeTool !== "teacher" && (
            <div className="mode-tabs">
              <button
                className={`mode-tab ${activeTool === "trainer" ? "active" : ""}`}
                onClick={() => setActiveTool("trainer")}
              >
                🎯 Клавіатурний тренажер
              </button>
              <button
                className={`mode-tab ${activeTool === "academy" ? "active" : ""}`}
                onClick={() => setActiveTool("academy")}
              >
                📝 Тренажер текстового редактора
              </button>
            </div>
          )}

          {/* ─── Tools ─── */}
          {activeTool === "trainer" && <SoloTrainerView />}
          {activeTool === "academy" && (
            <div style={{ maxWidth: "96%", width: "96%", margin: "0 auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <AcademyView />
            </div>
          )}
          {activeTool === "teacher" && (
            <TeacherDashboard onBackHome={() => setActiveTool("trainer")} />
          )}
        </main>

        <footer style={{ marginTop: "auto", padding: "1rem 0", borderTop: "1px solid var(--card-border)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          © {new Date().getFullYear()} Академія набору — Клавіатурний тренажер та культура набору тексту
        </footer>
      </div>
    </div>
  );
}

export default App;
