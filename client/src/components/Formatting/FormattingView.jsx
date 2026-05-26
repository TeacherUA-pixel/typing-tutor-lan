import React, { useState } from "react";
import { FORMATTING_LESSONS } from "../../data/formattingLessons";

// ── Utility: порівняння шаблону і введення ──────────────────
function verifyFormatting(template, input) {
  const t = template;
  const u = input;

  let correct = 0;
  let total = t.length;

  for (let i = 0; i < t.length; i++) {
    if (u[i] === t[i]) correct++;
  }

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const errors = total - correct + Math.max(0, u.length - t.length);
  return { accuracy, errors, correct, total };
}

// ── Space-aware template renderer ───────────────────────────
function TemplateDisplay({ text }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "1.05rem",
        lineHeight: "1.7",
        padding: "0.8rem 1rem",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "8px",
        whiteSpace: "pre-wrap",
        color: "var(--text-primary)",
      }}
    >
      {text.split("\n").map((line, lineIdx, lines) => (
        <React.Fragment key={lineIdx}>
          {line.split("").map((char, charIdx) =>
            char === " " ? (
              <span
                key={charIdx}
                style={{
                  background: "rgba(99,102,241,0.2)",
                  borderRadius: "2px",
                  marginLeft: "1px",
                  marginRight: "1px",
                  minWidth: "0.45em",
                  display: "inline-block",
                }}
              >
                &thinsp;
              </span>
            ) : char === "\t" ? (
              <span
                key={charIdx}
                style={{
                  background: "rgba(16,185,129,0.2)",
                  borderRadius: "2px",
                  minWidth: "2em",
                  display: "inline-block",
                  letterSpacing: "0.5em",
                }}
              >
                →
              </span>
            ) : (
              <span key={charIdx}>{char}</span>
            )
          )}
          {lineIdx < lines.length - 1 && (
            <span style={{ color: "var(--primary)", opacity: 0.5 }}>
              ↵<br />
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function FormattingView() {
  const [step, setStep] = useState("list"); // list | theory | practice | result
  const [selectedId, setSelectedId] = useState(null);
  const [sessionExercises, setSessionExercises] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);

  const lesson = FORMATTING_LESSONS.find((l) => l.id === selectedId);
  const exercise = sessionExercises[activeIdx];

  // ── Generate session exercises ──
  const generateExercises = (les) => {
    const pool = les.exercises;
    const small = pool.filter((e) => e.template.length < 120);
    const large = pool.filter((e) => e.template.length >= 120);
    const selected = [];

    if (small.length > 0) selected.push(small[Math.floor(Math.random() * small.length)]);
    else if (pool.length > 0) selected.push(pool[Math.floor(Math.random() * pool.length)]);

    if (large.length > 0) {
      const pick = large[Math.floor(Math.random() * large.length)];
      if (!selected.some((e) => e.id === pick.id)) selected.push(pick);
    } else if (pool.length > 1) {
      let p, attempts = 0;
      do { p = pool[Math.floor(Math.random() * pool.length)]; attempts++; }
      while (selected.some((e) => e.id === p.id) && attempts < 10);
      selected.push(p);
    }
    return selected;
  };

  const handleSelect = (id) => {
    const les = FORMATTING_LESSONS.find((l) => l.id === id);
    if (!les) return;
    const exs = generateExercises(les);
    setSelectedId(id);
    setSessionExercises(exs);
    setActiveIdx(0);
    setInputText("");
    setResult(null);
    setStep("theory");
  };

  const handleStartPractice = () => {
    setInputText("");
    setResult(null);
    setStep("practice");
  };

  const handleVerify = () => {
    if (!exercise) return;
    const res = verifyFormatting(exercise.template, inputText);
    setResult(res);
    setStep("result");
  };

  const handleNext = () => {
    const nextIdx = activeIdx + 1;
    if (nextIdx < sessionExercises.length) {
      setActiveIdx(nextIdx);
      setInputText("");
      setResult(null);
      setStep("practice");
    } else {
      setStep("list");
    }
  };

  const handleRandom = () => {
    if (!lesson) return;
    const pool = lesson.exercises.filter(
      (e) => !exercise || e.id !== exercise.id
    );
    const picked =
      pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : lesson.exercises[Math.floor(Math.random() * lesson.exercises.length)];
    const updated = [...sessionExercises];
    updated[activeIdx] = picked;
    setSessionExercises(updated);
    setInputText("");
    setResult(null);
  };

  const LEVEL_COLORS = { 1: "#10b981", 2: "#f59e0b", 3: "#ef4444" };
  const LEVEL_LABELS = { 1: "Початковий", 2: "Середній", 3: "Просунутий" };

  // ── LIST ────────────────────────────────────────────────────
  if (step === "list") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", margin: 0 }}>
            🖊️ Форматування тексту
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: "0.4rem", fontSize: "0.95rem" }}>
            Вчіться правильно оформлювати документи: відступи, списки, заголовки та структура.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {FORMATTING_LESSONS.map((les) => (
            <button
              key={les.id}
              onClick={() => handleSelect(les.id)}
              style={{
                background: "var(--card-bg)",
                border: `1px solid var(--card-border)`,
                borderRadius: "16px",
                padding: "1.4rem",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = les.color;
                e.currentTarget.style.boxShadow = `0 6px 20px ${les.color}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--card-border)";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  fontSize: "1.6rem",
                  fontFamily: "var(--font-mono)",
                  color: les.color,
                  fontWeight: "900",
                }}>
                  {les.icon}
                </span>
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "99px",
                  background: LEVEL_COLORS[les.level] + "22",
                  color: LEVEL_COLORS[les.level],
                }}>
                  {LEVEL_LABELS[les.level]}
                </span>
              </div>
              <div style={{ fontWeight: "700", fontSize: "1rem", color: "var(--text-primary)" }}>
                {les.title}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {les.exercises.length} вправ
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── THEORY ──────────────────────────────────────────────────
  if (step === "theory") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
          <h2 style={{ fontSize: "1.5rem", margin: 0 }}>
            📖 Теорія: {lesson?.title}
          </h2>
          <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem" }} onClick={() => setStep("list")}>
            📁 До списку
          </button>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ color: lesson?.color, fontSize: "1.2rem", marginTop: 0 }}>
            {lesson?.theory.title}
          </h3>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.7", marginBottom: "1.2rem" }}>
            {lesson?.theory.explanation}
          </p>

          {lesson?.theory.rules && (
            <div style={{ marginBottom: "1.2rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Структура:
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                padding: "0.8rem 1rem",
                fontSize: "0.95rem",
                lineHeight: "1.8",
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
              }}>
                {lesson.theory.rules.join("\n")}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                ✅ Правильно:
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: "8px",
                padding: "0.7rem",
                fontSize: "0.95rem",
                whiteSpace: "pre-wrap",
                color: "#10b981",
              }}>
                {lesson?.theory.correct}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                ❌ Неправильно:
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
                padding: "0.7rem",
                fontSize: "0.95rem",
                whiteSpace: "pre-wrap",
                color: "#ef4444",
              }}>
                {lesson?.theory.incorrect}
              </div>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "0.7rem 2rem", fontSize: "1rem" }} onClick={handleStartPractice}>
          ✍️ Перейти до практики →
        </button>
      </div>
    );
  }

  // ── PRACTICE ────────────────────────────────────────────────
  if (step === "practice") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1.5rem", margin: 0 }}>
            ✍️ Практика: {lesson?.title}{" "}
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: "normal" }}>
              (вправа {activeIdx + 1} з {sessionExercises.length})
            </span>
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem" }} onClick={() => setStep("list")}>📁 До списку</button>
            <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem" }} onClick={() => setStep("theory")}>📖 Теорія</button>
          </div>
        </div>

        {/* Template */}
        <div className="glass-panel" style={{ padding: "1rem 1.2rem", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700" }}>
              📋 Відтворіть точно так само:
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: "0.2rem 0.7rem", fontSize: "0.8rem", borderRadius: "8px" }}
              onClick={handleRandom}
              title="Випадкова вправа з цієї теми"
            >
              🎲 Рандом
            </button>
          </div>
          <div className="scrollable" style={{ maxHeight: "200px", overflowY: "auto" }}>
            <TemplateDisplay text={exercise?.template || ""} />
          </div>
        </div>

        {/* Input */}
        <div className="glass-panel" style={{ padding: "1rem 1.2rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", fontWeight: "700", flexShrink: 0 }}>
            Ваше введення:
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Починайте набирати текст точно як у шаблоні..."
            style={{
              flex: 1,
              width: "100%",
              minHeight: "120px",
              background: "rgba(0,0,0,0.1)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "1rem",
              lineHeight: "1.7",
              padding: "0.7rem",
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--card-border)")}
            spellCheck={false}
          />
        </div>

        <div style={{ display: "flex", gap: "0.8rem", flexShrink: 0 }}>
          <button
            className="btn btn-primary"
            style={{ padding: "0.7rem 2rem", fontSize: "1rem" }}
            onClick={handleVerify}
            disabled={!inputText.trim()}
          >
            ✅ Перевірити
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: "0.7rem 1.5rem" }}
            onClick={() => { setInputText(""); }}
          >
            🗑️ Очистити
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ──────────────────────────────────────────────────
  if (step === "result" && result) {
    const emoji = result.accuracy >= 95 ? "🏆" : result.accuracy >= 80 ? "✅" : result.accuracy >= 60 ? "📝" : "💪";
    const color = result.accuracy >= 95 ? "var(--success)" : result.accuracy >= 80 ? "var(--primary)" : result.accuracy >= 60 ? "var(--warning)" : "var(--error)";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", width: "100%", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: "4rem" }}>{emoji}</div>
        <h2 style={{ fontSize: "2rem", fontWeight: "800", color, margin: 0 }}>
          Точність: {result.accuracy}%
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", width: "100%", maxWidth: "480px" }}>
          {[
            { label: "Точність", value: `${result.accuracy}%`, color },
            { label: "Помилок", value: result.errors, color: result.errors === 0 ? "var(--success)" : "var(--warning)" },
            { label: "Символів", value: result.total, color: "var(--primary)" },
          ].map((s) => (
            <div key={s.label} className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ fontSize: "1.6rem", fontWeight: "800", color: s.color }}>{s.value}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {result.accuracy < 95 && (
          <div className="glass-panel" style={{ padding: "0.8rem 1.2rem", maxWidth: "480px", width: "100%" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              💡 Зверніть увагу на пробіли після розділових знаків та відступи між рядками.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            className="btn btn-secondary"
            style={{ padding: "0.7rem 1.5rem" }}
            onClick={() => { setInputText(""); setResult(null); setStep("practice"); }}
          >
            🔄 Ще раз
          </button>
          {activeIdx + 1 < sessionExercises.length ? (
            <button className="btn btn-primary" style={{ padding: "0.7rem 2rem" }} onClick={handleNext}>
              ➡️ Наступна вправа
            </button>
          ) : (
            <button className="btn btn-primary" style={{ padding: "0.7rem 2rem" }} onClick={() => setStep("list")}>
              📁 До списку тем
            </button>
          )}
          <button className="btn btn-secondary" style={{ padding: "0.7rem 1.5rem" }} onClick={() => setStep("theory")}>
            📖 Теорія
          </button>
        </div>
      </div>
    );
  }

  return null;
}
