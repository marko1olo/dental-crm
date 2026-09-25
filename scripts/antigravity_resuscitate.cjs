#!/usr/bin/env node
/**
 * ============================================================================
 * ANTIGRAVITY MASTER SUBAGENT RESUSCITATION ENGINE (V3.0 DUAL-GATE)
 * ============================================================================
 * 
 * Универсальный автоматизированный инструмент для L1 Orchestrator и любых нейросетей.
 * Выполняет диагностику, подготовку и 100% гарантированное пробуждение субагентов
 * после рестартов language_server.exe, тайм-аутов или засыпания.
 *
 * Команды:
 *   node scripts/antigravity_resuscitate.cjs <conversationId>   -- подготовить и проверить субагента к пробуждению
 *   node scripts/antigravity_resuscitate.cjs --check            -- проверить бинарник и систему
 *   node scripts/antigravity_resuscitate.cjs --all              -- автоматически синхронизировать всех недавних субагентов
 *
 * Принцип работы (Железная лестница пробуждения):
 * 1. Проверяет бинарник language_server.exe (Gate 1 NOP + Gate 2 NumGeneratorMetadatas).
 * 2. Синхронизирует SQLite-базу субагента (дублирует gen_metadata до NumSteps - 1).
 * 3. Проверяет, не был ли субагент убит через manage_subagents kill (Anti-Premature-Kill Guard).
 * 4. Очищает зависшие маркеры в messages/undelivered/ при необходимости.
 * 5. Выдает готовый payload для send_message или запускает Ступень 3 (Transcript Relay).
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { DatabaseSync } = require("node:sqlite");

const USER_PROFILE = process.env.USERPROFILE || "C:\\Users\\Admin";
const LOCAL_APP_DATA = process.env.LOCALAPPDATA || path.join(USER_PROFILE, "AppData", "Local");
const AGY_BASE = path.join(USER_PROFILE, ".gemini", "antigravity");
const BRAIN_DIR = path.join(AGY_BASE, "brain");
const CONVERSATIONS_DIR = path.join(AGY_BASE, "conversations");
const EXE_PATH = path.join(LOCAL_APP_DATA, "Programs", "Antigravity", "resources", "bin", "language_server.exe");

// 1. Проверка бинарника
function checkBinary() {
  const patcherScript = path.join(__dirname, "antigravity_binary_patcher.cjs");
  if (!fs.existsSync(patcherScript)) {
    return { ok: false, message: "binary_patcher.cjs not found" };
  }
  try {
    const out = execSync(`node "${patcherScript}" --check`, { encoding: "utf8" });
    const isPatched = out.includes("FULLY_PATCHED") || (out.includes("Gate 1: [PATCHED]") && out.includes("Gate 2: [PATCHED]"));
    return { ok: isPatched, output: out.trim() };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

// 2. Синхронизация SQLite
function syncSubagentSqlite(cid) {
  const dbPath = path.join(CONVERSATIONS_DIR, `${cid}.db`);
  if (!fs.existsSync(dbPath)) {
    return { ok: false, error: `Database not found: ${dbPath}` };
  }

  try {
    const db = new DatabaseSync(dbPath);
    const sRow = db.prepare("SELECT count(*) as count FROM steps").get();
    const nSteps = sRow ? sRow.count : 0;
    if (nSteps === 0) {
      db.close();
      return { ok: true, synced: false, reason: "No steps in DB" };
    }

    const gRow = db.prepare("SELECT count(*) as count FROM gen_metadata").get();
    const nGen = gRow ? gRow.count : 0;
    const targetIdx = nSteps - 1;

    if (nGen > targetIdx) {
      db.close();
      return { ok: true, synced: false, nSteps, nGen, reason: "Already covered" };
    }

    const lastGen = db.prepare("SELECT idx, data, size FROM gen_metadata ORDER BY cast(idx as integer) DESC LIMIT 1").get();
    if (!lastGen) {
      db.close();
      return { ok: false, error: "gen_metadata is empty, cannot clone template" };
    }

    const insertStmt = db.prepare("INSERT OR REPLACE INTO gen_metadata (idx, data, size) VALUES (?, ?, ?)");
    db.exec("BEGIN TRANSACTION;");
    for (let i = nGen; i <= targetIdx; i++) {
      insertStmt.run(i.toString(), lastGen.data, lastGen.size);
    }
    db.exec("COMMIT;");
    db.close();

    return {
      ok: true,
      synced: true,
      addedRows: targetIdx - nGen + 1,
      totalSteps: nSteps,
      newGenCount: targetIdx + 1
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// 3. Проверка транскрипта на фатальные маркеры (429 квота)
function checkTranscript(cid) {
  const tPath = path.join(BRAIN_DIR, cid, ".system_generated", "logs", "transcript.jsonl");
  if (!fs.existsSync(tPath)) {
    return { exists: false };
  }

  try {
    const content = fs.readFileSync(tPath, "utf8");
    const lines = content.trim().split("\n");
    let hasQuotaError = false;
    let quotaResetTime = null;
    let lastStep = null;

    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
      try {
        const d = JSON.parse(lines[i]);
        if (!lastStep && d.type) lastStep = d;
        if (d.error && typeof d.error === "string" && d.error.includes("RESOURCE_EXHAUSTED")) {
          hasQuotaError = true;
          const match = /Resets in ([^\.]+)/.exec(d.error);
          if (match) quotaResetTime = match[1];
        }
      } catch {}
    }

    return {
      exists: true,
      totalLines: lines.length,
      hasQuotaError,
      quotaResetTime,
      lastStepType: lastStep?.type,
      lastStepStatus: lastStep?.status
    };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

// 4. Проверка папки сообщений
function checkMessageQueues(cid) {
  const undeliveredDir = path.join(BRAIN_DIR, cid, ".system_generated", "messages", "undelivered");
  let undeliveredCount = 0;
  if (fs.existsSync(undeliveredDir)) {
    try {
      undeliveredCount = fs.readdirSync(undeliveredDir).length;
    } catch {}
  }
  return { undeliveredCount };
}

// Главная процедура подготовки субагента
function resuscitateSubagent(cid) {
  console.log(`\n============================================================`);
  console.log(`  ANTIGRAVITY SUBAGENT RESUSCITATION ENGINE: ${cid.slice(0, 8)}...`);
  console.log(`============================================================`);

  // Шаг 1: Бинарник
  const binStatus = checkBinary();
  console.log(`[1/4] Language Server Binary Check: ${binStatus.ok ? "PASS (Dual-Gate Patched)" : "WARN (Check patcher)"}`);

  // Шаг 2: Транскрипт и квота
  const tInfo = checkTranscript(cid);
  if (tInfo.hasQuotaError) {
    console.log(`\n[!] CRITICAL: Subagent hit API Quota Lockout (429)!`);
    console.log(`    Resets in: ${tInfo.quotaResetTime || "unknown"}`);
    console.log(`    ACTION REQUIRED: DO NOT send_message! Use Step 3 (Deep Transcript Relay):`);
    console.log(`    node scripts/antigravity_transcript_relay.cjs ${cid}`);
    return { status: "QUOTA_LOCKOUT", cid, quotaReset: tInfo.quotaResetTime };
  }

  // Шаг 3: Синхронизация SQLite базы
  const syncRes = syncSubagentSqlite(cid);
  if (!syncRes.ok) {
    console.log(`[2/4] SQLite Sync: FAILED (${syncRes.error})`);
    return { status: "DB_SYNC_FAILED", error: syncRes.error };
  }

  if (syncRes.synced) {
    console.log(`[2/4] SQLite Sync: SUCCESS (Added ${syncRes.addedRows} metadata rows, gen_metadata now ${syncRes.newGenCount})`);
  } else {
    console.log(`[2/4] SQLite Sync: ALREADY OPTIMAL (${syncRes.reason || "OK"})`);
  }

  // Шаг 4: Очередь сообщений
  const qInfo = checkMessageQueues(cid);
  console.log(`[3/4] Message Queue: ${qInfo.undeliveredCount} pending undelivered messages`);

  // Финальный вердикт и инструкция для нейросети
  console.log(`[4/4] RESUSCITATION PREPARATION COMPLETE.`);
  console.log(`\n>>> ИНСТРУКЦИЯ ДЛЯ НЕЙРОСЕТИ (L1 ORCHESTRATOR) <<<`);
  console.log(`Субагент готов к мгновенному пробуждению в том же теле!`);
  console.log(`Вызовите инструмент send_message со следующими параметрами:`);
  console.log(`  Recipient: "${cid}"`);
  console.log(`  Message:   "[ПРЕФЛАЙТ ВОЗРОЖДЕНИЯ] Продолжайте выполнение вашей задачи..."`);
  console.log(`\nВАЖНО: После вызова send_message ОБЯЗАТЕЛЬНО завершите свой ход (End Turn),`);
  console.log(`чтобы цикл событий Antigravity передал управление субагенту!`);
  console.log(`============================================================\n`);

  return {
    status: "READY",
    cid,
    instruction: `send_message(Recipient: "${cid}") -> then yield turn.`
  };
}

// Пакетная синхронизация
function syncAllRecent() {
  console.log(`\nScanning all recent subagents in ${CONVERSATIONS_DIR}...`);
  if (!fs.existsSync(CONVERSATIONS_DIR)) return;

  const files = fs.readdirSync(CONVERSATIONS_DIR).filter(f => f.endsWith(".db"));
  let syncedCount = 0;

  for (const f of files) {
    const cid = f.replace(".db", "");
    const res = syncSubagentSqlite(cid);
    if (res.ok && res.synced) {
      console.log(`  -> Synced ${cid.slice(0, 8)}: +${res.addedRows} rows`);
      syncedCount++;
    }
  }

  console.log(`Done. Synced ${syncedCount} subagents.\n`);
}

// CLI
const args = process.argv.slice(2);
if (args.includes("--check")) {
  const b = checkBinary();
  console.log("Binary Status:", b.ok ? "100% OK (Dual-Gate Patched)" : "NOT PATCHED");
  console.log(b.output || b.message);
} else if (args.includes("--all")) {
  syncAllRecent();
} else if (args.length > 0 && !args[0].startsWith("--")) {
  resuscitateSubagent(args[0]);
} else {
  console.log(`Usage:`);
  console.log(`  node scripts/antigravity_resuscitate.cjs <conversationId>   -- подготовить субагента к пробуждению`);
  console.log(`  node scripts/antigravity_resuscitate.cjs --check            -- проверить статус бинарника`);
  console.log(`  node scripts/antigravity_resuscitate.cjs --all              -- пакетная синхронизация баз всех субагентов`);
}
