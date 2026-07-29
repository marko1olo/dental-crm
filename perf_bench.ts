import { doctorPerformance } from './apps/api/src/services/reports/managerReports';

async function run() {
  const scope = {
    organizationId: 'org-test',
    from: new Date('2020-01-01'),
    to: new Date('2030-01-01'),
    timeZone: 'UTC'
  };

  try {
    // Warmup
    await doctorPerformance(scope).catch(() => {});

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await doctorPerformance(scope);
    }
    const end = performance.now();

    console.log(`[Baseline] Total time for 100 runs: ${(end - start).toFixed(2)}ms`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
