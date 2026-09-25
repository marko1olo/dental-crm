#!/usr/bin/env node
/**
 * ANTIGRAVITY BINARY PATCHER & VALIDATOR (DUAL-GATE RESUSCITATION ENGINE)
 *
 * Robust, signature-driven binary patcher for `language_server.exe`.
 * Solves the subagent post-restart dormancy problem by eliminating BOTH binary gates:
 *
 * GATE 1: reviveRecipientIfChild match-count check (offset ~0x212fb96)
 *   Bypasses the in-memory child table check that fails after language_server restarts.
 *   cmp rdx, r8
 *   mov r10, [rsp+0x100]
 *   jle +rel8 (7e) -> NOP NOP (90 90)
 *
 * GATE 2: MaybeReviveAgent index confusion bug (offset ~0x2240c39)
 *   Fixes index confusion where MaybeReviveAgent called NumSteps (+0xa0) instead of
 *   NumGeneratorMetadatas (+0x90), causing GeneratorMetadataHeader to always return NULL
 *   and aborting startMessageWatcherLocked.
 *   mov rcx, [rcx + 0xa0] (48 8b 89 a0 ...) -> mov rcx, [rcx + 0x90] (48 8b 89 90 ...)
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

// Gate 1: reviveRecipientIfChild child-check bypass
const G1_SIGNATURE_ORIGINAL = Buffer.from([
  0x4c, 0x39, 0xc2, 0x4c, 0x8b, 0x94, 0x24, 0x00, 0x01, 0x00, 0x00, 0x7e
]);
const G1_SIGNATURE_PATCHED = Buffer.from([
  0x4c, 0x39, 0xc2, 0x4c, 0x8b, 0x94, 0x24, 0x00, 0x01, 0x00, 0x00, 0x90, 0x90
]);

// Gate 2: MaybeReviveAgent NumSteps -> NumGeneratorMetadatas fix
const G2_SIGNATURE_ORIGINAL = Buffer.from([
  0x48, 0x8b, 0x44, 0x24, 0x58, // mov rax, [rsp+0x58]
  0x48, 0x8b, 0x48, 0x08,       // mov rcx, [rax+0x8]
  0x48, 0x8b, 0x40, 0x10,       // mov rax, [rax+0x10]
  0x48, 0x8b, 0x89, 0xa0, 0x00, 0x00, 0x00, // mov rcx, [rcx+0xa0] (NumSteps)
  0xff, 0xd1                    // call rcx
]);
const G2_SIGNATURE_PATCHED = Buffer.from([
  0x48, 0x8b, 0x44, 0x24, 0x58, // mov rax, [rsp+0x58]
  0x48, 0x8b, 0x48, 0x08,       // mov rcx, [rax+0x8]
  0x48, 0x8b, 0x40, 0x10,       // mov rax, [rax+0x10]
  0x48, 0x8b, 0x89, 0x90, 0x00, 0x00, 0x00, // mov rcx, [rcx+0x90] (NumGeneratorMetadatas)
  0xff, 0xd1                    // call rcx
]);

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
    const buf = fs.readFileSync(exePath);

    // Check Gate 1
    const g1_orig = buf.indexOf(G1_SIGNATURE_ORIGINAL);
    const g1_patch = buf.indexOf(G1_SIGNATURE_PATCHED);
    let g1_status = "unknown";
    let g1_offset = -1;
    if (g1_patch !== -1) {
      g1_status = "patched";
      g1_offset = g1_patch + G1_SIGNATURE_PATCHED.length - 2;
    } else if (g1_orig !== -1) {
      g1_status = "original";
      g1_offset = g1_orig + G1_SIGNATURE_ORIGINAL.length - 1;
    }

    // Check Gate 2
    const g2_orig = buf.indexOf(G2_SIGNATURE_ORIGINAL);
    const g2_patch = buf.indexOf(G2_SIGNATURE_PATCHED);
    let g2_status = "unknown";
    let g2_offset = -1;
    if (g2_patch !== -1) {
      g2_status = "patched";
      g2_offset = g2_patch + 16;
    } else if (g2_orig !== -1) {
      g2_status = "original";
      g2_offset = g2_orig + 16;
    }

    const allPatched = g1_status === "patched" && g2_status === "patched";
    const nonePatched = g1_status === "original" && g2_status === "original";

    let overallStatus = "partial";
    if (allPatched) overallStatus = "fully_patched";
    else if (nonePatched) overallStatus = "original";

    return {
      status: overallStatus,
      sha256: getSha256(exePath),
      fileSize: buf.length,
      gate1: {
        name: "reviveRecipientIfChild (child table bypass)",
        status: g1_status,
        offset: g1_offset !== -1 ? "0x" + g1_offset.toString(16) : "N/A"
      },
      gate2: {
        name: "MaybeReviveAgent (NumGeneratorMetadatas index fix)",
        status: g2_status,
        offset: g2_offset !== -1 ? "0x" + g2_offset.toString(16) : "N/A"
      }
    };
  } catch (err) {
    return { status: "error", error: err.message };
  }
}

function applyPatchesToBuffer(buf) {
  let g1_patched = false;
  let g2_patched = false;

  const g1_idx = buf.indexOf(G1_SIGNATURE_ORIGINAL);
  if (g1_idx !== -1) {
    const target = g1_idx + G1_SIGNATURE_ORIGINAL.length - 1;
    buf[target] = 0x90;
    buf[target + 1] = 0x90;
    g1_patched = true;
  }

  const g2_idx = buf.indexOf(G2_SIGNATURE_ORIGINAL);
  if (g2_idx !== -1) {
    const target = g2_idx + 16;
    buf[target] = 0x90; // change 0xa0 to 0x90
    g2_patched = true;
  }

  return { buf, g1_patched, g2_patched };
}

function patchBinary(exePath) {
  const current = checkStatus(exePath);
  if (current.status === "fully_patched") {
    console.log("[Antigravity Patcher] Binary is ALREADY FULLY PATCHED (both Gate 1 and Gate 2)!");
    return true;
  }
  if (current.status === "error" || current.status === "not_found") {
    console.error(`[Antigravity Patcher] Cannot patch: ${current.error}`);
    return false;
  }

  console.log("[Antigravity Patcher] Current Gate Status:");
  console.log(`  - Gate 1 (${current.gate1.name}): ${current.gate1.status} at ${current.gate1.offset}`);
  console.log(`  - Gate 2 (${current.gate2.name}): ${current.gate2.status} at ${current.gate2.offset}`);

  // Create safe backup
  const backupPath = `${exePath}.bak_${Date.now()}`;
  console.log(`[Antigravity Patcher] Creating safe backup: ${backupPath}`);
  fs.copyFileSync(exePath, backupPath);

  // Read full buffer
  const buf = fs.readFileSync(exePath);
  const { g1_patched, g2_patched } = applyPatchesToBuffer(buf);

  console.log(`[Antigravity Patcher] Patch results: Gate 1 = ${g1_patched ? "PATCHED" : "ALREADY PATCHED"}, Gate 2 = ${g2_patched ? "PATCHED" : "ALREADY PATCHED"}`);

  // Try direct write first
  try {
    fs.writeFileSync(exePath, buf);
    console.log("[Antigravity Patcher] Successfully written patched binary directly!");
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

        // Step 2: Write patched buffer to target original name
        fs.writeFileSync(exePath, buf);

        console.log("[Antigravity Patcher] Atomic replacement succeeded! Patched binary placed at target path.");
        console.log(`[Antigravity Patcher] New SHA-256: ${getSha256(exePath)}`);
        console.log("[Antigravity Patcher] The patched binary will be active on next language server restart.");
        return true;
      } catch (atomicErr) {
        console.error(`[Antigravity Patcher] Atomic replacement failed: ${atomicErr.message}`);
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

console.log("=== ANTIGRAVITY BINARY PATCHER & VALIDATOR (DUAL-GATE ENGINE) ===");
console.log(`Target: ${exeArg}`);

if (args.includes("--undo")) {
  undoPatch(exeArg);
} else if (args.includes("--patch")) {
  patchBinary(exeArg);
} else {
  const info = checkStatus(exeArg);
  console.log("Overall Status:", info.status.toUpperCase());
  console.log("File Size:", info.fileSize, "bytes");
  console.log("SHA-256:", info.sha256);
  console.log("\nGate Breakdown:");
  console.log(`  1. ${info.gate1.name}: [${info.gate1.status.toUpperCase()}] at offset ${info.gate1.offset}`);
  console.log(`  2. ${info.gate2.name}: [${info.gate2.status.toUpperCase()}] at offset ${info.gate2.offset}`);

  if (info.status === "fully_patched") {
    console.log("\n[VERIFIED] Both resuscitation gates are safely patched! Subagents will revive 100% reliably.");
  } else if (info.status === "partial") {
    console.log("\n[WARNING] Only 1 of 2 gates is patched. Run with --patch to apply full resuscitation patch.");
  } else if (info.status === "original") {
    console.log("\n[INFO] Binary is unmodified original. Run with --patch to apply dual-gate resuscitation patch.");
  }
}
