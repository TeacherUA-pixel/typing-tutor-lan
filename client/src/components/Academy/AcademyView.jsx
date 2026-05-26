import React, { useState, useEffect, useRef } from "react";
import { ACADEMY_LESSONS } from "../../data/academyLessons";
import { verifyText } from "./verifyText";
import { BACKEND_URL } from "../../App";

export default function AcademyView() {
  const [studentName, setStudentName] = useState(localStorage.getItem("academy_name") || "");
  const [step, setStep] = useState(studentName ? "list" : "login"); // login, list, theory, practice, result
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  
  // Progress tracking
  const [completedLessons, setCompletedLessons] = useState([]);
  
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("academy_progress") || "[]");
      setCompletedLessons(saved);
    } catch (e) {
      console.error("Error loading academy progress", e);
    }
  }, []);

  const saveProgress = async (lessonId, score) => {
    if (!completedLessons.includes(lessonId)) {
      const newProgress = [...completedLessons, lessonId];
      setCompletedLessons(newProgress);
      localStorage.setItem("academy_progress", JSON.stringify(newProgress));
    }

    if (studentName) {
      try {
        await fetch(`${BACKEND_URL}/api/academy/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: studentName, lessonId, score })
        });
      } catch (e) {
        console.error("Error saving progress to server", e);
      }
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (studentName.trim()) {
      localStorage.setItem("academy_name", studentName.trim());
      setStep("list");
    }
  };

  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [sessionExercises, setSessionExercises] = useState([]);

  const handleLessonSelect = (id) => {
    setSelectedLessonId(id);
    setActiveExerciseIdx(0);
    
    // Generate session exercises randomly
    const lesson = ACADEMY_LESSONS.find(l => l.id === id);
    if (lesson && lesson.exercises) {
      const pool = lesson.exercises;
      const smallMedium = pool.filter(ex => ex.template.length < 100);
      const mediumLarge = pool.filter(ex => ex.template.length >= 100);
      
      const selected = [];
      // Pick 1 from smallMedium
      if (smallMedium.length > 0) {
        const randIndex = Math.floor(Math.random() * smallMedium.length);
        selected.push(smallMedium[randIndex]);
      } else if (pool.length > 0) {
        selected.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      
      // Pick 1 from mediumLarge
      if (mediumLarge.length > 0) {
        const randIndex = Math.floor(Math.random() * mediumLarge.length);
        selected.push(mediumLarge[randIndex]);
      } else if (pool.length > 1) {
        let attempts = 0;
        let p;
        do {
          p = pool[Math.floor(Math.random() * pool.length)];
          attempts++;
        } while (selected.some(item => item.id === p.id) && attempts < 10);
        selected.push(p);
      }
      
      setSessionExercises(selected);
    } else {
      setSessionExercises([]);
    }
    
    setStep("theory");
  };

  const handleStartPractice = () => {
    const exercise = sessionExercises[activeExerciseIdx] || (sessionExercises.length > 0 ? sessionExercises[0] : null);
    if (!exercise) return;
    
    if (exercise.type === "edit") {
      setInputText(exercise.initial || "");
    } else {
      setInputText("");
    }
    setStep("practice");
  };

  const handleNextExercise = () => {
    const nextIdx = activeExerciseIdx + 1;
    setActiveExerciseIdx(nextIdx);
    
    const exercise = sessionExercises[nextIdx];
    if (exercise) {
      if (exercise.type === "edit") {
        setInputText(exercise.initial || "");
      } else {
        setInputText("");
      }
      setStep("practice");
    }
  };

  const handleRandomExercise = () => {
    const lesson = ACADEMY_LESSONS.find(l => l.id === selectedLessonId);
    if (!lesson || lesson.exercises.length === 0) return;

    const currentEx = sessionExercises[activeExerciseIdx];
    const pool = lesson.exercises.filter(ex => !currentEx || ex.id !== currentEx.id);
    const picked = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : lesson.exercises[Math.floor(Math.random() * lesson.exercises.length)];

    // Replace the current exercise in sessionExercises with the new one
    const updated = [...sessionExercises];
    updated[activeExerciseIdx] = picked;
    setSessionExercises(updated);

    if (picked.type === "edit") {
      setInputText(picked.initial || "");
    } else {
      setInputText("");
    }
  };

  const handleVerify = () => {
    const lesson = ACADEMY_LESSONS.find(l => l.id === selectedLessonId);
    if (!lesson) return;
    
    const exercise = sessionExercises[activeExerciseIdx] || (sessionExercises.length > 0 ? sessionExercises[0] : null);
    if (!exercise) return;
    
    const verification = verifyText(exercise.template, inputText);
    setResult(verification);
    setStep("result");
    
    if (verification.isExactMatch || verification.score >= 90) {
      if (activeExerciseIdx + 1 >= sessionExercises.length) {
        saveProgress(lesson.id, verification.score);
      }
    }
  };

  // Rendering
  if (step === "login") {
    return (
      <div className="glass-panel" style={{ padding: "3rem 2rem", maxWidth: "500px", margin: "2rem auto", textAlign: "center" }}>
        <span style={{ fontSize: "3rem", marginBottom: "1rem", display: "inline-block" }}>🎓</span>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", fontWeight: "700" }}>Ласкаво просимо до Академії!</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
          Будь ласка, введіть своє прізвище та ім'я, щоб вчитель міг бачити ваші успіхи.
        </p>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Наприклад: Петренко Іван"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            required
            autoFocus
            style={{ fontSize: "1.2rem", padding: "1rem", textAlign: "center" }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: "1rem", fontSize: "1.2rem" }}>
            Увійти до Академії
          </button>
        </form>
      </div>
    );
  }

  if (step === "list") {
    return (
      <div className="glass-panel" style={{ padding: "1.5rem 2rem", width: "100%", maxWidth: "100%", margin: "0 auto", display: "flex", flexDirection: "column", maxHeight: "100%", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexShrink: 0, gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1.6rem", margin: 0 }}>📝 Академія набору тексту</h2>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>Учень: <strong>{studentName}</strong></span>
            <button 
              className="btn btn-secondary" 
              style={{ padding: "0.3rem 0.7rem", fontSize: "0.75rem", borderRadius: "8px" }}
              onClick={() => {
                localStorage.removeItem("academy_name");
                setStudentName("");
                setStep("login");
              }}
            >
              🔄 Змінити
            </button>
          </div>
        </div>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.95rem", flexShrink: 0 }}>
          Навчіться правильно оформлювати текст. Пройдіть уроки, щоб зрозуміти правила набору, використання пробілів та розділових знаків.
        </p>
        
        <div className="scrollable" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(clamp(170px, 15vw, 210px), 1fr))", gap: "0.8rem", flex: 1, overflowY: "auto", paddingRight: "0.5rem", paddingBottom: "0.5rem" }}>
          {ACADEMY_LESSONS.map((lesson, idx) => {
            const isCompleted = completedLessons.includes(lesson.id);
            return (
              <div 
                key={lesson.id} 
                className={`glass-panel lesson-card ${isCompleted ? 'lesson-completed' : ''}`}
                style={{ 
                  padding: "clamp(0.6rem, 1vh, 0.9rem) clamp(0.8rem, 1vw, 1.1rem)", 
                  display: "flex", 
                  flexDirection: "column",
                  justifyContent: "space-between", 
                  alignItems: "flex-start",
                  gap: "0.4rem",
                  background: isCompleted ? "rgba(34, 197, 94, 0.1)" : "rgba(255,255,255,0.05)",
                  border: isCompleted ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid var(--card-border)",
                  cursor: "pointer",
                  minHeight: "clamp(85px, 11vh, 105px)",
                  height: "auto"
                }}
                onClick={() => handleLessonSelect(lesson.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <div style={{ fontSize: "clamp(0.7rem, 0.9vw, 0.8rem)", color: "var(--primary)", fontWeight: "800", textTransform: "uppercase" }}>
                    Урок {idx + 1}
                  </div>
                  <div style={{ fontSize: "clamp(0.95rem, 1.2vw, 1.1rem)" }}>
                    {isCompleted ? "✅" : "➡️"}
                  </div>
                </div>
                <div style={{ width: "100%" }}>
                  <h3 style={{ fontSize: "clamp(0.92rem, 1.1vw, 1.05rem)", marginBottom: "0.2rem", lineHeight: "1.25", fontWeight: "700" }}>
                    {lesson.title}
                  </h3>
                  <div style={{ fontSize: "clamp(0.7rem, 0.8vw, 0.78rem)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: lesson.level === 1 ? "var(--success)" : lesson.level === 2 ? "var(--warning)" : "var(--error)" }}></span>
                    Рівень {lesson.level}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const lesson = ACADEMY_LESSONS.find(l => l.id === selectedLessonId);
  if (!lesson) return null;

  if (step === "theory") {
    return (
      <div className="glass-panel scrollable" style={{ padding: "1.5rem 2.5rem", width: "100%", maxWidth: "100%", margin: "0 auto", maxHeight: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.8rem", color: "var(--primary)", margin: 0, flexShrink: 0 }}>📖 {lesson.title}</h2>
        <div style={{ fontSize: "1.05rem", lineHeight: "1.55", color: "var(--text-secondary)", textAlign: "left", flexShrink: 0 }}>
          {lesson.theory.explanation}
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.2rem", textAlign: "left", flexShrink: 0 }}>
          <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "12px", padding: "1.2rem 1.5rem" }}>
            <h3 style={{ color: "var(--success)", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem" }}>
              <span>✅</span> Правильно
            </h3>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", whiteSpace: "pre-wrap" }}>
              {lesson.theory.correct.split('\n').map((line, lineIdx, lines) => (
                <React.Fragment key={lineIdx}>
                  {line.split('').map((char, charIdx) =>
                    char === ' '
                      ? <span key={charIdx} style={{
                          background: "rgba(34, 197, 94, 0.25)",
                          borderRadius: "2px",
                          marginLeft: "1px",
                          marginRight: "1px",
                          minWidth: "0.45em",
                          display: "inline-block"
                        }}>&thinsp;</span>
                      : <span key={charIdx}>{char}</span>
                  )}
                  {lineIdx < lines.length - 1 && (
                    <span style={{ color: "var(--success)", opacity: 0.6 }}>↵<br/></span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "1.2rem 1.5rem" }}>
            <h3 style={{ color: "var(--error)", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem" }}>
              <span>❌</span> Неправильно
            </h3>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", whiteSpace: "pre-wrap" }}>
              {lesson.theory.incorrect.split('\n').map((line, lineIdx, lines) => (
                <React.Fragment key={lineIdx}>
                  {line.split('').map((char, charIdx) =>
                    char === ' '
                      ? <span key={charIdx} style={{
                          background: "rgba(239, 68, 68, 0.25)",
                          borderRadius: "2px",
                          marginLeft: "1px",
                          marginRight: "1px",
                          minWidth: "0.45em",
                          display: "inline-block"
                        }}>&thinsp;</span>
                      : <span key={charIdx}>{char}</span>
                  )}
                  {lineIdx < lines.length - 1 && (
                    <span style={{ color: "var(--error)", opacity: 0.6 }}>↵<br/></span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "auto", paddingTop: "0.5rem", flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={() => setStep("list")}>🔙 Назад до списку</button>
          <button className="btn btn-primary" onClick={handleStartPractice}>Зрозумів, до практики ✍️</button>
        </div>
      </div>
    );
  }

  const exercise = sessionExercises[activeExerciseIdx] || (lesson && lesson.exercises[0]);

  if (step === "practice") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "100%", margin: "0 auto", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1.5rem", margin: 0 }}>
            ✍️ Практика: {lesson.title} <span style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: "normal" }}>(вправа {activeExerciseIdx + 1} з {sessionExercises.length})</span>
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem" }} onClick={() => setStep("list")}>📁 До списку</button>
            <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem" }} onClick={() => setStep("theory")}>📖 Теорія</button>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: "1rem 1.2rem", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700" }}>
              {exercise.type === "edit" ? "📋 Текст для порівняння (Еталон):" : "📋 Шаблон (наберіть точно так само):"}
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: "0.2rem 0.7rem", fontSize: "0.8rem", borderRadius: "8px", gap: "0.3rem" }}
              onClick={handleRandomExercise}
              title="Рандомно замінити вправу з пулу цього уроку"
            >
              🎲 Рандом
            </button>
          </div>
          <div className="scrollable" style={{ 
            fontFamily: "var(--font-mono)", 
            fontSize: "1.15rem", 
            lineHeight: "1.5", 
            padding: "0.8rem 1rem",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            whiteSpace: "pre-wrap",
            color: "var(--text-primary)",
            maxHeight: "150px",
            overflowY: "auto"
          }}>
            {/* Пробіли рендеримо як виділений блок-фон, а не крапку,
                щоб при переносі рядка вони не з'являлись на початку наступного */}
            {exercise.template.split('\n').map((line, lineIdx, lines) => (
              <React.Fragment key={lineIdx}>
                {line.split('').map((char, charIdx) =>
                  char === ' '
                    ? <span key={charIdx} style={{
                        background: "rgba(99,102,241,0.2)",
                        borderRadius: "2px",
                        marginLeft: "1px",
                        marginRight: "1px",
                        minWidth: "0.45em",
                        display: "inline-block"
                      }}>&thinsp;</span>
                    : <span key={charIdx}>{char}</span>
                )}
                {lineIdx < lines.length - 1 && (
                  <span style={{ color: "var(--primary)", opacity: 0.6 }}>↵<br/></span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1rem 1.2rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", fontWeight: "700", flexShrink: 0 }}>
            {exercise.type === "edit" ? "✏️ Виправте помилки тут:" : "Ваше введення:"}
          </div>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              width: "100%",
              minHeight: "100px",
              background: "rgba(0,0,0,0.1)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              padding: "0.8rem 1rem",
              fontFamily: "var(--font-mono)",
              fontSize: "1.15rem",
              lineHeight: "1.5",
              color: "var(--text-primary)",
              resize: "none",
              outline: "none"
            }}
            placeholder="Почніть набирати текст тут..."
            autoFocus
          />
        </div>

        <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ padding: "0.8rem 3rem", fontSize: "1.1rem" }} onClick={handleVerify}>
            🔍 Перевірити
          </button>
        </div>
      </div>
    );
  }

  if (step === "result") {
    const isSuccess = result.score >= 90;
    
    return (
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        padding: "1.2rem 1.5rem",
        overflow: "hidden"
      }}>
        {/* Header — fixed */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexShrink: 0, marginBottom: "0.8rem" }}>
          <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>{isSuccess ? "🎉" : "🧐"}</span>
          <div>
            <h2 style={{ fontSize: "1.5rem", color: isSuccess ? "var(--success)" : "var(--warning)", margin: 0 }}>
              Результат вправи {activeExerciseIdx + 1}: {result.score}%
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>
              {isSuccess ? "Чудова робота! Ви засвоїли правило." : "Є помилки форматування. Подивімось детальніше."}
            </p>
          </div>
        </div>

        {/* Layout container — no outer scroll, holds elements and guides layout */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "0.8rem", overflow: "hidden" }}>

          {result.errors.length > 0 && (
            <div className="scrollable" style={{ 
              background: "rgba(239, 68, 68, 0.1)", 
              padding: "0.8rem 1.2rem", 
              borderRadius: "12px", 
              border: "1px solid rgba(239,68,68,0.2)", 
              flexShrink: 0,
              maxHeight: "clamp(80px, 15vh, 130px)",
              overflowY: "auto"
            }}>
              <h3 style={{ color: "var(--error)", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem" }}>
                ⚠️ Знайдені порушення правил:
              </h3>
              <ul style={{ paddingLeft: "1.2rem", color: "var(--text-primary)", lineHeight: "1.5", margin: 0, fontSize: "0.9rem" }}>
                {result.errors.map((err, i) => (
                  <li key={i} style={{ marginBottom: "0.2rem" }}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <h3 style={{ fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, flexShrink: 0 }}>
              Детальний розбір:
            </h3>
            <div className="scrollable" style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: "1.05rem", 
              lineHeight: "1.8", 
              padding: "1rem",
              background: "rgba(0,0,0,0.15)",
              borderRadius: "8px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              flex: 1,
              overflowY: "auto",
              minHeight: 0
            }}>
              {result.diff.map((d, i) => {
                if (d.type === 'correct')
                  return <span key={i} style={{ color: "var(--text-primary)" }}>{d.char === ' ' ? ' ' : d.char}</span>;
                if (d.type === 'extra')
                  return <span key={i} style={{ backgroundColor: "rgba(239,68,68,0.3)", color: "#ff8888", textDecoration: "line-through" }}>{d.char === ' ' ? '·' : d.char}</span>;
                if (d.type === 'missing')
                  return <span key={i} style={{ backgroundColor: "rgba(34,197,94,0.3)", color: "#88ff88" }}>{d.char === ' ' ? '·' : d.char}</span>;
                if (d.type === 'incorrect')
                  return <span key={i} style={{ backgroundColor: "rgba(234,179,8,0.3)", color: "#ffcc00" }} title={`Очікувалось: ${d.expected}`}>{d.char === ' ' ? '·' : d.char}</span>;
                return null;
              })}
            </div>
            <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.5rem", fontSize: "0.8rem", flexShrink: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ display: "inline-block", width: "12px", height: "12px", background: "rgba(239,68,68,0.35)", borderRadius: "2px" }}></span>Зайві</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ display: "inline-block", width: "12px", height: "12px", background: "rgba(34,197,94,0.35)", borderRadius: "2px" }}></span>Пропущені</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ display: "inline-block", width: "12px", height: "12px", background: "rgba(234,179,8,0.35)", borderRadius: "2px" }}></span>Неправильні</span>
            </div>
          </div>
        </div>

        {/* Footer buttons — fixed */}
        <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", paddingTop: "0.8rem", flexShrink: 0, borderTop: "1px solid rgba(0,0,0,0.05)", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => setStep("list")}>📁 До списку</button>
          <button className="btn btn-secondary" onClick={() => setStep("theory")}>📖 Теорія</button>
          
          {isSuccess ? (
            <>
              <button className="btn btn-secondary" onClick={() => setStep("practice")}>🔄 Ще раз</button>
              {activeExerciseIdx + 1 < sessionExercises.length ? (
                <button className="btn btn-primary" onClick={handleNextExercise}>
                  Наступна вправа ({activeExerciseIdx + 2} з {sessionExercises.length}) ➡️
                </button>
              ) : (
                ACADEMY_LESSONS.findIndex(l => l.id === selectedLessonId) + 1 < ACADEMY_LESSONS.length ? (
                  <button className="btn btn-primary" onClick={() => {
                    const nextIndex = ACADEMY_LESSONS.findIndex(l => l.id === selectedLessonId) + 1;
                    handleLessonSelect(ACADEMY_LESSONS[nextIndex].id);
                  }}>
                    Наступний урок ➡️
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => setStep("list")}>🎉 Завершити навчання</button>
                )
              )}
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setStep("practice")}>🔄 Спробувати знову</button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
