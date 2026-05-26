export function verifyText(template, rawInput) {
  // Normalize HTML tags for rich-text exercises
  let input = rawInput || "";
  input = input.replace(/<strong[^>]*>/gi, '<b>').replace(/<\/strong>/gi, '</b>');
  input = input.replace(/<em[^>]*>/gi, '<i>').replace(/<\/em>/gi, '</i>');
  input = input.replace(/<span style="font-weight: bold;">/gi, '<b>').replace(/<\/span>/gi, '</b>');
  // Optional: remove non-breaking spaces
  input = input.replace(/&nbsp;/g, ' ');

  let errors = [];
  let diff = [];
  
  // Basic diff character by character for visualization
  let tLen = template.length;
  let iLen = input.length;
  let maxLen = Math.max(tLen, iLen);
  
  for (let i = 0; i < maxLen; i++) {
    const tChar = template[i];
    const iChar = input[i];
    
    if (tChar === iChar) {
      diff.push({ type: 'correct', char: iChar });
    } else {
      if (tChar !== undefined && iChar === undefined) {
        // Missing character
        diff.push({ type: 'missing', char: tChar });
      } else if (tChar === undefined && iChar !== undefined) {
        // Extra character
        diff.push({ type: 'extra', char: iChar });
      } else {
        // Incorrect character
        diff.push({ type: 'incorrect', char: iChar, expected: tChar });
      }
    }
  }

  // Basic Rule Checks
  
  // Rule 1: Double spaces (ignore newlines)
  if (/[^\S\r\n]{2,}/.test(input)) {
    errors.push({
      ruleId: 1,
      message: "Знайдено зайві пробіли (два або більше підряд). Між словами має бути лише один пробіл."
    });
  }
  
  // Rule 2: Space before punctuation
  if (/\s[.,:;!?]/.test(input)) {
    errors.push({
      ruleId: 2,
      message: "Знайдено пробіл перед розділовим знаком (крапка, кома, двокрапка, знак питання тощо). Пробіл ставиться лише ПІСЛЯ них."
    });
  }

  // Rule 4: No space after punctuation
  if (/[.,:;!?][^\s\n"'»\)\]\}]/.test(input)) {
    errors.push({
      ruleId: 4,
      message: "Відсутній пробіл після розділового знаку (крапка, кома тощо). Наступне слово має йти через пробіл."
    });
  }

  // Rule 5: Spaces at the edges of lines
  if (/^[^\S\n]+|[^\S\n]+$/m.test(input)) {
    errors.push({
      ruleId: 5,
      message: "Знайдено пробіл на початку або в кінці рядка (абзацу). Відступи пробілами не робляться."
    });
  }

  // Rule 6: Hyphens and Dashes
  if (/\s-\s/.test(input)) {
    errors.push({
      ruleId: 6,
      message: "Використано дефіс (-) з пробілами. Дефіс пишеться впритул до слів (наприклад, синьо-жовтий). Для відокремлення слів використовуйте тире (—) з пробілами."
    });
  }
  if (/[^\s\n]—|—[^\s\n]/.test(input)) {
    errors.push({
      ruleId: 7,
      message: "Тире (—) завжди повинно відокремлюватися пробілами з обох боків."
    });
  }

  // Rule 7: Brackets and Quotes
  if (/(\(\s|\s\)|«\s|\s»|\[\s|\s\]|\{\s|\s\})/.test(input)) {
    errors.push({
      ruleId: 8,
      message: "Текст у дужках або лапках пишеться без внутрішніх пробілів (впритул до знаків)."
    });
  }

  // Rule 8: Math and Special Symbols
  if (/\s[%°]/.test(input)) {
    errors.push({
      ruleId: 9,
      message: "Знаки відсотка (%) та градуса (°) пишуться впритул до числа, без пробілу перед ними."
    });
  }
  if (/(№|§)[^\s\n№§]/.test(input)) {
    errors.push({
      ruleId: 10,
      message: "Знаки номера (№) та параграфа (§) повинні відокремлюватися від наступної цифри пробілом."
    });
  }

  // Rule 9: Dates
  if (/\d{2}\.\s\d{2}\.\s\d{4}/.test(input)) {
    errors.push({
      ruleId: 11,
      message: "Цифровий формат дати (ДД.ММ.РРРР) пишеться впритул, без пробілів після крапок."
    });
  }

  // Calculate score (simple percentage of correct characters relative to template length)
  let correctCount = diff.filter(d => d.type === 'correct').length;
  let rawScore = Math.round((correctCount / Math.max(tLen, 1)) * 100);
  let score = Math.max(0, Math.min(100, rawScore));
  
  // Exact match check
  let isExactMatch = template === input;
  if (isExactMatch) score = 100;

  return {
    isExactMatch,
    score,
    errors,
    diff
  };
}
