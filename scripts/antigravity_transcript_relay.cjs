/**
 * Antigravity Transcript Relay Engine (Mandate 8l)
 *
 * Automatically parses a predecessor subagent's transcript.jsonl,
 * extracts task context, completed steps, pending files, and generates
 * a clean handover prompt for a fresh subagent with 100% context continuity.
 */

const fs = require("fs");
const path = require("path");

function getBrainDir() {
  const userHome = process.env.USERPROFILE || process.env.HOME;
  const standardBrain = path.join(userHome, ".gemini", "antigravity", "brain");
  if (fs.existsSync(standardBrain)) {
    return standardBrain;
  }
  const appData = process.env.APPDATA || "";
  const candidate = path.join(path.dirname(path.dirname(appData)), ".gemini", "antigravity", "brain");
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return standardBrain;
}

function parseTranscript(conversationId) {
  const brainDir = getBrainDir();
  const transcriptPath = path.join(brainDir, conversationId, ".system_generated", "logs", "transcript.jsonl");

  if (!fs.existsSync(transcriptPath)) {
    throw new Error(`Transcript not found at: ${transcriptPath}`);
  }

  const lines = fs.readFileSync(transcriptPath, "utf-8").split("\n").filter(Boolean);
  let initialPrompt = "";
  let role = "";
  const completedActions = [];
  const modifiedFiles = new Set();
  const inspectedFiles = new Set();
  let lastError = null;

  for (const line of lines) {
    try {
      const step = JSON.parse(line);
      if (step.type === "USER_INPUT" && !initialPrompt) {
        initialPrompt = step.content;
      }
      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          const action = `${tc.name}: ${tc.args?.toolSummary || tc.args?.toolAction || ""}`;
          completedActions.push(action);
          if (tc.args?.TargetFile) modifiedFiles.add(tc.args.TargetFile);
          if (tc.args?.AbsolutePath) inspectedFiles.add(tc.args.AbsolutePath);
          if (tc.args?.SearchPath) inspectedFiles.add(tc.args.SearchPath);
        }
      }
      if (step.status === "ERROR") {
        lastError = step.content || "Unknown error";
      }
    } catch {
      // skip malformed line
    }
  }

  return {
    conversationId,
    transcriptPath,
    totalSteps: lines.length,
    initialPrompt,
    completedActionsCount: completedActions.length,
    recentActions: completedActions.slice(-10),
    modifiedFiles: Array.from(modifiedFiles),
    inspectedFiles: Array.from(inspectedFiles).slice(0, 15),
    lastError,
  };
}

function generateHandoverPrompt(conversationId, options = {}) {
  const summary = parseTranscript(conversationId);
  const normalizedTranscriptUri = summary.transcriptPath.replace(/\\/g, "/");

  return `[МАНДАТ 8l: СВЕЖИЙ СУБАГЕНТ — TRANSCRIPT RELAY HANDOVER]
ОБЯЗАТЕЛЬНО ПРОЧИТАЙ КОНСТИТУЦИЮ:
1. \`C:\\Clinic_MVP\\dental-crm\\.agents\\THE_HAMMER_MASTER_PROMPT.md\`
2. \`C:\\Clinic_MVP\\dental-crm\\.agents\\AGENTS.md\` (Мандаты 8c, 8e, 8l, 8t).

ТРАНСКРИПТ ПРЕДШЕСТВЕННИКА:
Предыдущий субагент (Conversation ID: ${summary.conversationId}) выполнил ${summary.completedActionsCount} шагов и завершил сессию.
Абсолютный путь к его журналу:
file:///${normalizedTranscriptUri}

ИЗУЧЕННЫЕ И МОДИФИЦИРОВАННЫЕ ФАЙЛЫ:
${summary.modifiedFiles.length > 0 ? summary.modifiedFiles.map(f => `- [ИЗМЕНЕН] ${f}`).join("\n") : "- Изменений на диск записано не было."}
${summary.inspectedFiles.length > 0 ? summary.inspectedFiles.slice(0, 8).map(f => `- [ИЗУЧЕН] ${f}`).join("\n") : ""}

ПОСЛЕДНИЕ ШАГИ ПРЕДШЕСТВЕННИКА:
${summary.recentActions.map(a => `  • ${a}`).join("\n")}

ИСХОДНАЯ ЗАДАЧА:
${summary.initialPrompt}

${options.additionalDirective ? `ДОПОЛНИТЕЛЬНАЯ ДИРЕКТИВА:\n${options.additionalDirective}\n` : ""}
ПРАВИЛА ВЫПОЛНЕНИЯ:
1. Начни с проверки текущего состояния целевых файлов.
2. Не повторяй уже сделанные и проверенные шаги.
3. Соблюдай Мандат 8t: компиляцию и typecheck запускает только L1 оркестратор.
4. Выдай подробный отчет с доказательствами после завершения.`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let targetId = null;
  const subagentIdx = args.findIndex(a => a === "--subagent" || a === "--id");
  if (subagentIdx !== -1 && args[subagentIdx + 1]) {
    targetId = args[subagentIdx + 1];
  } else {
    targetId = args.find(a => !a.startsWith("--"));
  }

  if (!targetId) {
    console.log("Usage: node antigravity_transcript_relay.cjs <conversationId> [--prompt-only] [--format json]");
    process.exit(1);
  }

  try {
    const promptOnly = args.includes("--prompt-only");
    const jsonFormat = args.includes("--format") && args[args.indexOf("--format") + 1] === "json";

    if (jsonFormat) {
      const info = parseTranscript(targetId);
      console.log(JSON.stringify(info, null, 2));
    } else if (promptOnly) {
      console.log(generateHandoverPrompt(targetId));
    } else {
      const info = parseTranscript(targetId);
      console.log("=== TRANSCRIPT RELAY SUMMARY ===");
      console.log(`Conversation ID: ${info.conversationId}`);
      console.log(`Transcript URI:  file:///${info.transcriptPath.replace(/\\/g, "/")}`);
      console.log(`Total Steps:     ${info.totalSteps}`);
      console.log(`Tool Actions:    ${info.completedActionsCount}`);
      console.log(`Modified Files:  ${info.modifiedFiles.length}`);
      console.log(`\n=== HANDOVER PROMPT PREVIEW ===\n`);
      console.log(generateHandoverPrompt(targetId));
    }
  } catch (err) {
    console.error("Relay Error:", err.message);
    process.exit(1);
  }
}

module.exports = {
  parseTranscript,
  generateHandoverPrompt,
};
