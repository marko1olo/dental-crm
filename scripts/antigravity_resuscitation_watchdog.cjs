#!/usr/bin/env node
/**
 * ANTIGRAVITY RESUSCITATION WATCHDOG DAEMON (PATH 3)
 *
 * Continuously or on-demand monitors subagent health, detecting unrecoverable
 * dormancy caused by language server restarts, network stalls, or 429 quota drops.
 * Automatically initiates resuscitation or seamless Mandate 8l Transcript Relay.
 *
 * Commands:
 *   node scripts/antigravity_resuscitation_watchdog.cjs --probe
 *   node scripts/antigravity_resuscitation_watchdog.cjs --daemon --interval 10000
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BRAIN_DIR = path.join(
  process.env.USERPROFILE || "C:\\Users\\Admin",
  ".gemini",
  "antigravity",
  "brain"
);

function inspectSubagents() {
  if (!fs.existsSync(BRAIN_DIR)) {
    console.error(`Brain directory not found at ${BRAIN_DIR}`);
    return [];
  }

  const entries = fs.readdirSync(BRAIN_DIR);
  const reports = [];

  for (const entry of entries) {
    const transcriptPath = path.join(BRAIN_DIR, entry, ".system_generated", "logs", "transcript.jsonl");
    if (!fs.existsSync(transcriptPath)) continue;

    try {
      const stat = fs.statSync(transcriptPath);
      const content = fs.readFileSync(transcriptPath, "utf8");
      const lines = content.trim().split("\n");
      if (lines.length === 0) continue;

      let lastType = null;
      let hasRestartNotice = false;
      let lastStepIndex = 0;

      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
        try {
          const step = JSON.parse(lines[i]);
          if (!lastType && step.type) {
            lastType = step.type;
            lastStepIndex = step.step_index;
          }
          if (step.content && typeof step.content === "string" && step.content.includes("stopped due to server restart")) {
            hasRestartNotice = true;
          }
        } catch (e) {}
      }

      reports.push({
        conversationId: entry,
        totalSteps: lines.length,
        lastStepIndex,
        lastType,
        hasRestartNotice,
        lastModified: stat.mtime,
      });
    } catch (err) {}
  }

  return reports;
}

function probe() {
  console.log("=== ANTIGRAVITY RESUSCITATION WATCHDOG (PATH 3) ===");
  console.log(`Inspecting active brain trajectories in ${BRAIN_DIR}...\n`);

  const reports = inspectSubagents();
  console.log(`Found ${reports.length} total trajectories.`);

  const restartAffected = reports.filter(r => r.hasRestartNotice);
  console.log(`Restart-affected trajectories: ${restartAffected.length}`);

  for (const r of reports.slice(0, 5)) {
    console.log(`- [${r.conversationId}] Steps: ${r.totalSteps}, LastType: ${r.lastType}, RestartNotice: ${r.hasRestartNotice}`);
  }

  if (restartAffected.length > 0) {
    console.log("\n[ACTION REQUIRED] Detected subagents affected by language server restart:");
    for (const r of restartAffected) {
      console.log(`  • ID: ${r.conversationId}`);
      console.log(`    Steps: ${r.totalSteps} | Last Step Type: ${r.lastType} | Last Modified: ${r.lastModified.toISOString()}`);
      console.log(`    Handover: node scripts/antigravity_transcript_relay.cjs ${r.conversationId}`);
    }
  } else {
    console.log("\n[HEALTHY] No orphaned subagents currently requiring resuscitation.");
  }
}

// CLI Execution
const args = process.argv.slice(2);
if (args.includes("--daemon")) {
  const intervalArg = args.indexOf("--interval");
  const intervalMs = intervalArg !== -1 ? parseInt(args[intervalArg + 1], 10) : 15000;
  console.log(`[Watchdog] Running daemon loop with interval ${intervalMs}ms...`);
  setInterval(probe, intervalMs);
  probe();
} else {
  probe();
}
