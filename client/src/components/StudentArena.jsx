import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../App";
import AcademyView from "./Academy/AcademyView";
import FormattingView from "./Formatting/FormattingView";
import { calculateSchoolGrade } from "../utils/grading";

const EN_KEYBOARD = [
  [{c:"`", l:"`", u:"~"}, {c:"1", l:"1", u:"!"}, {c:"2", l:"2", u:"@"}, {c:"3", l:"3", u:"#"}, {c:"4", l:"4", u:"$"}, {c:"5", l:"5", u:"%"}, {c:"6", l:"6", u:"^"}, {c:"7", l:"7", u:"&"}, {c:"8", l:"8", u:"*"}, {c:"9", l:"9", u:"("}, {c:"0", l:"0", u:")"}, {c:"-", l:"-", u:"_"}, {c:"=", l:"=", u:"+"}, {c:"backspace", l:"Backspace", w:"wide"}],
  [{c:"tab", l:"Tab", w:"wide-sm"}, {c:"q", l:"q"}, {c:"w", l:"w"}, {c:"e", l:"e"}, {c:"r", l:"r"}, {c:"t", l:"t"}, {c:"y", l:"y"}, {c:"u", l:"u"}, {c:"i", l:"i"}, {c:"o", l:"o"}, {c:"p", l:"p"}, {c:"[", l:"[", u:"{"}, {c:"]", l:"]", u:"}"}, {c:"\\", l:"\\", u:"|"}],
  [{c:"caps", l:"Caps", w:"wide"}, {c:"a", l:"a"}, {c:"s", l:"s"}, {c:"d", l:"d"}, {c:"f", l:"f"}, {c:"g", l:"g"}, {c:"h", l:"h"}, {c:"j", l:"j"}, {c:"k", l:"k"}, {c:"l", l:"l"}, {c:";", l:";", u:":"}, {c:"'", l:"'", u:"\""}, {c:"enter", l:"Enter", w:"wide"}],
  [{c:"shift", l:"Shift", w:"wide-lg"}, {c:"z", l:"z"}, {c:"x", l:"x"}, {c:"c", l:"c"}, {c:"v", l:"v"}, {c:"b", l:"b"}, {c:"n", l:"n"}, {c:"m", l:"m"}, {c:",", l:",", u:"<"}, {c:".", l:".", u:">"}, {c:"/", l:"/", u:"?"}, {c:"shift", l:"Shift", w:"wide-lg"}],
  [{c:"ctrl", l:"Ctrl", w:"wide"}, {c:"win", l:"Win", w:"wide-sm"}, {c:"alt", l:"Alt", w:"wide-sm"}, {c:"space", l:" ", w:"space"}, {c:"alt", l:"Alt", w:"wide-sm"}, {c:"ctrl", l:"Ctrl", w:"wide"}]
];

const UA_KEYBOARD = [
  [{c:"'", l:"'", u:"₴"}, {c:"1", l:"1", u:"!"}, {c:"2", l:"2", u:"\""}, {c:"3", l:"3", u:"№"}, {c:"4", l:"4", u:";"}, {c:"5", l:"5", u:"%"}, {c:"6", l:"6", u:":"}, {c:"7", l:"7", u:"?"}, {c:"8", l:"8", u:"*"}, {c:"9", l:"9", u:"("}, {c:"0", l:"0", u:")"}, {c:"-", l:"-", u:"_"}, {c:"=", l:"=", u:"+"}, {c:"backspace", l:"Backspace", w:"wide"}],
  [{c:"tab", l:"Tab", w:"wide-sm"}, {c:"й", l:"й"}, {c:"ц", l:"ц"}, {c:"у", l:"у"}, {c:"к", l:"к"}, {c:"е", l:"е"}, {c:"н", l:"н"}, {c:"г", l:"г"}, {c:"ш", l:"ш"}, {c:"щ", l:"щ"}, {c:"з", l:"з"}, {c:"х", l:"х"}, {c:"ї", l:"ї"}, {c:"\\", l:"\\", u:"/"}],
  [{c:"caps", l:"Caps", w:"wide"}, {c:"ф", l:"ф"}, {c:"і", l:"і"}, {c:"в", l:"в"}, {c:"а", l:"а"}, {c:"п", l:"п"}, {c:"р", l:"р"}, {c:"о", l:"о"}, {c:"л", l:"л"}, {c:"д", l:"д"}, {c:"ж", l:"ж"}, {c:"є", l:"є"}, {c:"enter", l:"Enter", w:"wide"}],
  [{c:"shift", l:"Shift", w:"wide-lg"}, {c:"я", l:"я"}, {c:"ч", l:"ч"}, {c:"с", l:"с"}, {c:"м", l:"м"}, {c:"и", l:"и"}, {c:"т", l:"т"}, {c:"ь", l:"ь"}, {c:"б", l:"б"}, {c:"ю", l:"ю"}, {c:".", l:".", u:","}, {c:"shift", l:"Shift", w:"wide-lg"}],
  [{c:"ctrl", l:"Ctrl", w:"wide"}, {c:"win", l:"Win", w:"wide-sm"}, {c:"alt", l:"Alt", w:"wide-sm"}, {c:"space", l:" ", w:"space"}, {c:"alt", l:"Alt", w:"wide-sm"}, {c:"ctrl", l:"Ctrl", w:"wide"}]
];

