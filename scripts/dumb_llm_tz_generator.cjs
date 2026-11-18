#!/usr/bin/env node
/**
 * DUMB LLM TECHNICAL SPECIFICATION GENERATOR (БРОНЕБОЙНЫЙ ГЕНЕРАТОР ТЗ ДЛЯ ТУПЫХ НЕЙРОНОК)
 *
 * Превращает ленивое пользовательское описание в железобетонный промпт-спецификацию,
 * отсекающий 100% нейросетевого мусора:
 * 1. Запрет на // TODO, /* rest of code *\/ и заглушки
 * 2. Запрет на выдумывание несуществующих пакетов и API
 * 3. Принудительное чтение файлов целиком и сохранение интерфейсов
 * 4. Машинные гейты (Exit Code 0, тесты, typecheck)
 * 5. Кинетический старт без вежливых слюней и прелюдий
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MODES = {
  'lazy-senior': {
    name: 'Ленивый сеньор (ставит // TODO и срезает углы)',
    emphasis: 'Жёсткий запрет на пропуски кода, заглушки, эвфемизмы и усечения. Писать 100% рабочего кода построчно.',
  },
  'dumb-junior': {
    name: 'Тупой джун (не понимает контекста и ломает архитектуру)',
    emphasis: 'Пошаговые алгоритмические рельсы, точные имена файлов, запрет на изменение структуры папок и удаление существующих функций.',
  },
  'hallucinator': {
    name: 'Галлюцинирующий фантазер (выдумывает пакеты и методы)',
    emphasis: 'Тотальный запрет на `npm install` новых пакетов. Использовать СТРОГО то, что уже импортировано или входит в стандартную библиотеку.',
  },
  'chatty-assistant': {
    name: 'Болтливый попугай (пишет простыни текста вместо кода)',
    emphasis: 'Кинетический удар: первая строчка ответа — это код или путь к файлу. Никаких «Конечно!», «Рад помочь!» и «Надеюсь, это решило проблему!».',
  },
  'iron-hammer': {
    name: 'The Hammer (Максимальный бронебойный режим CTO)',
    emphasis: 'Презумпция 100% брака. Чтение файлов целиком, ноль моков, машинные гейты компилятора, строгие типы, атомарный коммит.',
  }
};

const STACKS = {
  'fullstack': 'TypeScript, React 19, Fastify, PostgreSQL (Drizzle/pg), Tailwind / Design Tokens',
  'frontend': 'TypeScript, React, Tailwind CSS / CSS Modules, Lucide Icons, WCAG AA Contrast',
  'backend': 'TypeScript / Node.js, Fastify / Express, PostgreSQL, Zod validation, ACID transactions',
  'python': 'Python 3.11+, Pydantic v2, FastAPI / AsyncIO, Type Hints, pytest',
  'scripts': 'Node.js (CJS/MJS) / PowerShell / Bash automation, robust error handling, exit codes',
  'universal': 'Strict TypeScript / Modern Architecture, clean modular structure, zero-warning build'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    task: '',
    mode: 'iron-hammer',
    stack: 'fullstack',
    files: [],
    strictness: 'iron',
    clipboard: false,
    output: '',
    interactive: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--task' || arg === '-t') {
      options.task = args[++i];
    } else if (arg === '--mode' || arg === '-m') {
      options.mode = args[++i] || options.mode;
    } else if (arg === '--stack' || arg === '-s') {
      options.stack = args[++i] || options.stack;
    } else if (arg === '--files' || arg === '-f') {
      options.files = (args[++i] || '').split(',').map(f => f.trim()).filter(Boolean);
    } else if (arg === '--clip' || arg === '-c') {
      options.clipboard = true;
    } else if (arg === '--out' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-') && !options.task) {
      options.task = arg;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Использование:
  node scripts/dumb_llm_tz_generator.cjs [опции]

Опции:
  -t, --task <текст>        Суть задачи (можно в свободной или ленивой форме)
  -m, --mode <тип>          Характер тупости нейронки:
                            * iron-hammer      (по умолчанию: бронебойный режим CTO)
                            * lazy-senior      (выжигает // TODO и заглушки)
                            * dumb-junior      (пошаговые рельсы, изоляция скоупа)
                            * hallucinator     (запрет новых библиотек и фантазий)
                            * chatty-assistant (вырубает воду и реверансы)
  -s, --stack <стек>        Стек: fullstack, frontend, backend, python, scripts, universal
  -f, --files <f1,f2>       Список целевых файлов через запятую
  -c, --clip                Скопировать готовый промпт в буфер обмена Windows
  -o, --out <файл>          Сохранить сгенерированное ТЗ в файл

Пример:
  node scripts/dumb_llm_tz_generator.cjs -t "Сделать кнопку отмены визита с подтверждением и возвратом слота в расписание" -s frontend -c
  `);
}

function generateSpecification(options) {
  const task = options.task.trim() || 'Реализовать компонент / сервис по архитектурным стандартам без заглушек';
  const modeKey = MODES[options.mode] ? options.mode : 'iron-hammer';
  const modeObj = MODES[modeKey];
  const stackDesc = STACKS[options.stack] || options.stack;
  const filesList = options.files.length > 0
    ? options.files.map(f => `  * \`${f}\``).join('\n')
    : '  * Определи минимально достаточный набор файлов самостоятельно через поиск, НЕ плодя дубликатов!';

  const prompt = `# ТЕХНИЧЕСКОЕ ЗАДАНИЕ (STRICT PRODUCTION DIRECTIVE)

## 1. СТАТУС, РОЛЬ И КРИТИЧЕСКИЙ РЕЖИМ (ZERO-SYCOPHANCY / THE HAMMER)
Ты действуешь как ведущий инженер-разработчик. Категорически запрещены сервильные вступления («Конечно!», «С удовольствием сделаю...»), пустые рассуждения и водянистые объяснения.
**Твоя работа оценивается по правилу "Презумпция 100% брака":** любое отступление от требований, любая неработающая строчка кода или несовместимый тип расцениваются как критический сбой.
* **Режим коррекции поведения:** ${modeObj.name}
* **Главный императив:** ${modeObj.emphasis}
* **Формат первой строки ответа:** Первая строка обязана содержать непосредственно рабочий код, файловый путь или конкретную команду исполнения. Ноль прелюдий.

---

## 2. ЦЕЛЕВАЯ ЗАДАЧА (VERBATIM GOAL)
**Суть задачи:**
> ${task}

**Бизнес-контекст и результат:**
Пользователь должен получить законченное, 100% рабочее решение, которое интегрировано в реальный контекст системы и не требует ручных «допилов». Решение обязано решать проблему прямо сейчас без промежуточных шагов.

---

## 3. СТЕК И АРХИТЕКТУРНЫЕ ГРАНИЦЫ (TECH STACK & BOUNDARIES)
* **Технологический стек:** ${stackDesc}
* **Целевые файлы:**
${filesList}
* **Правило работы с файлами:**
  1. Перед правкой ОБЯЗАТЕЛЬНО прочитай весь файл целиком (от начала до конца). Запрещены слепые патчи по 20 строк!
  2. Сохраняй все существующие экспорты, сигнатуры функций и интерфейсы, если прямо не указано их изменить.
  3. ЗАПРЕЩЕНО создавать дублирующие файлы с суффиксами \`*V2\`, \`*New\`, \`*Copy\` или параллельные сторы. Дорабатывай существующие сущности!

---

## 4. ЖЕЛЕЗНЫЙ СПИСОК ЗАПРЕТОВ (ANTI-HALLUCINATION & ANTI-SLOP INVARIANTS)
1. **ТОТАЛЬНЫЙ ЗАПРЕТ НА ЗАГЛУШКИ (ZERO PLACEHOLDERS):**
   * Категорически запрещены \`// TODO\`, \`// implement later\`, \`// add logic here\`, \`/* ... rest of code ... */\`.
   * Если нужно написать 300 строк кода — ты обязан написать все 300 строк без купюр.
2. **ЗАПРЕТ НА ВЫДУМЫВАНИЕ ЗАВИСИМОСТЕЙ:**
   * Запрещено вызывать \`npm install\` или импортировать сторонние пакеты, которых нет в проекте. Работай только на базе установленных библиотек.
3. **СТРОГАЯ ТИПИЗАЦИЯ (NO LOOSE ANY):**
   * Никаких \`any\`, неконтролируемых приведений типов или подавления ошибок через \`@ts-ignore\`. Все данные, параметры и возвращаемые значения типизируются строгими интерфейсами.
4. **СЕНСОРНЫЙ И ВИЗУАЛЬНЫЙ СТАНДАРТ (IF UI):**
   * Высота интерактивных элементов: $\\ge 36\\text{px}$ на десктопе, $\\ge 44\\times 44\\text{px}$ на мобильных / тач-экранах.
   * Ровно ОДНА главная кнопка (Primary CTA) на видимый экран/модалку.
   * Никаких обрезанных слов, вываливания за границы (\`overflow-x: clip\`) или слепящих белых пятен в тёмной теме.
   * Семантические токены CSS вместо хардкодных цветов.
5. **ОБРАБОТКА ОШИБОК И АВТОНОМИЯ:**
   * Никаких пустых блоков \`catch (e) {}\`. Ошибки обязаны логироваться и возвращать понятный статус пользователю.
   * Запрещены раздражающие \`window.confirm()\` и наглухо заблокированные кнопки (\`disabled\`) из-за опциональных полей.

---

## 5. МАШИННЫЕ ГЕЙТЫ И КРИТЕРИИ ПРИЁМКИ (DEFINITION OF DONE)
Задача признается выполненной ТОЛЬКО при выполнении всех условий:
1. **Компиляция:** Код собирается без единой ошибки типов (\`Exit Code 0\`).
2. **Работоспособность:** Все ветки логики (позитивный сценарий, ошибка сети, пустые данные) физически реализованы.
3. **Бесшовная интеграция:** Компонент или эндпоинт привязан к реальному интерфейсу/роутеру, а не висит в вакууме.
4. **Формат отчета:**
   * Список измененных/созданных файлов с полными путями.
   * Готовый, законченный код без сокращений.
   * Краткая сводка: как проверить работоспособность вручную или запуском тестов.
`;

  return prompt;
}

