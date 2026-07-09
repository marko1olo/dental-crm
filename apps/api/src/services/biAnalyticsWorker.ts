import { db } from "../db/client.js";
import { biAnalyticsSnapshots, organizations } from "../db/schema.js";

// Mock data generators for the BI dashboard
function generateCohortLtv() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  return months.map(month => ({
    cohort: month,
    "Month 1": Math.floor(Math.random() * 5000) + 15000,
    "Month 3": Math.floor(Math.random() * 15000) + 30000,
    "Month 6": Math.floor(Math.random() * 30000) + 60000,
    "Month 12": Math.floor(Math.random() * 60000) + 120000,
  }));
}

function generatePlanFunnel() {
  const base = Math.floor(Math.random() * 200) + 800;
  return [
    { name: "Draft", value: base, fill: "#4f46e5" },
    { name: "Proposed", value: Math.floor(base * 0.8), fill: "#0ea5e9" },
    { name: "Approved", value: Math.floor(base * 0.5), fill: "#10b981" },
    { name: "Active", value: Math.floor(base * 0.4), fill: "#f59e0b" },
    { name: "Completed", value: Math.floor(base * 0.3), fill: "#8b5cf6" },
  ];
}

function generateChairUtilization() {
  return [
    { name: "Chair 1", value: Math.floor(Math.random() * 30) + 60, fill: "#3b82f6" },
    { name: "Chair 2", value: Math.floor(Math.random() * 30) + 50, fill: "#10b981" },
    { name: "Chair 3", value: Math.floor(Math.random() * 40) + 40, fill: "#f59e0b" },
    { name: "Surgery", value: Math.floor(Math.random() * 20) + 70, fill: "#ef4444" },
  ];
}

function generateDoctorProfitability() {
  const doctors = ["Dr. Ivanov", "Dr. Smirnova", "Dr. Kozlov", "Dr. Morozov"];
  return doctors.map(doc => {
    const revenue = Math.floor(Math.random() * 1000000) + 500000;
    const materialCost = Math.floor(revenue * (Math.random() * 0.1 + 0.1));
    const commission = Math.floor(revenue * 0.25); // 25% commission
    const margin = revenue - materialCost - commission;
    return {
      name: doc,
      revenue,
      materialCost,
      commission,
      margin,
      completionRate: Math.floor(Math.random() * 20) + 75
    };
  }).sort((a, b) => b.margin - a.margin);
}

export async function computeBiAnalyticsSnapshots() {
  try {
    const orgs = await db.select().from(organizations);
    if (!orgs.length) return;

    for (const org of orgs) {
      const cohortLtvJson = generateCohortLtv();
      const planFunnelJson = generatePlanFunnel();
      const chairUtilizationJson = generateChairUtilization();
      const doctorProfitabilityJson = generateDoctorProfitability();

      await db.insert(biAnalyticsSnapshots).values({
        organizationId: org.id,
        snapshotDate: new Date(),
        cohortLtvJson,
        planFunnelJson,
        chairUtilizationJson,
        doctorProfitabilityJson
      });
      console.log(`[BI Worker] Snapshot generated for org ${org.id}`);
    }
  } catch (err) {
    console.error("[BI Worker] Error generating snapshots:", err);
  }
}

export function startBiAnalyticsWorker() {
  // Generate immediately on startup to ensure we have data for the UI
  computeBiAnalyticsSnapshots();
  
  // Run periodically (e.g. every hour or nightly, using 1 hour interval here for tests)
  return setInterval(() => {
    computeBiAnalyticsSnapshots();
  }, 1000 * 60 * 60);
}
