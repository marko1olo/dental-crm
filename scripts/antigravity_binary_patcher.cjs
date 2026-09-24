#!/usr/bin/env node
/**
 * ANTIGRAVITY BINARY PATCHER & VALIDATOR (PATH 1) — SIGNATURE-DRIVEN
 *
 * Robust, signature-driven binary patcher for `language_server.exe`.
 * Addresses the subagent dormancy bug where `SendMessageTool.reviveRecipientIfChild`
 * fails to revive child subagents after language server restart due to empty in-memory tables.
 *
 * Instead of fragile hardcoded offsets that break on auto-updates, this engine dynamically
 * searches for the unique x86_64 instruction signature of `reviveRecipientIfChild` match check:
 *   cmp rdx, r8
 *   mov r10, [rsp+0x100]
 *   jle +rel8 (skips call rdx/r8 to reviveSubagentFn)
 *
 * On Windows, handles file-locks via atomic rename-and-replace strategy.
 *
 * Commands:
 *   node binary_patcher.cjs --check
 *   node binary_patcher.cjs --patch
 *   node binary_patcher.cjs --undo
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

// Unique x86_64 signature for reviveRecipientIfChild match-count check:
// 4c 39 c2               (cmp rdx, r8)
// 4c 8b 94 24 00 01 00 00 (mov r10, [rsp+0x100])
// 7e                     (jle)
const SIGNATURE_ORIGINAL = Buffer.from([
  0x4c, 0x39, 0xc2, 0x4c, 0x8b, 0x94, 0x24, 0x00, 0x01, 0x00, 0x00, 0x7e
]);

const SIGNATURE_PATCHED = Buffer.from([
  0x4c, 0x39, 0xc2, 0x4c, 0x8b, 0x94, 0x24, 0x00, 0x01, 0x00, 0x00, 0x90, 0x90
]);

const NOP_PATCH = Buffer.from([0x90, 0x90]);

function getSha256(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function findPatchLocation(buf) {
  let pos = 0;
  let originalOffset = -1;
  let patchedOffset = -1;

  // Search original
  while ((pos = buf.indexOf(SIGNATURE_ORIGINAL, pos)) !== -1) {
    originalOffset = pos + SIGNATURE_ORIGINAL.length - 1;
    break;
  }

  // Search patched
  pos = 0;
  while ((pos = buf.indexOf(SIGNATURE_PATCHED, pos)) !== -1) {
    patchedOffset = pos + SIGNATURE_PATCHED.length - 2;
    break;
  }

  return { originalOffset, patchedOffset };
}

function checkStatus(exePath) {
  if (!fs.existsSync(exePath)) {
    return { status: "not_found", error: `File not found at ${exePath}` };
  }

  try {
    const buf = fs.readFileSync(exePath);
    const { originalOffset, patchedOffset } = findPatchLocation(buf);

    if (patchedOffset !== -1) {
      return {
        status: "patched",
        offset: "0x" + patchedOffset.toString(16),
        bytes: buf.subarray(patchedOffset, patchedOffset + 2).toString("hex"),
        sha256: getSha256(exePath),
        fileSize: buf.length,
      };
    }

    if (originalOffset !== -1) {
      return {
        status: "original",
        offset: "0x" + originalOffset.toString(16),
        bytes: buf.subarray(originalOffset, originalOffset + 2).toString("hex"),
        sha256: getSha256(exePath),
        fileSize: buf.length,
      };
    }

    return {
      status: "unknown",
      offset: "N/A",
      bytes: "N/A",
      sha256: getSha256(exePath),
      fileSize: buf.length,
      error: "Signature not found in binary (unknown version or altered code).",
    };
  } catch (err) {
    return { status: "error", error: err.message };
  }
}

function patchBinary(exePath) {
  const current = checkStatus(exePath);
  if (current.status === "patched") {
    console.log("[Antigravity Patcher] Binary is already safely patched with NOP bypass!");
    return true;
  }
  if (current.status !== "original") {
    console.error(`[Antigravity Patcher] Cannot patch: binary status is '${current.status}'. ${current.error || ""}`);
    return false;
  }

  const offset = parseInt(current.offset, 16);
  console.log(`[Antigravity Patcher] Found dynamic target at offset ${current.offset} (bytes: ${current.bytes}).`);

  // Create safe backup
  const backupPath = `${exePath}.bak_${Date.now()}`;
  console.log(`[Antigravity Patcher] Creating safe backup: ${backupPath}`);
  fs.copyFileSync(exePath, backupPath);

  // Try direct write first
  try {
    const fd = fs.openSync(exePath, "r+");
    fs.writeSync(fd, NOP_PATCH, 0, 2, offset);
    fs.closeSync(fd);
    console.log(`[Antigravity Patcher] Successfully patched 2 bytes at offset ${current.offset} (${current.bytes} -> 90 90).`);
    console.log(`[Antigravity Patcher] New SHA-256: ${getSha256(exePath)}`);
    return true;
  } catch (err) {
    if (err.code === "EBUSY" || err.message.includes("busy") || err.message.includes("locked")) {
      console.log("[Antigravity Patcher] Binary is locked by running language_server.exe process.");
      console.log("[Antigravity Patcher] Executing atomic rename-and-replace strategy...");

      const tempRenamed = `${exePath}.running_${Date.now()}`;
      try {
        // Step 1: Rename the locked running file
        fs.renameSync(exePath, tempRenamed);
        console.log(`[Antigravity Patcher] Renamed running file to ${tempRenamed}`);

        // Step 2: Copy the backup to the original name
        fs.copyFileSync(backupPath, exePath);

        // Step 3: Patch the new file
        const fd = fs.openSync(exePath, "r+");
        fs.writeSync(fd, NOP_PATCH, 0, 2, offset);
        fs.closeSync(fd);

        console.log(`[Antigravity Patcher] Atomic replacement succeeded! New file patched at offset ${current.offset}.`);
        console.log(`[Antigravity Patcher] New SHA-256: ${getSha256(exePath)}`);
        console.log("[Antigravity Patcher] The patched binary will be loaded on next language server restart.");
        return true;
      } catch (atomicErr) {
        console.error(`[Antigravity Patcher] Atomic replacement failed: ${atomicErr.message}`);
        // Attempt recovery
        if (!fs.existsSync(exePath) && fs.existsSync(tempRenamed)) {
          fs.renameSync(tempRenamed, exePath);
        }
        return false;
      }
    } else {
      console.error(`[Antigravity Patcher] Patch write failed: ${err.message}`);
      return false;
    }
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
  const info = checkStatus(exeArg);
  console.log("Status:", info.status.toUpperCase());
  console.log("Offset:", info.offset);
  console.log("Bytes at offset:", info.bytes);
  console.log("File Size:", info.fileSize, "bytes");
  console.log("SHA-256:", info.sha256);
  if (info.status === "original") {
    console.log("\n[OK] Binary is genuine original. Dynamic signature matched and ready for patching.");
  } else if (info.status === "patched") {
    console.log("\n[OK] Binary is already safely patched with NOP bypass.");
  }
}
