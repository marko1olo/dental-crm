#!/usr/bin/env node
/**
 * ANTIGRAVITY AUTOMATED SWARM RESUSCITATION ENGINE (MANDATE 8l)
 *
 * Automatically scans the local brain storage for subagents killed by language server restart
 * or 429 quota stalls, extracts their complete execution history and modified files,
 * and generates ready-to-dispatch `invoke_subagent` payloads for instant swarm resuscitation.
 *
 * Commands:
 *   node scripts/antigravity_swarm_resuscitation.cjs --scan
 *   node scripts/antigravity_swarm_resuscitation.cjs --json
 *   node scripts/antigravity_swarm_resuscitation.cjs --recent-hours 12
 */

const fs = require("fs");
const path = require("path");
const { parseTranscript, generateHandoverPrompt } = require("./antigravity_transcript_relay.cjs");

const BRAIN_DIR = path.join(
  process.env.USERPROFILE || "C:\\Users\\Admin",
  ".gemini",
  "antigravity",
  "brain"
);

function extractRoleFromPrompt(prompt) {
  if (!prompt) return "Autonomous Specialist";
  const tagMatch = /\[([A-Z0-9\s&—_\-]{5,60})\]/.exec(prompt);
  if (tagMatch) {
    const rawTag = tagMatch[1].trim();
    // Shorten if too long
    const words = rawTag.split(/\s+/).slice(0, 4).join(" ");
    return words;
  }
  const lines = prompt.split("\n").filter(l => l.trim().length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0].replace(/[^a-zA-Zа-яА-Я0-9\s]/g, " ").trim();
    return firstLine.split(/\s+/).slice(0, 4).join(" ") || "Autonomous Specialist";
  }
  return "Autonomous Specialist";
}

function findRestartAffectedSubagents(options = {}) {
  const maxAgeHours = options.recentHours || 24;
  const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

  if (!fs.existsSync(BRAIN_DIR)) {
    console.error(`Brain directory not found at ${BRAIN_DIR}`);
    return [];
  }

  const entries = fs.readdirSync(BRAIN_DIR);
  const affected = [];

  for (const entry of entries) {
    const transcriptPath = path.join(BRAIN_DIR, entry, ".system_generated", "logs", "transcript.jsonl");
    if (!fs.existsSync(transcriptPath)) continue;

    try {
      const stat = fs.statSync(transcriptPath);
      if (stat.mtimeMs < cutoffTime) continue;

      const content = fs.readFileSync(transcriptPath, "utf8");
      const lines = content.trim().split("\n");
      if (lines.length === 0) continue;

      let hasRestartNotice = false;
      let lastStepType = null;
      let lastStepIndex = 0;

      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
        try {
          const step = JSON.parse(lines[i]);
          if (!lastStepType && step.type) {
            lastStepType = step.type;
            lastStepIndex = step.step_index;
          }
          if (step.content && typeof step.content === "string" && step.content.includes("stopped due to server restart")) {
            hasRestartNotice = true;
          }
        } catch {}
      }

      if (hasRestartNotice) {
        let details = null;
        try {
          details = parseTranscript(entry);
        } catch {}

        const role = details ? extractRoleFromPrompt(details.initialPrompt) : "Autonomous Specialist";
        const prompt = generateHandoverPrompt(entry);

        affected.push({
          conversationId: entry,
          role,
          totalSteps: lines.length,
          lastStepType,
          lastModified: stat.mtime,
          completedActionsCount: details?.completedActionsCount || 0,
          modifiedFilesCount: details?.modifiedFiles?.length || 0,
          subagentPayload: {
            TypeName: "self",
            Role: role,
            Prompt: prompt,
            Model: "inherit",
            Workspace: "inherit",
          },
        });
      }
    } catch {}
  }

  return affected;
}

function runCli() {
  const args = process.argv.slice(2);
  const isJson = args.includes("--json");
  const recentHoursIdx = args.indexOf("--recent-hours");
  const recentHours = recentHoursIdx !== -1 ? parseFloat(args[recentHoursIdx + 1]) : 24;

  const affected = findRestartAffectedSubagents({ recentHours });

  if (isJson) {
    const payload = {
      Subagents: affected.map(a => a.subagentPayload),
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log("=== ANTIGRAVITY AUTOMATED SWARM RESUSCITATION ENGINE (MANDATE 8l) ===");
  console.log(`Scan Scope: Brain trajectories modified in the last ${recentHours} hours`);
  console.log(`Target Directory: ${BRAIN_DIR}\n`);

  console.log(`Identified ${affected.length} restart-affected subagents.\n`);

  if (affected.length === 0) {
    console.log("[STATUS: CLEAN] No orphaned subagents detected. Swarm is clean.");
    return;
  }

  for (let i = 0; i < affected.length; i++) {
    const item = affected[i];
    console.log(`[${i + 1}/${affected.length}] Subagent: ${item.role}`);
    console.log(`      ID:              ${item.conversationId}`);
    console.log(`      Steps Executed:  ${item.totalSteps} (Tool Actions: ${item.completedActionsCount})`);
    console.log(`      Modified Files:  ${item.modifiedFilesCount}`);
    console.log(`      Last Modified:   ${item.lastModified.toISOString()}`);
    console.log("");
  }

  console.log("----------------------------------------------------------------------");
  console.log("READY-TO-DISPATCH `invoke_subagent` PAYLOAD:");
  console.log("----------------------------------------------------------------------\n");

  const fullPayload = {
    Subagents: affected.map(a => a.subagentPayload),
  };

  console.log(JSON.stringify(fullPayload, null, 2));
}

if (require.main === module) {
  runCli();
}

module.exports = {
  findRestartAffectedSubagents,
  extractRoleFromPrompt,
};
