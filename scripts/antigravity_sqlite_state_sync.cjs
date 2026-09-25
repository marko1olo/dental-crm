#!/usr/bin/env node
/**
 * ANTIGRAVITY SQLITE STATE SYNCHRONIZER (PATH 2 - ZERO-BINARY COMPATIBILITY)
 *
 * For environments where binary patching is restricted or before binary restart takes effect:
 * This tool synchronizes the SQLite conversation database so that `GeneratorMetadataHeader(lastIdx)`
 * always finds a valid metadata entry, allowing `MaybeReviveAgent` to start `startMessageWatcherLocked`.
 *
 * Usage:
 *   node sqlite_state_sync.cjs <conversationId>
 */

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const CONVERSATIONS_DIR = path.join(
  process.env.USERPROFILE || "C:\\Users\\Admin",
  ".gemini",
  "antigravity",
  "conversations"
);

function syncConversation(cid) {
  const dbPath = path.join(CONVERSATIONS_DIR, `${cid}.db`);
  if (!fs.existsSync(dbPath)) {
    console.log(`[SQLite Sync] Conversation DB not found: ${dbPath}`);
    return false;
  }

  try {
    const db = new DatabaseSync(dbPath);

    const sRow = db.prepare("SELECT count(*) as count FROM steps").get();
    const nSteps = sRow ? sRow.count : 0;
    if (nSteps === 0) {
      console.log(`[SQLite Sync] No steps found in DB.`);
      db.close();
      return false;
    }

    const gRow = db.prepare("SELECT count(*) as count FROM gen_metadata").get();
    const nGen = gRow ? gRow.count : 0;
    const targetIdx = nSteps - 1;

    console.log(`[SQLite Sync] Agent ${cid.slice(0, 8)}: steps=${nSteps} (lastIdx=${targetIdx}), gen_metadata=${nGen}`);

    if (nGen > targetIdx) {
      console.log(`[SQLite Sync] gen_metadata already covers lastIdx (${nGen} > ${targetIdx}). No sync needed.`);
      db.close();
      return true;
    }

    if (nGen === 0) {
      console.log(`[SQLite Sync] gen_metadata has 0 rows. Cannot duplicate template.`);
      db.close();
      return false;
    }

    const lastGen = db.prepare("SELECT idx, data, size FROM gen_metadata ORDER BY cast(idx as integer) DESC LIMIT 1").get();
    if (!lastGen) {
      db.close();
      return false;
    }

    console.log(`[SQLite Sync] Duplicating template from gen_metadata idx=${lastGen.idx} for indices ${nGen}..${targetIdx}...`);
    const insertStmt = db.prepare("INSERT OR REPLACE INTO gen_metadata (idx, data, size) VALUES (?, ?, ?)");

    db.exec("BEGIN TRANSACTION;");
    for (let i = nGen; i <= targetIdx; i++) {
      insertStmt.run(i.toString(), lastGen.data, lastGen.size);
    }
    db.exec("COMMIT;");

    console.log(`[SQLite Sync] Successfully added ${targetIdx - nGen + 1} metadata rows to ${cid.slice(0, 8)}.db!`);
    db.close();
    return true;
  } catch (err) {
    console.error(`[SQLite Sync] Error: ${err.message}`);
    return false;
  }
}

// CLI Execution
const args = process.argv.slice(2);
const targetCid = args[0];

if (!targetCid) {
  console.log("Usage: node sqlite_state_sync.cjs <conversationId>");
  process.exit(1);
}

const ok = syncConversation(targetCid);
if (ok) console.log("[SQLite Sync] [SUCCESS] Database synchronized.");
else console.log("[SQLite Sync] [WARNING] Sync failed or skipped.");