const getNextKeyInfo = (char) => {
  if (!char) return [];
  if (char === " ") return ["space"];
  for (const kbd of [UA_KEYBOARD, EN_KEYBOARD]) {
    for (const row of kbd) {
      for (const k of row) {
        if (k.c === char.toLowerCase() || k.u === char || k.l.toLowerCase() === char.toLowerCase()) {
           const keys = [k.c];
           if (char !== char.toLowerCase() || k.u === char) {
             keys.push("shift");
           }
           return keys;
        }
      }
    }
  }
  return [];
};

const DIFFICULTY_LABELS = {
  easy: { label: "Легкий", emoji: "🟢", desc: "Прості слова, без символів" },
  medium: { label: "Середній", emoji: "🟡", desc: "Речення та пунктуація" },
  hard: { label: "Складний", emoji: "🔴", desc: "Складні тексти та символи" },
};

const LANG_LABELS = {
  ua: { label: "Українська", flag: "🇺🇦" },
  en: { label: "English", flag: "🇬🇧" },
  mixed: { label: "Змішана", flag: "🌐" },
  code: { label: "Код", flag: "💻" },
};

// Web Audio API Sound Generator
const playSound = (type, isMuted) => {
  if (isMuted) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    if (type === "click") {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } else if (type === "error") {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } else if (type === "finish") {
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const startTime = audioCtx.currentTime + index * 0.1;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    }
  } catch (err) {
    console.error("Web Audio API error:", err);
  }
};

// ─────────────────────────────────────────────────────────────
// Helper: load / save solo high scores from localStorage
// ─────────────────────────────────────────────────────────────
const LS_KEY = "solo_highscores";

function loadHighScores() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHighScore(entry) {
  const scores = loadHighScores();
  scores.unshift(entry);           // newest first
  const trimmed = scores.slice(0, 20); // keep last 20
  localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  return trimmed;
}

