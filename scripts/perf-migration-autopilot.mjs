import { performance } from 'perf_hooks';
import { readFileSync } from 'fs';

// To mock what the function does, let's create a script that tests just the promise part
const mockCandidates = Array(20).fill(0).map((_, i) => ({
  sourceRef: `source-${i}`,
  sourceKind: `kind-${i}`,
  safeDisplayName: `display-${i}`
}));

async function buildMigrationLocalSourceProbeMock(candidate) {
  // Simulate some async I/O
  await new Promise(resolve => setTimeout(resolve, 50));
  return {
    warnings: [],
    privacyWarnings: []
  };
}

function migrationAutopilotScore() { return 1; }
function migrationAutopilotReadiness() { return true; }
function migrationAutopilotPriority() { return 1; }
function migrationAutopilotOwner() { return 'owner'; }
function migrationAutopilotBridgeKit() { return 'bridge'; }
function migrationAutopilotRecommendedAction() { return 'action'; }
function migrationAutopilotRiskFlags() { return []; }

async function runSequential() {
  const sources = [];
  const start = performance.now();
  for (const candidate of mockCandidates) {
    let probe = null;
    try {
      probe = await buildMigrationLocalSourceProbeMock(candidate);
    } catch {
    }
    const score = migrationAutopilotScore(candidate, probe);
    const readiness = migrationAutopilotReadiness(candidate, probe);
    sources.push({
      candidate,
      probe,
      score,
      priority: migrationAutopilotPriority(score),
      owner: migrationAutopilotOwner(candidate, probe),
      readiness,
      bridgeKit: migrationAutopilotBridgeKit(candidate, probe, readiness),
      recommendedAction: migrationAutopilotRecommendedAction(candidate, probe),
      riskFlags: migrationAutopilotRiskFlags(candidate, probe)
    });
  }
  const end = performance.now();
  return end - start;
}

async function runParallel() {
  const start = performance.now();
  const sources = await Promise.all(
    mockCandidates.map(async (candidate) => {
      let probe = null;
      try {
        probe = await buildMigrationLocalSourceProbeMock(candidate);
      } catch {
      }
      const score = migrationAutopilotScore(candidate, probe);
      const readiness = migrationAutopilotReadiness(candidate, probe);
      return {
        candidate,
        probe,
        score,
        priority: migrationAutopilotPriority(score),
        owner: migrationAutopilotOwner(candidate, probe),
        readiness,
        bridgeKit: migrationAutopilotBridgeKit(candidate, probe, readiness),
        recommendedAction: migrationAutopilotRecommendedAction(candidate, probe),
        riskFlags: migrationAutopilotRiskFlags(candidate, probe)
      };
    })
  );
  const end = performance.now();
  return end - start;
}

async function main() {
  const seqTime = await runSequential();
  const parTime = await runParallel();
  console.log(`Sequential time: ${seqTime.toFixed(2)}ms`);
  console.log(`Parallel time: ${parTime.toFixed(2)}ms`);
}

main();
