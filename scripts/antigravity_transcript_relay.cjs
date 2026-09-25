/**
 * Antigravity Transcript Relay Engine (Mandate 8l) — Deep Trajectory Recovery v2.1
 *
 * Automatically parses a predecessor subagent's transcript.jsonl & SQLite DB,
 * extracts full task context, all completed milestones, executed commands,
 * modified files (reconciled with live git worktree status), latest thinking blocks,
 * unflushed SQLite crash steps, and genuine model reports to generate an exhaustive
 * turnkey handover prompt or invoke_subagent payload with 100% context continuity.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
let DatabaseSync;
try {
  DatabaseSync = require("node:sqlite").DatabaseSync;
} catch {}

function getAgyBase() {
  const userHome = process.env.USERPROFILE || process.env.HOME || "C:\\Users\\Admin";
  return path.join(userHome, ".gemini", "antigravity");
}

function cleanString(str) {
  if (!str || typeof str !== "string") return "";
  let s = str.trim();
  while ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function cleanPath(p) {
  if (!p) return "";
  const cleaned = cleanString(p);
  return cleaned.replace(/[/\\]+/g, "/");
}

function getLiveGitStatus() {
  const workspaceRoot = "C:/Clinic_MVP/dental-crm";
  const statusMap = new Map();
  try {
    const raw = execSync("git status --porcelain", { cwd: workspaceRoot, encoding: "utf-8" });
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const statusCode = line.slice(0, 2).trim();
      const filePath = line.slice(3).trim().replace(/[/\\]+/g, "/");
      statusMap.set(filePath, statusCode);
    }
  } catch {}
  return statusMap;
}

function parseTranscript(conversationId) {
  const agyBase = getAgyBase();
  const brainDir = path.join(agyBase, "brain");
  const dbDir = path.join(agyBase, "conversations");
  const transcriptPath = path.join(brainDir, conversationId, ".system_generated", "logs", "transcript.jsonl");

  if (!fs.existsSync(transcriptPath)) {
    throw new Error(`Transcript not found at: ${transcriptPath}`);
  }

  const lines = fs.readFileSync(transcriptPath, "utf-8").split("\n").filter(Boolean);
  let initialPrompt = "";
  const allActions = [];
  const modifiedFiles = new Set();
  const failedFileOperations = new Map();
  const inspectedFiles = new Set();
  const executedCommands = [];
  const thinkingBlocks = [];
  const sentMessages = [];
  let genuinePlannerResponse = "";
  let lastError = null;
  let lastToolCall = null;
  let stopReason = "NORMAL";

  const gitMap = getLiveGitStatus();

  for (let i = 0; i < lines.length; i++) {
    try {
      const step = JSON.parse(lines[i]);

      if (step.type === "USER_INPUT" && !initialPrompt) {
        initialPrompt = step.content;
      }

      if (step.thinking) {
        const th = step.thinking.trim();
        if (th) {
          thinkingBlocks.push({ step: i, text: th });
        }
      }

      // Check genuine agent textual response (exclude GENERIC tool outputs)
      if (step.type === "PLANNER_RESPONSE" && step.content && !step.tool_calls) {
        const text = step.content.trim();
        if (text.length > 10) {
          genuinePlannerResponse = text;
        }
      }

      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          lastToolCall = tc;
          const name = tc.name;
          const summary = cleanString(tc.args?.toolSummary || tc.args?.toolAction || "");
          const entry = summary ? `${name}: ${summary}` : name;
          allActions.push({ step: i, name, entry, args: tc.args });

          if (name === "write_to_file" || name === "replace_file_content") {
            const target = cleanPath(tc.args?.TargetFile);
            if (target) modifiedFiles.add(target);
          }

          if (name === "view_file" && tc.args?.AbsolutePath) {
            inspectedFiles.add(cleanPath(tc.args.AbsolutePath));
          }

          if (name === "run_command" && tc.args?.CommandLine) {
            executedCommands.push(cleanString(tc.args.CommandLine));
          }

          if (name === "send_message" && tc.args?.Message) {
            sentMessages.push({
              step: i,
              recipient: cleanString(tc.args.Recipient),
              message: cleanString(tc.args.Message),
            });
          }
        }
      }

      if (step.status === "ERROR" || step.type === "ERROR_MESSAGE") {
        const errContent = step.content || step.error || "Unknown step error";
        lastError = errContent;
        if (errContent.includes("RESOURCE_EXHAUSTED") || errContent.includes("code 429")) {
          stopReason = "QUOTA_429_EXHAUSTED";
        } else if (errContent.includes("user-mapped section open")) {
          stopReason = "WINDOWS_FILE_LOCK";
          if (lastToolCall?.args?.TargetFile) {
            failedFileOperations.set(cleanPath(lastToolCall.args.TargetFile), errContent);
          }
        }
      }
    } catch {}
  }

  // SQLite deep inspection (recovering unflushed crash step)
  const dbPath = path.join(dbDir, `${conversationId}.db`);
  let sqliteLastStep = null;
  if (DatabaseSync && fs.existsSync(dbPath)) {
    try {
      const db = new DatabaseSync(dbPath);
      const row = db.prepare("SELECT idx, step_type, status, error_details, step_payload FROM steps ORDER BY cast(idx as integer) DESC LIMIT 1").get();
      if (row) {
        sqliteLastStep = {
          idx: Number(row.idx),
          status: row.status,
          payloadStr: row.step_payload ? Buffer.from(row.step_payload).toString("utf-8") : "",
        };
        if (sqliteLastStep.payloadStr.includes("RESOURCE_EXHAUSTED") || sqliteLastStep.payloadStr.includes("code 429")) {
          stopReason = "QUOTA_429_EXHAUSTED";
          lastError = "API error: RESOURCE_EXHAUSTED (code 429): Individual quota reached.";
        }
      }
      db.close();
    } catch {}
  }

  // Deduplicate and aggregate
  const uniqueCommands = Array.from(new Set(executedCommands));
  const recentActions = allActions.slice(-25).map(a => a.entry);

  // Group modified files with live git status
  const prefixRegex = /^C:\/Clinic_MVP\/dental-crm\//i;
  const structuredModifiedFiles = Array.from(modifiedFiles).map(fullPath => {
    let relPath = fullPath;
    if (prefixRegex.test(relPath)) {
      relPath = relPath.replace(prefixRegex, "");
    }
    const gitCode = gitMap.get(relPath) || "CLEAN/COMMITTED";
    const existsOnDisk = fs.existsSync(fullPath);
    const failureReason = failedFileOperations.get(fullPath) || null;
    return {
      fullPath,
      relPath,
      gitCode,
      existsOnDisk,
      failureReason,
    };
  });

  const latestThinking = thinkingBlocks.length > 0 ? thinkingBlocks[thinkingBlocks.length - 1].text : "";
  const previousThinking = thinkingBlocks.length > 1 ? thinkingBlocks[thinkingBlocks.length - 2].text : "";

  return {
    conversationId,
    transcriptPath,
    totalSteps: lines.length,
    sqliteLastStepIdx: sqliteLastStep?.idx,
    initialPrompt,
    completedActionsCount: allActions.length,
    modifiedFiles: structuredModifiedFiles,
    inspectedFiles: Array.from(inspectedFiles),
    executedCommands: uniqueCommands,
    allActionsSummary: allActions.length <= 20 ? allActions.map(a => a.entry) : [
      ...allActions.slice(0, 5).map(a => a.entry),
      `... [пропущено ${allActions.length - 15} промежуточных шагов] ...`,
      ...allActions.slice(-10).map(a => a.entry),
    ],
    recentActions,
    latestThinking,
    previousThinking,
    lastToolCall,
    sentMessages,
    genuinePlannerResponse,
    lastError,
    stopReason,
  };
}

function generateHandoverPrompt(conversationId, options = {}) {
  const summary = parseTranscript(conversationId);
  const normalizedTranscriptUri = summary.transcriptPath.replace(/\\/g, "/");

  const uncommittedFiles = summary.modifiedFiles.filter(f => f.gitCode !== "CLEAN/COMMITTED");
  const committedFiles = summary.modifiedFiles.filter(f => f.gitCode === "CLEAN/COMMITTED");
  const lockedFiles = summary.modifiedFiles.filter(f => f.failureReason !== null);

  const lastMessage = summary.sentMessages.length > 0
    ? summary.sentMessages[summary.sentMessages.length - 1].message
    : (summary.genuinePlannerResponse || "");

  let prompt = `[МАНДАТ 8l: СВЕЖИЙ СУБАГЕНТ — DEEP TRANSCRIPT RELAY HANDOVER]
ВЫСШАЯ КОНСТИТУЦИЯ (ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ):
1. \`C:\\Clinic_MVP\\dental-crm\\.agents\\THE_HAMMER_MASTER_PROMPT.md\`
2. \`C:\\Clinic_MVP\\dental-crm\\.agents\\AGENTS.md\` (Мандаты 8c, 8e, 8l, 8t).

ТРАНСКРИПТ И КОНТЕКСТ ПРЕДШЕСТВЕННИКА:
Предыдущий субагент (Conversation ID: ${summary.conversationId}) выполнил ${summary.completedActionsCount} действий (${summary.totalSteps} записей журнала, последний шаг SQLite: ${summary.sqliteLastStepIdx ?? summary.totalSteps}).
Причина остановки предшественника: ${summary.stopReason}
Абсолютный путь к журналу:
file:///${normalizedTranscriptUri}

ТЕКУЩЕЕ СОСТОЯНИЕ ФАЙЛОВ НА ДИСКЕ (РЕЗУЛЬТАТЫ ПРЕДШЕСТВЕННИКА):
${uncommittedFiles.length > 0 ? "НЕЗАКОММИЧЕННЫЕ И НОВЫЕ ФАЙЛЫ В РАБОЧЕМ ДЕРЕВЕ (GIT STATUS):\n" + uncommittedFiles.map(f => `  [${f.gitCode}] ${f.relPath} (на диске: ${f.existsOnDisk ? "ДА" : "НЕТ"})`).join("\n") : "  (Все модифицированные файлы закоммичены)"}

${committedFiles.length > 0 ? "\nРАНЕЕ СФОРМИРОВАННЫЕ МОДУЛИ:\n" + committedFiles.slice(0, 10).map(f => `  [OK] ${f.relPath}`).join("\n") + (committedFiles.length > 10 ? `\n  ...и еще ${committedFiles.length - 10} файлов` : "") : ""}

${lockedFiles.length > 0 ? "\nВНИМАНИЕ! ФАЙЛЫ С ОШИБКАМИ БЛОКИРОВКИ ЗАПИСИ (WINDOWS FILE LOCK):\n" + lockedFiles.map(f => `  [LOCKED] ${f.relPath}: ${f.failureReason.slice(0, 120)}`).join("\n") : ""}

ПОСЛЕДНЕЕ ВЫПОЛНЯВШЕЕСЯ ДЕЙСТВИЕ:
Инструмент: ${summary.lastToolCall?.name || "none"}
Параметры: ${JSON.stringify(summary.lastToolCall?.args || {}, null, 2)}

ПОСЛЕДНИЕ РАССУЖДЕНИЯ И ПЛАН ПРЕДШЕСТВЕННИКА:
"""
${summary.latestThinking || "(Рассуждения не зафиксированы)"}
"""

${summary.previousThinking ? `ПРЕДЫДУЩИЙ БЛОК РАССУЖДЕНИЙ:\n"""\n${summary.previousThinking}\n"""\n` : ""}

${lastMessage ? `ПОСЛЕДНИЙ ДОКЛАД / СООБЩЕНИЕ ПРЕДШЕСТВЕННИКА:\n"""\n${lastMessage}\n"""\n` : ""}

ПОСЛЕДНИЕ КОМАНДЫ ПРЕДШЕСТВЕННИКА:
${summary.executedCommands.length > 0 ? summary.executedCommands.slice(-8).map(c => `  $ ${c}`).join("\n") : "  (нет команд)"}

ИСХОДНАЯ ЗАДАЧА:
${summary.initialPrompt}

${options.additionalDirective ? `ДОПОЛНИТЕЛЬНАЯ ДИРЕКТИВА РУКОВОДСТВА:\n${options.additionalDirective}\n` : ""}

ПРАВИЛА ИСПОЛНЕНИЯ:
1. НЕ НАЧИНАЙ С НУЛЯ: Все файлы предшественника уже на диске. Продолжай ровно с места остановки!
2. Внимательно изучи состояние модифицированных файлов перед внесением правок.
3. Доведи начатые изменения до 100% готовности, свяжи бэкенд и фронтенд без блоата и дубликатов.
4. По завершении отправь исчерпывающий отчет через send_message родителю с доказательствами.`;

  return prompt;
}

function generateInvokeSubagentPayload(conversationId, role = "Relay Worker", additionalDirective = "") {
  const prompt = generateHandoverPrompt(conversationId, { additionalDirective });
  return {
    Subagents: [
      {
        Model: "inherit",
        TypeName: "self",
        Role: role,
        Prompt: prompt,
      },
    ],
    toolAction: `Launching relay replacement for ${conversationId.slice(0, 8)}`,
    toolSummary: `Spawn relay subagent`,
  };
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
    console.log("Usage: node antigravity_transcript_relay.cjs <conversationId> [--prompt-only] [--invoke-json] [--format json]");
    process.exit(1);
  }

  try {
    const promptOnly = args.includes("--prompt-only");
    const invokeJson = args.includes("--invoke-json");
    const jsonFormat = args.includes("--format") && args[args.indexOf("--format") + 1] === "json";

    if (jsonFormat) {
      const info = parseTranscript(targetId);
      console.log(JSON.stringify(info, null, 2));
    } else if (promptOnly) {
      console.log(generateHandoverPrompt(targetId));
    } else if (invokeJson) {
      console.log(JSON.stringify(generateInvokeSubagentPayload(targetId), null, 2));
    } else {
      const info = parseTranscript(targetId);
      console.log("=== DEEP TRANSCRIPT RELAY SUMMARY v2.1 ===");
      console.log(`Conversation ID:    ${info.conversationId}`);
      console.log(`Transcript URI:     file:///${info.transcriptPath.replace(/\\/g, "/")}`);
      console.log(`Total Steps:        ${info.totalSteps} (SQLite last step: ${info.sqliteLastStepIdx ?? info.totalSteps})`);
      console.log(`Stop Reason:        ${info.stopReason}`);
      console.log(`Completed Actions:  ${info.completedActionsCount}`);
      console.log(`Modified Files:     ${info.modifiedFiles.length} (Uncommitted: ${info.modifiedFiles.filter(f => f.gitCode !== "CLEAN/COMMITTED").length})`);
      console.log(`Inspected Files:    ${info.inspectedFiles.length}`);
      console.log(`Commands Executed:  ${info.executedCommands.length}`);
      console.log(`Thinking Blocks:    ${info.latestThinking ? "YES" : "NO"}`);
      console.log(`Sent Messages:      ${info.sentMessages.length}`);
      console.log("\n=== HANDOVER PROMPT PREVIEW ===");
      console.log(generateHandoverPrompt(targetId).slice(0, 2500) + "\n\n... [Handover prompt generated cleanly]");
    }
  } catch (err) {
    console.error(`[Transcript Relay Error] ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  parseTranscript,
  generateHandoverPrompt,
  generateInvokeSubagentPayload,
};