// ─────────────────────────────────────────────────────────────
// Solo Typing View (reusable typing engine without sockets)
// ─────────────────────────────────────────────────────────────
function SoloTypingView({ textData, language, isMuted, onFinish, onBack, sharedLayout }) {
  const [soloStep, setSoloStep] = useState("countdown"); // countdown | typing | done
  const [countdown, setCountdown] = useState(3);
  const [typedText, setTypedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [startTime, setStartTime] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [capsLock, setCapsLock] = useState(false);
  const [numLock, setNumLock] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Countdown
  useEffect(() => {
    let count = 3;
    setCountdown(count);
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count === 0) {
        clearInterval(countdownRef.current);
        setSoloStep("typing");
        setStartTime(Date.now());
      } else {
        setCountdown(count);
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // Focus
  useEffect(() => {
    if (soloStep === "typing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [soloStep]);

  // Track CapsLock / NumLock state
  useEffect(() => {
    const handleKey = (e) => {
      if (e.getModifierState) {
        setCapsLock(e.getModifierState("CapsLock"));
        setNumLock(e.getModifierState("NumLock"));
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
    };
  }, []);



  // Live timer
  useEffect(() => {
    if (soloStep !== "typing") return;
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
    return () => clearInterval(timerRef.current);
  }, [soloStep, startTime]);

  const handleInput = (e) => {
    if (soloStep !== "typing" || !textData) return;
    const value = e.target.value;
    const expectedText = textData.text;

    if (value.length > typedText.length) {
      const charTyped = value[value.length - 1];
      const charExpected = expectedText[charIndex];

      if (charTyped === charExpected) {
        playSound("click", isMuted);
        setHasError(false);
        const nextTyped = typedText + charTyped;
        setTypedText(nextTyped);
        const nextIndex = charIndex + 1;
        setCharIndex(nextIndex);

        const timeElapsedMs = Date.now() - startTime;
        let currentWpm = 0;
        if (timeElapsedMs > 2000) {
          currentWpm = Math.round((nextIndex / 5) / (timeElapsedMs / 1000 / 60));
        } else {
          currentWpm = Math.min(Math.round((nextIndex / 5) / (2 / 60)), 150);
        }
        setWpm(currentWpm || 0);

        const currentAccuracy = Math.round(((nextIndex - errorsCount) / nextIndex) * 100);
        setAccuracy(Math.max(currentAccuracy, 0));

        if (nextIndex === expectedText.length) {
          clearInterval(timerRef.current);
          playSound("finish", isMuted);
          setSoloStep("done");
          onFinish({ wpm: currentWpm || 0, accuracy: Math.max(currentAccuracy, 0), errors: errorsCount, time: elapsedSec });
        }
      } else {
        playSound("error", isMuted);
        setHasError(true);
        setErrorsCount(prev => prev + 1);
        const currentAccuracy = Math.round(((charIndex - (errorsCount + 1)) / (charIndex + 1)) * 100);
        setAccuracy(Math.max(currentAccuracy, 0));
      }
    }
  };

  const expectedChar = textData?.text[charIndex];
  const expectedLang = expectedChar ? (/[а-яА-ЯєЄіІїЇґҐ]/.test(expectedChar) ? "ua" : /[a-zA-Z]/.test(expectedChar) ? "en" : null) : null;

  const activeLayout = sharedLayout || (language === "mixed" ? "ua" : language);
  const keyboardRows = activeLayout === "ua" ? UA_KEYBOARD : EN_KEYBOARD;
  const activeKeys = getNextKeyInfo(textData?.text[charIndex]);

  const progress = textData ? Math.round((charIndex / textData.text.length) * 100) : 0;
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (soloStep === "countdown") {
    return (
      <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", minHeight: "250px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="countdown-overlay">
          <div style={{ color: "var(--text-secondary)", fontSize: "1.2rem", fontWeight: "600", marginBottom: "1rem" }}>
            Приготуйте руки до клавіатури!
          </div>
          <div className="countdown-number">{countdown}</div>
          <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
            📄 {textData?.title}
          </div>
        </div>
      </div>
    );
  }

  if (soloStep === "done") {
    return null; // parent handles "done" screen
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "clamp(0.4rem, 1vh, 1rem)",
      flex: 1,
      minHeight: 0,
      overflow: "visible",
    }}>
      {/* Stats Bar */}
      <div className="glass-panel stats-bar">
        <div className="stat-box">
          <span className="stat-value">{wpm * 5}</span>
          <span className="stat-label">Швидкість (зн/хв)</span>
        </div>
        <div className="stat-box">
          <span className="stat-value" style={{ color: accuracy < 90 ? "var(--warning)" : "var(--success)" }}>
            {accuracy}%
          </span>
          <span className="stat-label">Точність</span>
        </div>
        <div className="stat-box">
          <span className="stat-value" style={{ color: "var(--primary)" }}>{progress}%</span>
          <span className="stat-label">Прогрес</span>
        </div>
        <div className="stat-box">
          <span className="stat-value" style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem" }}>
            {formatTime(elapsedSec)}
          </span>
          <span className="stat-label">Час</span>
        </div>
        
        {/* Вбудована кнопка Відмінити */}
        <div className="stat-box" style={{ justifyContent: "center", alignItems: "center" }}>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ padding: "0.4rem 0.8rem", borderRadius: "10px", fontSize: "0.9rem", fontWeight: "700" }}>
            ✕ Скасувати
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: "8px", borderRadius: "99px", background: "rgba(99,102,241,0.12)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--primary), var(--accent))",
          borderRadius: "99px",
          transition: "width 0.15s ease"
        }} />
      </div>

      {/* Typing Area */}
      <div
        className="glass-panel typing-card"
        onClick={() => inputRef.current && inputRef.current.focus()}
        style={{ cursor: "text" }}
      >
        <input
          ref={inputRef}
          type="text"
          className="input-hidden"
          value={typedText}
          onChange={handleInput}
        />
        <div className="typing-text-display">
          {textData.text.split("").map((char, index) => {
            let charClass = "char";
            if (index < charIndex) {
              charClass += " correct";
            } else if (index === charIndex) {
              charClass += " current";
              if (hasError) charClass += " incorrect";
            }
            return (
              <span key={index} className={charClass}>
                {char === "\n" ? "↵\n" : char}
              </span>
            );
          })}
        </div>
      </div>

      {/* Keyboard Helper */}
      <div className="keyboard-helper">
        <div className="keyboard-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <span className="keyboard-lang-label">
              Очікується: {language === "ua" || language === "mixed" ? "🇺🇦 Українська" : "🇬🇧 English"}
            </span>
            {sharedLayout && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", opacity: 0.8 }}>
                | Виявлено: {sharedLayout === "ua" ? "🇺🇦" : "🇬🇧"}
              </span>
            )}
            {sharedLayout && expectedLang && sharedLayout !== expectedLang && (
              <span style={{ fontSize: "0.75rem", color: "var(--error)", fontWeight: "700" }}>
                ⚠️ Перемкніть розкладку на {expectedLang === "ua" ? "UA 🇺🇦" : "EN 🇬🇧"}
              </span>
            )}
          </div>
          <div className="keyboard-locks">
            <div className={`lock-indicator${capsLock ? " active" : ""}`}>
              <span className="lock-dot"></span>
              Caps
            </div>
            <div className={`lock-indicator${numLock ? " active" : ""}`}>
              <span className="lock-dot"></span>
              Num
            </div>
          </div>
        </div>
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row">
            {row.map((k, i) => (
              <div key={`${k.c}-${i}`} className={`key ${k.w ? k.w : ""} ${activeKeys.includes(k.c) ? "highlighted" : ""}`}>
                {k.u ? (
                  <>
                    <span className="sub-char">{k.u}</span>
                    <span className="main-char">{k.l.toUpperCase()}</span>
                  </>
                ) : (
                  <span className="main-char">{k.l.length === 1 ? k.l.toUpperCase() : k.l}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main StudentArena component
// ─────────────────────────────────────────────────────────────
function StudentArena({ onBackHome }) {
  // Tab: "battle" | "solo"
  const [activeTab, setActiveTab] = useState("battle");

  // ── Battle Mode states ──────────────────────────────────────
  const [step, setStep] = useState("join"); // join | waiting | countdown | typing | finished
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [textData, setTextData] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [studentsProgress, setStudentsProgress] = useState([]);
  const [results, setResults] = useState([]);
  const [language, setLanguage] = useState("ua");

  // Battle typing states
  const [typedText, setTypedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [startTime, setStartTime] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [battleCapsLock, setBattleCapsLock] = useState(false);
  const [battleNumLock, setBattleNumLock] = useState(false);
  const [sharedLayout, setSharedLayout] = useState(null); // 'ua' | 'en' | null

  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // ── Solo Mode states ────────────────────────────────────────
  const [soloLang, setSoloLang] = useState("ua");
  const [soloDifficulty, setSoloDifficulty] = useState("easy");
  const [soloTexts, setSoloTexts] = useState({});
  const [soloStep, setSoloStep] = useState("setup"); // setup | typing | done
  const [soloTextData, setSoloTextData] = useState(null);
  const [soloResult, setSoloResult] = useState(null);
  const [highScores, setHighScores] = useState(loadHighScores());
  const [soloIsMuted, setSoloIsMuted] = useState(false);
  const [loadingTexts, setLoadingTexts] = useState(false);

  // Fetch available texts for solo mode
  useEffect(() => {
    if (activeTab === "solo" && Object.keys(soloTexts).length === 0) {
      setLoadingTexts(true);
      fetch(`${BACKEND_URL}/api/texts`)
        .then(r => r.json())
        .then(data => {
          setSoloTexts(data);
          setLoadingTexts(false);
        })
        .catch(() => setLoadingTexts(false));
    }
  }, [activeTab]);

  // Get available texts for current solo lang/difficulty
  const availableSoloTexts = soloTexts[soloLang]?.filter(t => t.difficulty === soloDifficulty) || [];

  // ── Battle Mode cleanup ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (step === "typing" && inputRef.current) inputRef.current.focus();
  }, [step]);

  // Track CapsLock / NumLock state for battle mode
  useEffect(() => {
    const handleKey = (e) => {
      if (e.getModifierState) {
        setBattleCapsLock(e.getModifierState("CapsLock"));
        setBattleNumLock(e.getModifierState("NumLock"));
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
    };
  }, []);

  // Track actual keyboard layout language globally across the entire StudentArena
  useEffect(() => {
    const handleGlobalLayoutDetect = (e) => {
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;
      const char = e.key;
      const isCyrillic = /[а-яА-ЯёЁєЄіІїЇґҐ]/.test(char);
      const isLatin = /[a-zA-Z]/.test(char);
      if (isCyrillic) {
        setSharedLayout("ua");
      } else if (isLatin) {
        setSharedLayout("en");
      }
    };
    window.addEventListener("keydown", handleGlobalLayoutDetect);
    return () => window.removeEventListener("keydown", handleGlobalLayoutDetect);
  }, []);

  // ── Battle join handler ─────────────────────────────────────
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomCode.trim() || !name.trim()) return;

    socketRef.current = io(BACKEND_URL);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-room", { roomCode: roomCode.trim(), name: name.trim() }, (response) => {
        if (response.error) {
          alert(response.error);
          socketRef.current.disconnect();
          return;
        }
        setTextData(response.text);
        setLanguage(response.text.id.startsWith("ua") ? "ua" : "en");
        setStep("waiting");
      });
    });

    socketRef.current.on("student-list-update", setStudentsProgress);

    socketRef.current.on("game-started", () => {
      setStep("countdown");
      let count = 3;
      setCountdown(count);
      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count === 0) {
          clearInterval(countdownIntervalRef.current);
          setStep("typing");
          setStartTime(Date.now());
        } else {
          setCountdown(count);
        }
      }, 1000);
    });

    socketRef.current.on("progress-update", setStudentsProgress);
    socketRef.current.on("game-finished", (finalResults) => {
      setResults(finalResults);
      setStep("finished");
    });
    socketRef.current.on("teacher-disconnected", () => {
      alert("Вчитель закрив кімнату або відключився від мережі.");
      handleDisconnect();
    });
  };

  const handleDisconnect = () => {
    if (socketRef.current) socketRef.current.disconnect();
    setStep("join");
    setRoomCode("");
    setTextData(null);
    setTypedText("");
    setCharIndex(0);
    setErrorsCount(0);
    setWpm(0);
    setAccuracy(100);
    setStartTime(null);
    onBackHome();
  };

  // ── Battle typing handler ───────────────────────────────────
  const handleInputChange = (e) => {
    if (step !== "typing" || !textData) return;
    const value = e.target.value;
    const expectedText = textData.text;

    if (value.length > typedText.length) {
      const charTyped = value[value.length - 1];
      const charExpected = expectedText[charIndex];

      if (charTyped === charExpected) {
        playSound("click", isMuted);
        setHasError(false);
        const nextTyped = typedText + charTyped;
        setTypedText(nextTyped);
        const nextIndex = charIndex + 1;
        setCharIndex(nextIndex);

        const timeElapsedMs = Date.now() - startTime;
        let currentWpm = 0;
        if (timeElapsedMs > 2000) {
          currentWpm = Math.round((nextIndex / 5) / (timeElapsedMs / 1000 / 60));
        } else {
          currentWpm = Math.min(Math.round((nextIndex / 5) / (2 / 60)), 150);
        }
        setWpm(currentWpm || 0);
        const currentAccuracy = Math.round(((nextIndex - errorsCount) / nextIndex) * 100);
        setAccuracy(currentAccuracy >= 0 ? currentAccuracy : 100);

        const progressPercent = (nextIndex / expectedText.length) * 100;
        const finished = nextIndex === expectedText.length;

        socketRef.current.emit("update-progress", { roomCode, progress: progressPercent, wpm: currentWpm || 0, accuracy: currentAccuracy >= 0 ? currentAccuracy : 100, finished });

        if (finished) {
          playSound("finish", isMuted);
          setStep("finished");
        }
      } else {
        playSound("error", isMuted);
        setHasError(true);
        setErrorsCount(prev => prev + 1);
        const currentAccuracy = Math.round(((charIndex - (errorsCount + 1)) / (charIndex + 1)) * 100);
        setAccuracy(currentAccuracy >= 0 ? currentAccuracy : 100);
      }
    }
  };

  const activeLayout = sharedLayout || language;
  const keyboardRows = activeLayout === "ua" ? UA_KEYBOARD : EN_KEYBOARD;
  const activeKeys = getNextKeyInfo(textData?.text[charIndex]);

  // ── Solo Mode handlers ──────────────────────────────────────
  const handleStartSolo = () => {
    if (availableSoloTexts.length === 0) return;
    const picked = availableSoloTexts[Math.floor(Math.random() * availableSoloTexts.length)];
    setSoloTextData(picked);
    setSoloResult(null);
    setSoloStep("typing");
  };

  const handleSoloFinish = useCallback((result) => {
    const entry = {
      lang: soloLang,
      difficulty: soloDifficulty,
      title: soloTextData?.title,
      wpm: result.wpm,
      accuracy: result.accuracy,
      errors: result.errors,
      time: result.time,
      date: new Date().toLocaleString("uk-UA"),
    };
    const updated = saveHighScore(entry);
    setHighScores(updated);
    setSoloResult(result);
    setSoloStep("done");
  }, [soloLang, soloDifficulty, soloTextData]);

  const handleSoloBack = () => {
    setSoloStep("setup");
    setSoloTextData(null);
    setSoloResult(null);
  };

  const handleSoloRetry = () => {
    setSoloStep("setup");
    setSoloResult(null);
  };

  // ── Render ──────────────────────────────────────────────────

  // If in solo typing mode, render the typing view fullscreen
  if (activeTab === "solo" && soloStep === "typing") {
    return (
      <div className="arena-layout">
        <SoloTypingView
          textData={soloTextData}
          language={soloLang}
          isMuted={soloIsMuted}
          onFinish={handleSoloFinish}
          onBack={handleSoloBack}
          sharedLayout={sharedLayout}
        />
      </div>
    );
  }

  // If in Academy mode, render the Academy View
  if (activeTab === "academy") {
    return (
      <div className="arena-layout" style={{ maxWidth: "96%", width: "96%" }}>
        <div className="mode-tabs">
          <button className={`mode-tab ${activeTab === "battle" ? "active" : ""}`} onClick={() => setActiveTab("battle")}>⚔️ Приєднатись до змагання</button>
          <button className={`mode-tab ${activeTab === "solo" ? "active" : ""}`} onClick={() => setActiveTab("solo")}>🎯 Самостійне тренування</button>
          <button className={`mode-tab ${activeTab === "academy" ? "active" : ""}`} onClick={() => setActiveTab("academy")}>📝 Академія набору</button>
          <button className={`mode-tab ${activeTab === "formatting" ? "active" : ""}`} onClick={() => setActiveTab("formatting")}>🖊️ Форматування</button>
        </div>
        <AcademyView />
      </div>
    );
  }

  // If in Formatting mode, render the Formatting View
  if (activeTab === "formatting") {
    return (
      <div className="arena-layout" style={{ maxWidth: "96%", width: "96%" }}>
        <div className="mode-tabs">
          <button className={`mode-tab ${activeTab === "battle" ? "active" : ""}`} onClick={() => setActiveTab("battle")}>⚔️ Приєднатись до змагання</button>
          <button className={`mode-tab ${activeTab === "solo" ? "active" : ""}`} onClick={() => setActiveTab("solo")}>🎯 Самостійне тренування</button>
          <button className={`mode-tab ${activeTab === "academy" ? "active" : ""}`} onClick={() => setActiveTab("academy")}>📝 Академія набору</button>
          <button className={`mode-tab ${activeTab === "formatting" ? "active" : ""}`} onClick={() => setActiveTab("formatting")}>🖊️ Форматування</button>
        </div>
        <FormattingView />
      </div>
    );
  }

  return (
    <div className="arena-layout">
      {/* ── Tab switcher (only on entry screen) ── */}
      {(step === "join" || activeTab === "solo") && soloStep !== "done" && (
        <div className="mode-tabs">
          <button className={`mode-tab ${activeTab === "battle" ? "active" : ""}`} onClick={() => setActiveTab("battle")}>⚔️ Приєднатись до змагання</button>
          <button className={`mode-tab ${activeTab === "solo" ? "active" : ""}`} onClick={() => setActiveTab("solo")}>🎯 Самостійне тренування</button>
          <button className={`mode-tab ${activeTab === "academy" ? "active" : ""}`} onClick={() => setActiveTab("academy")}>📝 Академія набору</button>
          <button className={`mode-tab ${activeTab === "formatting" ? "active" : ""}`} onClick={() => setActiveTab("formatting")}>🖊️ Форматування</button>
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* BATTLE MODE                              */}
      {/* ════════════════════════════════════════ */}
      {activeTab === "battle" && (
        <>
          {step === "join" && (
            <div className="glass-panel join-container">
              <h2>🎒 Приєднатися до змагання</h2>
              <form onSubmit={handleJoinRoom} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div className="form-group">
                  <label>Код кімнати (4 цифри)</label>
                  <input
                    type="text"
                    maxLength="4"
                    required
                    className="form-control"
                    placeholder="Наприклад: 1234"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="form-group">
                  <label>Ваше ім'я (прізвище та ім'я)</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Наприклад: Коваленко Андрій"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
                  Увійти в кабінет
                </button>
              </form>
            </div>
          )}

          {step === "waiting" && (
            <div className="glass-panel" style={{ padding: "2.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "3rem" }}>⌛</span>
              <h2 style={{ fontSize: "1.8rem", margin: "1rem 0" }}>Ви успішно приєдналися!</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                Вітаємо, <strong style={{ color: "var(--text-primary)" }}>{name}</strong>. Кімната <strong>{roomCode}</strong> активована.<br />
                Будь ласка, зачекайте, поки вчитель запустить змагання.
              </p>
              <div style={{ maxWidth: "400px", margin: "0 auto", borderTop: "1px solid var(--card-border)", paddingTop: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--text-secondary)" }}>Інші учасники в кімнаті:</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                  {studentsProgress.map((student) => (
                    <span key={student.id} className="badge badge-info" style={{ padding: "0.5rem 0.8rem", borderRadius: "20px", background: student.name === name ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)" }}>
                      👤 {student.name} {student.name === name ? "(Ви)" : ""}
                    </span>
                  ))}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={handleDisconnect} style={{ marginTop: "2rem" }}>
                Вийти з кімнати
              </button>
            </div>
          )}

          {step === "countdown" && (
            <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", minHeight: "250px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div className="countdown-overlay">
                <div style={{ color: "var(--text-secondary)", fontSize: "1.2rem", fontWeight: "600", marginBottom: "1rem" }}>Приготуйте руки до клавіатури!</div>
                <div className="countdown-number">{countdown}</div>
              </div>
            </div>
          )}

          {step === "typing" && (
            <div className="battle-arena-wrapper">
              <div className="glass-panel stats-bar">
                <div className="stat-box">
                  <span className="stat-value">{wpm * 5}</span>
                  <span className="stat-label">Швидкість (зн/хв)</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value" style={{ color: accuracy < 90 ? "var(--warning)" : "var(--success)" }}>{accuracy}%</span>
                  <span className="stat-label">Точність</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value" style={{ color: "var(--primary)" }}>{Math.round((charIndex / textData.text.length) * 100)}%</span>
                  <span className="stat-label">Прогрес</span>
                </div>

                <div className="stat-box" style={{ justifyContent: "center", alignItems: "center" }}>
                  <button type="button" className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} style={{ padding: "0.4rem 0.8rem", borderRadius: "10px", fontSize: "1.1rem", minWidth: "40px" }} title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}>
                    {isMuted ? "🔇" : "🔊"}
                  </button>
                  <span className="stat-label">Звук</span>
                </div>

                {/* Вбудована кнопка Вийти */}
                <div className="stat-box" style={{ justifyContent: "center", alignItems: "center" }}>
                  <button type="button" className="btn btn-secondary" onClick={handleDisconnect} style={{ padding: "0.4rem 0.8rem", borderRadius: "10px", fontSize: "0.9rem", fontWeight: "700" }}>
                    ✕ Вийти
                  </button>
                </div>
              </div>

              <div className="glass-panel typing-card" onClick={() => inputRef.current && inputRef.current.focus()} style={{ cursor: "text" }}>
                <input ref={inputRef} type="text" className="input-hidden" value={typedText} onChange={handleInputChange} />
                <div className="typing-text-display">
                  {textData.text.split("").map((char, index) => {
                    let charClass = "char";
                    if (index < charIndex) charClass += " correct";
                    else if (index === charIndex) { charClass += " current"; if (hasError) charClass += " incorrect"; }
                    return <span key={index} className={charClass}>{char === "\n" ? "↵\n" : char}</span>;
                  })}
                </div>
              </div>

              <div className="keyboard-helper">
                <div className="keyboard-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <span className="keyboard-lang-label">
                      Очікується: {language === "ua" ? "🇺🇦 Українська" : "🇬🇧 English"}
                    </span>
                    {sharedLayout && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", opacity: 0.8 }}>
                        | Виявлено: {sharedLayout === "ua" ? "🇺🇦" : "🇬🇧"}
                      </span>
                    )}
                    {sharedLayout && expectedLang && sharedLayout !== expectedLang && (
                      <span style={{ fontSize: "0.75rem", color: "var(--error)", fontWeight: "700" }}>
                        ⚠️ Перемкніть розкладку на {expectedLang === "ua" ? "UA 🇺🇦" : "EN 🇬🇧"}
                      </span>
                    )}
                  </div>
                  <div className="keyboard-locks">
                    <div className={`lock-indicator${battleCapsLock ? " active" : ""}`}>
                      <span className="lock-dot"></span>
                      Caps
                    </div>
                    <div className={`lock-indicator${battleNumLock ? " active" : ""}`}>
                      <span className="lock-dot"></span>
                      Num
                    </div>
                  </div>
                </div>
                {keyboardRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="keyboard-row">
                    {row.map((k, i) => (
                      <div key={`${k.c}-${i}`} className={`key ${k.w ? k.w : ""} ${activeKeys.includes(k.c) ? "highlighted" : ""}`}>
                        {k.u ? (
                          <>
                            <span className="sub-char">{k.u}</span>
                            <span className="main-char">{k.l.toUpperCase()}</span>
                          </>
                        ) : (
                          <span className="main-char">{k.l.length === 1 ? k.l.toUpperCase() : k.l}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="glass-panel competition-panel">
                <h3 className="competition-title">👥 Змагання у реальному часі:</h3>
                <div className="progress-monitor scrollable">
                  {studentsProgress.map((student) => (
                    <div key={student.id} className="track-row">
                      <div className="track-header">
                        <span className="track-name" style={{ fontWeight: student.name === name ? "800" : "600" }}>
                          🏁 {student.name} {student.name === name ? "(Ви)" : ""}
                          {student.finished && <span style={{ color: "var(--success)", fontSize: "0.8rem", fontWeight: "bold", marginLeft: "0.5rem" }}>● Фініш!</span>}
                        </span>
                        <span className="track-stats">{student.wpm * 5} зн/хв | {student.accuracy}% | {Math.round(student.progress)}%</span>
                      </div>
                      <div className="track-bg">
                        <div className={`track-fill ${student.finished ? "finished" : ""}`} style={{ width: `${student.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "finished" && (
            <div className="glass-panel" style={{ padding: "2.5rem 2rem", textAlign: "center" }}>
              <span style={{ fontSize: "3rem" }}>🏆</span>
              <h2 style={{ fontSize: "2rem", fontWeight: "800", color: "var(--success)", margin: "1rem 0" }}>Вітаємо! Ви фінішували!</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                Ваш результат: <strong style={{ color: "var(--text-primary)", fontSize: "1.2rem" }}>{wpm * 5} зн/хв</strong> з точністю <strong style={{ color: "var(--text-primary)", fontSize: "1.2rem" }}>{accuracy}%</strong>.<br />
                Оцінка за шкільними критеріями: <strong style={{ color: "var(--primary)", fontSize: "1.2rem" }}>{calculateSchoolGrade(wpm * 5, accuracy).grade} балів</strong> ({calculateSchoolGrade(wpm * 5, accuracy).level} рівень).<br />
                Будь ласка, зачекайте, поки інші учасники завершать гру.
              </p>
              {results.length > 0 && (
                <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: "1.5rem", textAlign: "left" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1rem", textAlign: "center" }}>📊 Рейтинг учасників</h3>
                  <table className="leaderboard-table">
                    <thead><tr><th>Місце</th><th>Ім'я</th><th>зн/хв</th><th>Точність</th><th>Оцінка</th></tr></thead>
                    <tbody>
                      {results.map((student, index) => {
                        const gradeInfo = calculateSchoolGrade(student.wpm * 5, student.accuracy);
                        return (
                          <tr key={index} style={{ background: student.name === name ? "rgba(99,102,241,0.08)" : "transparent" }}>
                            <td><span className={`rank-badge rank-${student.rank}`}>{student.rank}</span></td>
                            <td style={{ fontWeight: 600 }}>{student.name} {student.name === name ? "(Ви)" : ""}</td>
                            <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{student.wpm * 5}</td>
                            <td>{student.accuracy}%</td>
                            <td style={{ fontWeight: 800, color: "var(--primary)" }}>{gradeInfo.grade}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <button className="btn btn-secondary" onClick={handleDisconnect} style={{ marginTop: "2rem" }}>Вийти на головну</button>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════ */}
      {/* SOLO MODE                               */}
      {/* ════════════════════════════════════════ */}
      {activeTab === "solo" && soloStep === "setup" && (
        <div className="solo-setup-wrapper">
          {/* Settings panel */}
          <div className="glass-panel solo-setup-card" style={{ padding: "clamp(0.8rem, 2.2vh, 2rem)" }}>
            <h2 style={{ marginBottom: "clamp(0.2rem, 0.5vh, 0.4rem)", fontSize: "clamp(1.2rem, 3vh, 1.8rem)" }}>🎯 Самостійне тренування</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "clamp(0.6rem, 1.8vh, 1.8rem)", fontSize: "clamp(0.8rem, 1.5vh, 0.95rem)" }}>
              Вибери мову та рівень складності, щоб розпочати тренування без вчителя.
            </p>

            {/* Language selector */}
            <div style={{ marginBottom: "clamp(0.6rem, 1.8vh, 1.5rem)" }}>
              <label style={{ display: "block", fontWeight: "700", marginBottom: "clamp(0.2rem, 0.6vh, 0.7rem)", fontSize: "clamp(0.75rem, 1.4vh, 0.9rem)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                🌐 Мова / категорія
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.6rem" }}>
                {Object.entries(LANG_LABELS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setSoloLang(key)}
                    className={`solo-selector-btn ${soloLang === key ? "selected" : ""}`}
                  >
                    <span className="flag">{val.flag}</span>
                    <span className="label">{val.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty selector */}
            <div style={{ marginBottom: "clamp(0.8rem, 2.2vh, 2rem)" }}>
              <label style={{ display: "block", fontWeight: "700", marginBottom: "clamp(0.2rem, 0.6vh, 0.7rem)", fontSize: "clamp(0.75rem, 1.4vh, 0.9rem)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                🎚️ Рівень складності
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
                {Object.entries(DIFFICULTY_LABELS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setSoloDifficulty(key)}
                    className={`solo-diff-btn ${soloDifficulty === key ? "selected" : ""}`}
                  >
                    <span className="emoji">{val.emoji}</span>
                    <span className="label">{val.label}</span>
                    <span className="solo-diff-desc">{val.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview available text */}
            {loadingTexts ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem" }}>Завантаження текстів…</div>
            ) : availableSoloTexts.length === 0 ? (
              <div className="solo-no-text">
                ⚠️ Немає текстів для вибраної мови та рівня складності.
              </div>
            ) : (
              <div className="solo-text-preview">
                <div style={{ fontSize: "clamp(0.7rem, 1.3vh, 0.8rem)", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  📄 Доступно текстів: {availableSoloTexts.length} — буде обрано випадково
                </div>
                <div style={{ fontSize: "clamp(0.8rem, 1.5vh, 0.92rem)", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: "1.4" }}>
                  "{availableSoloTexts[0].text.slice(0, 120)}{availableSoloTexts[0].text.length > 120 ? "…" : ""}"
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "clamp(0.6rem, 1.8vh, 1.5rem)" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: "clamp(0.85rem, 1.8vh, 1.05rem)", padding: "clamp(0.5rem, 1.2vh, 0.85rem)" }}
                onClick={handleStartSolo}
                disabled={availableSoloTexts.length === 0 || loadingTexts}
              >
                🚀 Почати тренування
              </button>
              <button
                onClick={() => setSoloIsMuted(m => !m)}
                className="btn btn-secondary"
                title={soloIsMuted ? "Увімкнути звук" : "Вимкнути звук"}
                style={{ padding: "clamp(0.5rem, 1.2vh, 0.85rem) clamp(0.7rem, 1.5vw, 1.1rem)", fontSize: "clamp(1rem, 2vh, 1.2rem)" }}
              >
                {soloIsMuted ? "🔇" : "🔊"}
              </button>
            </div>
          </div>

          {/* High scores */}
          {highScores.length > 0 && (
            <div className="glass-panel solo-setup-highscores" style={{ padding: "clamp(0.6rem, 1.8vh, 1.8rem)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                <h3 style={{ fontSize: "clamp(0.9rem, 1.8vh, 1.1rem)", fontWeight: "700" }}>🏅 Мої рекорди (останні)</h3>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "clamp(0.68rem, 1.4vh, 0.78rem)", padding: "clamp(0.2rem, 0.5vh, 0.3rem) clamp(0.4rem, 1vw, 0.7rem)" }}
                  onClick={() => { localStorage.removeItem(LS_KEY); setHighScores([]); }}
                >
                  Очистити
                </button>
              </div>
              <div className="scrollable highscores-scrollable" style={{ overflowY: "auto", maxHeight: "clamp(80px, 15vh, 190px)" }}>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Мова</th>
                      <th>Рівень</th>
                      <th>зн/хв</th>
                      <th>Точність</th>
                      <th>Оцінка</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highScores.slice(0, 15).map((s, i) => (
                      <tr key={i}>
                        <td><span className={`rank-badge rank-${i + 1}`}>{i + 1}</span></td>
                        <td>{LANG_LABELS[s.lang]?.flag} {LANG_LABELS[s.lang]?.label}</td>
                        <td>{DIFFICULTY_LABELS[s.difficulty]?.emoji} {DIFFICULTY_LABELS[s.difficulty]?.label}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--primary)" }}>{s.wpm * 5}</td>
                        <td style={{ color: s.accuracy >= 95 ? "var(--success)" : s.accuracy >= 80 ? "var(--warning)" : "var(--error)" }}>{s.accuracy}%</td>
                        <td style={{ fontWeight: "800", color: "var(--accent)" }}>{calculateSchoolGrade(s.wpm * 5, s.accuracy).grade}</td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{s.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Solo Done Screen */}
      {activeTab === "solo" && soloStep === "done" && soloResult && (
        <div className="glass-panel" style={{ padding: "2.5rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>
            {soloResult.wpm >= 80 ? "🚀" : soloResult.wpm >= 50 ? "🎉" : "💪"}
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: "800", color: "var(--success)", margin: "0.5rem 0 1.5rem" }}>
            Тренування завершено!
          </h2>

          {/* Result stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div className="solo-result-stat" style={{ border: "2px solid var(--primary)", background: "rgba(99,102,241,0.1)" }}>
              <span className="stat-value" style={{ color: "var(--primary)" }}>{calculateSchoolGrade(soloResult.wpm * 5, soloResult.accuracy).grade}</span>
              <span className="stat-label">Оцінка (балів)</span>
            </div>
            <div className="solo-result-stat">
              <span className="stat-value">{soloResult.wpm * 5}</span>
              <span className="stat-label">зн/хв</span>
            </div>
            <div className="solo-result-stat">
              <span className="stat-value" style={{ color: soloResult.accuracy >= 95 ? "var(--success)" : soloResult.accuracy >= 80 ? "var(--warning)" : "var(--error)" }}>
                {soloResult.accuracy}%
              </span>
              <span className="stat-label">Точність</span>
            </div>
            <div className="solo-result-stat">
              <span className="stat-value" style={{ color: "var(--warning)" }}>{soloResult.errors}</span>
              <span className="stat-label">Помилок</span>
            </div>
            <div className="solo-result-stat">
              <span className="stat-value" style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem" }}>
                {Math.floor(soloResult.time / 60)}:{String(soloResult.time % 60).padStart(2, "0")}
              </span>
              <span className="stat-label">Час</span>
            </div>
          </div>

          {/* Personal best hint */}
          {highScores.length > 0 && highScores[0].wpm === soloResult.wpm && (
            <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "12px", padding: "0.8rem 1.2rem", marginBottom: "1.5rem", display: "inline-block" }}>
              🏆 Новий особистий рекорд!
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={handleStartSolo} style={{ padding: "0.85rem 2rem" }}>
              🔄 Ще раз
            </button>
            <button className="btn btn-secondary" onClick={handleSoloRetry} style={{ padding: "0.85rem 2rem" }}>
              ⚙️ Інший рівень
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentArena;
