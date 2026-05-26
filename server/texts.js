export const texts = {
  ua: [
    {
      id: "ua_easy_1",
      difficulty: "easy",
      title: "Початкова школа (Рівень 1)",
      text: "Влітку ми часто ходимо до лісу збирати ягоди та гриби. Сонце гріє землю, а пташки співають свої чудові пісні. Ми любимо природу рідного краю та оберігаємо кожне деревце у нашому саду."
    },
    {
      id: "ua_medium_1",
      difficulty: "medium",
      title: "Базова школа (5-6 клас)",
      text: "Сліпий десятипальцевий метод друку — це важлива навичка для кожного школяра. Вона дозволяє не дивитися на клавіші під час роботи. Коли ви не шукаєте літери зором, ваші очі менше втомлюються, а швидкість набору значно зростає. Тренуйтеся щодня по п'ятнадцять хвилин, і результат вас приємно здивує."
    },
    {
      id: "ua_medium_2",
      difficulty: "medium",
      title: "Базова школа (7-9 клас)",
      text: "Мова — це душа народу, вона живе в наших серцях. Вивчення рідної мови та вміння грамотно висловлювати думки є обов'язковим для сучасної людини. Державна мова в Україні — українська, і ми повинні шанувати її історію та культуру. Жоден письменник не обходився без любові до рідного слова."
    },
    {
      id: "ua_hard_1",
      difficulty: "hard",
      title: "Старша школа (10-11 клас)",
      text: "Оформлення документів згідно з ДСТУ 4163:2020 вимагає точності та дотримання правил типографіки. Наприклад, тире (—) обов'язково відділяють пробілами, а дефіс (-) пишуть разом зі словами. Нерозривний пробіл (Ctrl+Shift+Space) використовується для ініціалів та дат, щоб вони не розривалися на різні рядки."
    }
  ],
  en: [
    {
      id: "en_easy_1",
      difficulty: "easy",
      title: "Primary School (Level 3)",
      text: "I have a big family. We live in a small green house. My father is a doctor and my mother is a teacher. I have a clever dog. Its name is Jack. We play together every day."
    },
    {
      id: "en_medium_1",
      difficulty: "medium",
      title: "Middle School (Grades 5-6)",
      text: "Typing is like playing the piano. If you don't practice, you will not play a good melody. Use all ten fingers to be more efficient. Keep your back straight and look at the screen, not your hands. Regular exercises are the key to success."
    },
    {
      id: "en_medium_2",
      difficulty: "medium",
      title: "Middle School (Grades 7-9)",
      text: "Touch typing was invented in 1888 by Frank McGurrin. It involves using muscle memory to find keys instead of sight. A person who uses this method can reach speeds of over 100 words per minute. This skill saves thousands of hours during a professional career."
    },
    {
      id: "en_hard_1",
      difficulty: "hard",
      title: "High School (Grades 10-11)",
      text: "Modern secretary skills include advanced knowledge of MS Word and Excel. High-end specialists reach speeds of 500-550 characters per minute with nearly 100% accuracy. Professional typing requires high concentration and developed muscle coordination. Elite typists belong to the top 1% of computer users worldwide."
    }
  ],
  mixed: [
    {
      id: "mixed_easy_1",
      difficulty: "easy",
      title: "Укр-Англ (Початкова)",
      text: "Мій улюблений фрукт — apple (яблуко). Я також люблю orange (апельсин) та banana (банан). Вчитель каже: \"Good job!\" (молодець). Вивчати мови дуже цікаво та корисно."
    },
    {
      id: "mixed_medium_1",
      difficulty: "medium",
      title: "Укр-Англ (5-6 клас)",
      text: "Комп'ютерна миша (mouse) та клавіатура (keyboard) — це пристрої введення. Натисніть кнопку Start, щоб відкрити головне меню. Програма RapidTyping допоможе вам запам'ятати розташування символів. Спробуйте не підглядати (don't peek) на клавіші."
    },
    {
      id: "mixed_medium_2",
      difficulty: "medium",
      title: "Укр-Англ (7-9 клас)",
      text: "Новітні технології (High-Tech) змінюють наше життя. Накопичувачі типу SSD працюють значно швидше за старі диски HDD. Швидкість передачі даних вимірюється в MB/s (мегабайтах за секунду). Використовуйте сучасне програмне забезпечення (Software), щоб захистити свій персональний комп'ютер (PC)."
    },
    {
      id: "mixed_hard_1",
      difficulty: "hard",
      title: "Укр-Англ (10-11 клас)",
      text: "Професійні копірайтери (copywriters) демонструють швидкість понад 450 знаків за хвилину. Для IT-спеціалістів важливо вміти швидко набирати код (coding). Accuracy (точність) має бути не нижчою за 98%. Помилки (typos) можуть призвести до серйозних збоїв у роботі систем."
    }
  ],
  code: [
    {
      id: "code_js",
      difficulty: "medium",
      title: "JavaScript Basic Loop",
      text: "const items = [1, 2, 3];\nfor (let i = 0; i < items.length; i++) {\n  console.log(`Item: ${items[i]}`);\n}"
    },
    {
      id: "code_py_1",
      difficulty: "medium",
      title: "Python Function & Math",
      text: "def calculate_area(radius):\n    pi = 3.14159\n    return pi * (radius ** 2)\n\nprint(calculate_area(5))"
    },
    {
      id: "code_processing_1",
      difficulty: "medium",
      title: "Processing Setup & Draw",
      text: "void setup() {\n  size(400, 400);\n  background(255);\n}\n\nvoid draw() {\n  fill(255, 0, 0);\n  ellipse(mouseX, mouseY, 50, 50);\n}"
    },
    {
      id: "code_appscript_1",
      difficulty: "medium",
      title: "Google Apps Script",
      text: "function onEdit(e) {\n  var sheet = e.source.getActiveSheet();\n  if (sheet.getName() == \"Data\" && e.range.columnStart == 1) {\n    sheet.getRange(e.range.rowStart, 2).setValue(new Date());\n  }\n}"
    },
    {
      id: "code_pascal_1",
      difficulty: "easy",
      title: "Pascal Hello World",
      text: "program Hello;\nbegin\n  writeln('Hello, World!');\n  readln;\nend."
    },
    {
      id: "code_html_1",
      difficulty: "hard",
      title: "HTML Template",
      text: "<div class=\"card\">\n  <h1 id=\"title\">Hello World</h1>\n  <button onClick={handleClick}>Click Me</button>\n</div>"
    }
  ]
};
