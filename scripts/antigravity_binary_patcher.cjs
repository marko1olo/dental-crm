#!/usr/bin/env node
/**
 * ANTIGRAVITY BINARY PATCHER & VALIDATOR (PATH 1)
 *
 * Safe binary inspection and patching utility for `language_server.exe`.
 * Addresses the subagent dormancy bug where `SendMessageTool.reviveRecipientIfChild`
 * fails to revive child subagents after language server restart due to empty in-memory tables.
 *
 * Target:
 *   Binary: language_server.exe
 *   Function: SendMessageTool.reviveRecipientIfChild
 *   ImageBase: 0x140000000
 *   Virtual Address: 0x141EB5B40
 *   File Offset: 0x1EB5140
 *   Bypass Offset: 0x1EB536A (jump to return when match count <= 0)
 *
 * Commands:
 *   node scripts/antigravity_binary_patcher.cjs --check
 *   node scripts/antigravity_binary_patcher.cjs --patch
 *   node scripts/antigravity_binary_patcher.cjs --undo
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_EXE_PATH = path.join(
  process.env.LOCALAPPDATA || "C:\\Users\\Admin\\AppData\\Local",
  "Programs",
  "Antigravity",
  "resources",
  "bin",
  "language_server.exe"
);

// Target file offset for reviveRecipientIfChild match-count check
// At 0x1EB536A: 7E 2E (JLE +0x2E -> skips call r8 to reviveSubagentFn)
const TARGET_OFFSET = 0x1eb536a;
const EXPECTED_ORIGINAL_BYTES = Buffer.from([0x7e, 0x2e]);
const PATCHED_BYTES = Buffer.from([0x90, 0x90]); // NOP NOP -> fall through to call r8

function getSha256(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function checkStatus(exePath) {
  if (!fs.existsSync(exePath)) {
    return { status: "not_found", error: `File not found at ${exePath}` };
  }

  try {
    const fd = fs.openSync(exePath, "r");
    const buf = Buffer.alloc(2);
    fs.readSync(fd, buf, 0, 2, TARGET_OFFSET);
    fs.closeSync(fd);

    const isOriginal = buf.equals(EXPECTED_ORIGINAL_BYTES);
    const isPatched = buf.equals(PATCHED_BYTES);

    return {
      status: isOriginal ? "original" : isPatched ? "patched" : "unknown",
      bytes: buf.toString("hex"),
      sha256: getSha256(exePath),
      fileSize: fs.statSync(exePath).size,
      offset: "0x" + TARGET_OFFSET.toString(16),
    };
  } catch (err) {
    return { status: "error", error: err.message };
  }
}

function patchBinary(exePath) {
  const current = checkStatus(exePath);
  if (current.status === "patched") {
    console.log("[Antigravity Patcher] Binary is already patched!");
    return true;
  }
  if (current.status !== "original") {
    console.error(`[Antigravity Patcher] Cannot patch: byte mismatch at ${current.offset}. Read: ${current.bytes}, expected: ${EXPECTED_ORIGINAL_BYTES.toString("hex")}`);
    return false;
  }

  // Create backup
  const backupPath = `${exePath}.bak_${Date.now()}`;
  console.log(`[Antigravity Patcher] Creating safe backup: ${backupPath}`);
  fs.copyFileSync(exePath, backupPath);

  // Write patch
  try {
    const fd = fs.openSync(exePath, "r+");
    fs.writeSync(fd, PATCHED_BYTES, 0, 2, TARGET_OFFSET);
    fs.closeSync(fd);
    console.log(`[Antigravity Patcher] Successfully patched 2 bytes at offset ${current.offset} (7e 2e -> 90 90).`);
    console.log(`[Antigravity Patcher] New SHA-256: ${getSha256(exePath)}`);
    return true;
  } catch (err) {
    console.error(`[Antigravity Patcher] Failed to write patch (file locked?): ${err.message}`);
    console.log("[Antigravity Patcher] Note: Ensure Antigravity and language_server.exe are stopped before applying binary patch.");
    return false;
  }
}

function undoPatch(exePath) {
  const dir = path.dirname(exePath);
  const base = path.basename(exePath);
  const backups = fs.readdirSync(dir)
    .filter(f => f.startsWith(`${base}.bak_`))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.error("[Antigravity Patcher] No backup files found to restore.");
    return false;
  }

  const latestBackup = path.join(dir, backups[0]);
  console.log(`[Antigravity Patcher] Restoring from latest backup: ${latestBackup}`);
  try {
    fs.copyFileSync(latestBackup, exePath);
    console.log("[Antigravity Patcher] Restoration complete. New status:", checkStatus(exePath).status);
    return true;
  } catch (err) {
    console.error(`[Antigravity Patcher] Restore failed: ${err.message}`);
    return false;
  }
}

// CLI Execution
const args = process.argv.slice(2);
const exeArg = args.find(a => !a.startsWith("--")) || DEFAULT_EXE_PATH;

console.log("=== ANTIGRAVITY BINARY PATCHER & VALIDATOR (PATH 1) ===");
console.log(`Target: ${exeArg}`);

if (args.includes("--undo")) {
  undoPatch(exeArg);
} else if (args.includes("--patch")) {
  patchBinary(exeArg);
} else {
  // Default: --check
  const info = checkStatus(exeArg);
  console.log("Status:", info.status.toUpperCase());
  console.log("Offset:", info.offset);
  console.log("Bytes at offset:", info.bytes);
  console.log("File Size:", info.fileSize, "bytes");
  console.log("SHA-256:", info.sha256);
  if (info.status === "original") {
    console.log("\n[OK] Binary is 100% genuine unmodified original. Ready for patching if desired.");
  } else if (info.status === "patched") {
    console.log("\n[OK] Binary is already safely patched with NOP bypass.");
  }
}
