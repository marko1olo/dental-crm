const fs = require('fs');
const file = 'apps/api/src/routes/smartImports.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `  const sources: MigrationAutopilotSource[] = [];
  for (const candidate of probedCandidates) {
    let probe: MigrationLocalSourceProbeResponse | null = null;
    try {
      probe = await buildMigrationLocalSourceProbe({
        sourceRef: candidate.sourceRef,
        sourceKind: candidate.sourceKind,
        safeDisplayName: candidate.safeDisplayName,
        maxDepth: Math.min(2, input.maxDepth),
        maxFolders: 100,
        maxFiles: 600,
        maxSampleArtifacts: 10,
        readHeaderBytes: 4096
      });
      probe.warnings.forEach((warning) => warnings.add(warning));
      probe.privacyWarnings.forEach((warning) => privacyWarnings.add(warning));
    } catch {
      warnings.add(\`Источник \${candidate.safeDisplayName} найден, но быстрая проверка не завершилась. Откройте план источника или выберите папку вручную.\`);
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
  }`;

const replace = `  const sources: MigrationAutopilotSource[] = await Promise.all(
    probedCandidates.map(async (candidate) => {
      let probe: MigrationLocalSourceProbeResponse | null = null;
      try {
        probe = await buildMigrationLocalSourceProbe({
          sourceRef: candidate.sourceRef,
          sourceKind: candidate.sourceKind,
          safeDisplayName: candidate.safeDisplayName,
          maxDepth: Math.min(2, input.maxDepth),
          maxFolders: 100,
          maxFiles: 600,
          maxSampleArtifacts: 10,
          readHeaderBytes: 4096
        });
        probe.warnings.forEach((warning) => warnings.add(warning));
        probe.privacyWarnings.forEach((warning) => privacyWarnings.add(warning));
      } catch {
        warnings.add(\`Источник \${candidate.safeDisplayName} найден, но быстрая проверка не завершилась. Откройте план источника или выберите папку вручную.\`);
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
  );`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync(file, code);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the block to replace.");
}
