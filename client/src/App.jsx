import React, { useState, useEffect } from "react";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentArena from "./components/StudentArena";

// Dynamically connect to the host's backend port (3000)
export const BACKEND_URL = `http://${window.location.hostname}:3000`;

function App() {
  const isAdmin = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" || 
                  window.location.search.includes("admin=true");

  const [role, setRole] = useState(isAdmin ? "home" : "student");
  const [stats, setStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (role === "home" && isAdmin) {
      fetchStats();
    }
  }, [role, isAdmin]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      if (response.ok) {
        const data = await response.json();
        // Sort history by date descending
        setStats(data.reverse());
      }
    } catch (error) {
      console.error("Error fetching stats history:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="app-wrapper">
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <div className="app-container">
        <header className="app-header">
          <div className="logo" onClick={() => isAdmin && setRole("home")} style={{ cursor: isAdmin ? "pointer" : "default" }}>
            <span>⌨️</span> LAN Keyboard Battle
          </div>
          <div className="header-actions">
            {role !== "home" && isAdmin && (
              <button className="btn btn-secondary" onClick={() => setRole("home")}>
                 повернутися на головну
              </button>
            )}
          </div>
        </header>

      <main style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {role === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
            <div className="welcome-grid">
              <div className="glass-panel welcome-card glass-card-hover">
                <span className="icon">👨‍🏫</span>
                <h2>Кабінет вчителя</h2>
                <p>
                  Створіть кімнату, оберіть текст для змагання, отримайте код підключення та стежте за результатами учнів у реальному часі.
                </p>
                <button className="btn btn-primary" onClick={() => setRole("teacher")}>
                  Створити кімнату
                </button>
              </div>

              <div className="glass-panel welcome-card glass-card-hover">
                <span className="icon">🎓</span>
                <h2>Кабінет учня</h2>
                <p>
                  Введіть код кімнати, вказаний учителем, вкажіть своє ім'я та приєднайтеся до групового змагання.
                </p>
                <button className="btn btn-primary" style={{ background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)" }} onClick={() => setRole("student")}>
                  Приєднатися за кодом
                </button>
              </div>
            </div>

            {/* Global Stats History */}
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", fontWeight: "700" }}>
                📊 Глобальна статистика (Історія змагань)
              </h2>
              {loadingStats ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>Завантаження статистики...</div>
              ) : stats.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                  Історія змагань поки що порожня. Створіть першу кімнату та почніть змагання!
                </div>
              ) : (
                <div className="scrollable" style={{ maxHeight: "400px" }}>
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Дата та час</th>
                        <th>Кімната</th>
                        <th>Текст</th>
                        <th>Переможець</th>
                        <th>Найкращий результат (зн/хв)</th>
                        <th>Учасників</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((game) => {
                        const winner = game.results && game.results.find((r) => r.rank === 1);
                        return (
                          <tr key={game.id}>
                            <td>{formatDate(game.date)}</td>
                            <td>
                              <span className="badge badge-info">{game.roomCode}</span>
                            </td>
                            <td style={{ fontWeight: 500 }}>{game.textTitle}</td>
                            <td style={{ color: winner ? "var(--success)" : "inherit", fontWeight: 600 }}>
                              {winner ? winner.name : "—"}
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                              {winner ? `${winner.wpm * 5} зн/хв` : "—"}
                            </td>
                            <td>{game.results ? game.results.length : 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {role === "teacher" && (
          <TeacherDashboard onBackHome={() => setRole("home")} />
        )}

        {role === "student" && (
          <StudentArena onBackHome={() => setRole("home")} />
        )}
      </main>

      {role === "home" && (
        <footer style={{ marginTop: "3rem", padding: "1.5rem 0", borderTop: "1px solid var(--card-border)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          © {new Date().getFullYear()} LAN Keyboard Battle — Розроблено для кабінетів інформатики
        </footer>
      )}
      </div>
    </div>
  );
}

export default App;