function copyToClipboard(text) {
  try {
    // Windows clip command
    const child = require('child_process').spawn('clip');
    child.stdin.write(text);
    child.stdin.end();
    return true;
  } catch (err) {
    try {
      // Powershell fallback
      const tmpFile = path.join(__dirname, '..', 'scratch', '_clip_tmp.txt');
      fs.writeFileSync(tmpFile, text, 'utf8');
      execSync(`powershell -command "Get-Content -Raw -Encoding UTF8 '${tmpFile}' | Set-Clipboard"`);
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      return true;
    } catch (e) {
      return false;
    }
  }
}

function main() {
  const options = parseArgs();

  if (!options.task) {
    // If no task provided, show help and prompt
    console.log('\x1b[33m[!] Задача не указана. Используй: node scripts/dumb_llm_tz_generator.cjs -t "Твоя задача"\x1b[0m');
    printHelp();
    process.exit(1);
  }

  const generatedSpec = generateSpecification(options);

  if (options.output) {
    const outPath = path.resolve(options.output);
    fs.writeFileSync(outPath, generatedSpec, 'utf8');
    console.log(`\x1b[32m[✓] Спецификация успешно сохранена в: ${outPath}\x1b[0m`);
  }

  if (options.clipboard) {
    const copied = copyToClipboard(generatedSpec);
    if (copied) {
      console.log(`\x1b[32m[✓] ТЗ успешно скопировано в буфер обмена Windows!\x1b[0m`);
    } else {
      console.log(`\x1b[31m[!] Не удалось скопировать в буфер обмена автоматически.\x1b[0m`);
    }
  }

  // Always output to stdout
  console.log('\n' + '='.repeat(80));
  console.log(generatedSpec);
  console.log('='.repeat(80) + '\n');
}

main();
