import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../App";
import { calculateSchoolGrade } from "../utils/grading";

function TeacherDashboard({ onBackHome }) {
  const [step, setStep] = useState("setup"); // setup, lobby, playing, results
  const [availableTexts, setAvailableTexts] = useState({});
  const [language, setLanguage] = useState("ua");
  const [selectedTextId, setSelectedTextId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [serverIp, setServerIp] = useState("localhost");
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);

  const [activeTab, setActiveTab] = useState("competition"); // competition, academy
  const [academyProgress, setAcademyProgress] = useState([]);

  const socketRef = useRef(null);

  const fetchAcademyProgress = () => {
    fetch(`${BACKEND_URL}/api/academy/progress`)
      .then(res => res.json())
      .then(data => setAcademyProgress(data))
      .catch(err => console.error("Error fetching academy progress:", err));
  };

  useEffect(() => {
    // 1. Fetch available texts
    fetch(`${BACKEND_URL}/api/texts`)
      .then((res) => res.json())
      .then((data) => {
        setAvailableTexts(data);
        if (data[language] && data[language].length > 0) {
          setSelectedTextId(data[language][0].id);
        }
      })
      .catch((err) => console.error("Error fetching texts:", err));

    // 2. Fetch server IP
    fetch(`${BACKEND_URL}/api/ip`)
      .then((res) => res.json())
      .then((data) => setServerIp(data.ip))
      .catch((err) => console.error("Error fetching IP:", err));

    // 3. Fetch academy progress
    fetchAcademyProgress();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [language]);

  // Update selected text when language changes
  useEffect(() => {
    if (availableTexts[language] && availableTexts[language].length > 0) {
      setSelectedTextId(availableTexts[language][0].id);
    }
  }, [language, availableTexts]);

  const handleCreateRoom = (e) => {
    e.preventDefault();

    // Connect socket
    socketRef.current = io(BACKEND_URL);

    socketRef.current.on("connect", () => {
      const selectedText = availableTexts[language].find(t => t.id === selectedTextId);
      socketRef.current.emit(
        "create-room",
        {
          language,
          difficulty: selectedText ? selectedText.difficulty : "medium",
          textId: selectedTextId
        },
        (response) => {
          if (response.error) {
            alert(response.error);
            socketRef.current.disconnect();
            return;
          }
          setRoomCode(response.roomCode);
          setStep("lobby");
        }
      );
    });

    // Listeners
    socketRef.current.on("student-list-update", (studentList) => {
      setStudents(studentList);
    });

    socketRef.current.on("progress-update", (studentList) => {
      setStudents(studentList);
    });

    socketRef.current.on("game-finished", (finalResults) => {
      setResults(finalResults);
      setStep("results");
    });
  };

  const handleStartGame = () => {
    if (students.length === 0) {
      alert("Зачекайте, поки приєднається хоча б один учень!");
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit("start-game", { roomCode });
      setStep("playing");
    }
  };

  const handleEndGame = () => {
    if (socketRef.current) {
      socketRef.current.emit("end-game", { roomCode });
    }
  };

  const handleCloseRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setStep("setup");
    setStudents([]);
    setResults([]);
    onBackHome();
  };

  // Determine client link URL for students
  const clientPort = window.location.port ? `:${window.location.port}` : "";
  const joinUrl = `${window.location.protocol}//${serverIp}${clientPort}`;

  const currentText = availableTexts[language]?.find((t) => t.id === selectedTextId);

  const handleClearAcademy = async () => {
    if (window.confirm("Ви впевнені, що хочете очистити прогрес Академії для всіх учнів?")) {
      try {
        await fetch(`${BACKEND_URL}/api/academy/progress`, { method: "DELETE" });
        fetchAcademyProgress();
      } catch (e) {
        console.error("Failed to clear", e);
      }
    }
  };

  // Process academy data for table
  // Group by student name
  const academyStudents = {};
  const allLessons = new Set();
  academyProgress.forEach(p => {
    if (!academyStudents[p.name]) academyStudents[p.name] = {};
    academyStudents[p.name][p.lessonId] = p.score;
    allLessons.add(p.lessonId);
  });
  const lessonColumns = Array.from(allLessons).sort();

  return (
    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
      {step === "setup" && (
        <div className="glass-panel" style={{ padding: "2.5rem", maxWidth: "800px", margin: "2rem auto", width: "100%" }}>
          <div className="mode-tabs" style={{ marginBottom: "2rem" }}>
            <button 
              className={`mode-tab ${activeTab === "competition" ? "active" : ""}`}
              onClick={() => setActiveTab("competition")}
            >
              🏁 Змагання
            </button>
            <button 
              className={`mode-tab ${activeTab === "academy" ? "active" : ""}`}
              onClick={() => { setActiveTab("academy"); fetchAcademyProgress(); }}
            >
              🎓 Прогрес Академії
            </button>
          </div>

          {activeTab === "competition" && (
            <div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem", fontWeight: "700", textAlign: "center" }}>
                🛠️ Створити нове змагання
              </h2>
              <form onSubmit={handleCreateRoom} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="form-group">
              <label>Мова тексту</label>
              <select
                className="form-control select-control"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="ua">Українська 🇺🇦</option>
                <option value="en">Англійська 🇬🇧</option>
                <option value="code">Код / Програмування 💻</option>
                <option value="mixed">Комбінована 🇺🇦/🇬🇧 (із символами)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Оберіть текст</label>
              <select
                className="form-control select-control"
                value={selectedTextId}
                onChange={(e) => setSelectedTextId(e.target.value)}
              >
                {availableTexts[language]?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.difficulty === "easy" ? "Легкий" : t.difficulty === "medium" ? "Середній" : "Складний"})
                  </option>
                ))}
              </select>
            </div>

            {currentText && (
              <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  Попередній перегляд тексту:
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", maxHeight: "120px", overflowY: "auto" }}>
                  {currentText.text}
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
              Створити кімнату
            </button>
          </form>
          </div>
          )}

          {activeTab === "academy" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.8rem", fontWeight: "700" }}>🎓 Успішність учнів в Академії</h2>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button className="btn btn-secondary" onClick={fetchAcademyProgress}>🔄 Оновити</button>
                  <button className="btn btn-danger" onClick={handleClearAcademy}>🗑️ Очистити прогрес</button>
                </div>
              </div>
              
              {Object.keys(academyStudents).length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", border: "1px dashed var(--card-border)", borderRadius: "12px" }}>
                  <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>📭</span>
                  Поки що жоден учень не пройшов уроки Академії.
                </div>
              ) : (
                <div className="scrollable" style={{ overflowX: "auto" }}>
                  <table className="leaderboard-table" style={{ whiteSpace: "nowrap" }}>
                    <thead>
                      <tr>
                        <th>Прізвище та ім'я</th>
                        {lessonColumns.map(lId => (
                          <th key={lId} style={{ textAlign: "center" }}>Урок {lId.replace('lesson-', '')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(academyStudents).sort().map(name => (
                        <tr key={name}>
                          <td style={{ fontWeight: 600 }}>{name}</td>
                          {lessonColumns.map(lId => {
                            const score = academyStudents[name][lId];
                            return (
                              <td key={lId} style={{ textAlign: "center", fontWeight: "bold", color: score ? "var(--success)" : "var(--text-muted)" }}>
                                {score ? `${score}%` : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === "lobby" && (
        <div className="dashboard-grid">
          <div className="glass-panel sidebar-panel">
            <div className="room-info-badge">
              <div style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-secondary)" }}>Код кімнати</div>
              <div className="room-code-display">{roomCode}</div>
              <div className="ip-info">
                Адреса підключення учнів:<br />
                <strong style={{ color: "#a5b4fc", fontSize: "0.95rem" }}>{joinUrl}</strong>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
                <span>Учні в кімнаті</span>
                <span className="badge badge-info">{students.length}</span>
              </h3>

              <div className="student-list scrollable">
                {students.map((student) => (
                  <div key={student.id} className="student-item">
                    <span>{student.name}</span>
                    <span className="student-status-dot"></span>
                  </div>
                ))}
                {students.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", padding: "1.5rem" }}>
                    Очікування підключення учнів...
                  </div>
                )}
              </div>
            </div>

            <button
              className="btn btn-primary pulse-animation"
              onClick={handleStartGame}
              disabled={students.length === 0}
              style={{ width: "100%", opacity: students.length === 0 ? 0.6 : 1 }}
            >
              🚀 Почати змагання
            </button>
          </div>

          <div className="glass-panel main-panel">
            <h2 style={{ fontSize: "1.6rem", fontWeight: "700", marginBottom: "1rem" }}>
              Зал очікування змагань
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              Зараз учні заходять у кабінет, вводять код <strong>{roomCode}</strong> та реєструють свої імена.
              Коли всі будуть готові, натисніть кнопку <strong>"Почати змагання"</strong> ліворуч.
            </p>

            <div style={{ flexGrow: 1, border: "1px dashed var(--card-border)", borderRadius: "12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "2rem", textAlign: "center" }}>
              <span style={{ fontSize: "3rem", marginBottom: "1rem" }}>📢</span>
              <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "0.5rem" }}>Інструкція для проектора / дошки:</h3>
              <ol style={{ textAlign: "left", maxWidth: "450px", color: "var(--text-secondary)", paddingLeft: "1.2rem", lineHeight: "1.8" }}>
                <li>Увімкніть комп'ютери учнів.</li>
                <li>Відкрийте браузер та введіть адресу: <strong style={{ color: "var(--text-primary)" }}>{joinUrl}</strong></li>
                <li>Виберіть роль "Кабінет учня" та введіть код кімнати: <strong style={{ color: "var(--text-primary)" }}>{roomCode}</strong></li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {step === "playing" && (
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem" }}>
            <div>
              <span className="badge badge-info" style={{ marginRight: "0.5rem" }}>Кімната {roomCode}</span>
              <h2 style={{ display: "inline", fontSize: "1.5rem", fontWeight: "700" }}>Змагання триває...</h2>
            </div>
            <button className="btn btn-danger" onClick={handleEndGame}>
              Завершити гру достроково
            </button>
          </div>

          <div className="progress-monitor">
            <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Траса змагання (Прогрес учнів):
            </h3>
            {students.map((student) => (
              <div key={student.id} className="track-row">
                <div className="track-header">
                  <span className="track-name">
                    👤 {student.name}
                    {student.finished && <span style={{ color: "var(--success)", fontSize: "0.8rem", fontWeight: "bold", marginLeft: "0.5rem" }}>● Фініш!</span>}
                  </span>
                  <span className="track-stats">
                    {student.wpm * 5} зн/хв | Точність: {student.accuracy}% | Прогрес: {Math.round(student.progress)}%
                  </span>
                </div>
                <div className="track-bg">
                  <div
                    className={`track-fill ${student.finished ? "finished" : ""}`}
                    style={{ width: `${student.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "results" && (
        <div className="glass-panel" style={{ padding: "3rem 2rem", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
          <h2 className="leaderboard-title">🏆 Результати змагання 🏆</h2>

          {/* Podium */}
          <div className="podium">
            {/* 2nd place */}
            {results[1] && (
              <div className="podium-place silver">
                <span className="podium-medal">🥈</span>
                <div className="podium-name">{results[1].name}</div>
                <div className="podium-wpm">{results[1].wpm * 5} зн/хв</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{results[1].accuracy}% точність</div>
                <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--primary)", marginTop: "0.2rem" }}>Оцінка: {calculateSchoolGrade(results[1].wpm * 5, results[1].accuracy).grade}</div>
              </div>
            )}

            {/* 1st place */}
            {results[0] && (
              <div className="podium-place gold">
                <span className="podium-medal">🥇</span>
                <div className="podium-name">{results[0].name}</div>
                <div className="podium-wpm">{results[0].wpm * 5} зн/хв</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{results[0].accuracy}% точність</div>
                <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--primary)", marginTop: "0.2rem" }}>Оцінка: {calculateSchoolGrade(results[0].wpm * 5, results[0].accuracy).grade}</div>
              </div>
            )}

            {/* 3rd place */}
            {results[2] && (
              <div className="podium-place bronze">
                <span className="podium-medal">🥉</span>
                <div className="podium-name">{results[2].name}</div>
                <div className="podium-wpm">{results[2].wpm * 5} зн/хв</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{results[2].accuracy}% точність</div>
                <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--primary)", marginTop: "0.2rem" }}>Оцінка: {calculateSchoolGrade(results[2].wpm * 5, results[2].accuracy).grade}</div>
              </div>
            )}
          </div>

          {/* Full ranking table */}
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Місце</th>
                <th>Ім'я</th>
                <th>Швидкість (зн/хв)</th>
                <th>Точність</th>
                <th>Оцінка</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {results.map((student, index) => {
                const gradeInfo = calculateSchoolGrade(student.wpm * 5, student.accuracy);
                return (
                  <tr key={index}>
                    <td>
                      <span className={`rank-badge rank-${student.rank}`}>
                        {student.rank}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      {student.wpm * 5} зн/хв
                    </td>
                    <td>{student.accuracy}%</td>
                    <td style={{ fontWeight: "800", color: "var(--primary)" }}>{gradeInfo.grade}</td>
                    <td style={{ color: student.finished ? "var(--success)" : "var(--error)", fontSize: "0.9rem" }}>
                      {student.finished ? "Завершив" : `Не додрукував (${Math.round(student.progress)}%)`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: "2.5rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={handleCloseRoom}>
              Закрити кімнату
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherDashboard;
