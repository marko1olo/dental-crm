/**
 * contract-breach-analysis.mjs — точний аналіз розриву контракту API між фронтом і сервером
 *
 * Задача: знайти ВСІ виклики фронтенду, що ідуть у нікуди (404/405), та розбіжності методів.
 * Відомі з завдання:
 *  - POST /api/visits/quick (useAppLogic.tsx:13904) — маршрута немає
 *  - PUT vs PATCH на /api/communications/templates/:param
 *  - Ще 9 невідомих
 */

import {
  collectClientUsage,
  collectServerRoutes,
  buildTopology,
  normalizeRoutePath,
  routeKey
} from "./lib/route-topology.mjs";
import {
  createRealApiApp,
  collectRouteTable
} from "./lib/api-route-census.mjs";

// Побудувати повну перепись обох сторін
const serverRoutes = collectServerRoutes();
const clientUsage = collectClientUsage();

console.log("=== СТАТИЧНИЙ РОЗБІР ===");
console.log(`Серверних маршрутів: ${serverRoutes.length}`);
console.log(`Фронтових викликів: ${clientUsage.calls.length}`);
console.log(`Посилань (не fetch): ${clientUsage.references.length}`);
console.log(`Нерозібраних: ${clientUsage.unresolved.length}`);

// Живий сервер
console.log("\n=== ЖИВИЙ СЕРВЕР ===");
const { app } = await createRealApiApp();
const liveRoutes = collectRouteTable(app).filter(e => e.routePath.startsWith("/api/"));
await app.close();

console.log(`Живих маршрутів: ${liveRoutes.length}`);

// Побудувати Map живих маршрутів
const liveMap = new Map();
for (const route of liveRoutes) {
  const normalized = normalizeRoutePath(route.routePath);
  const key = routeKey(route.method, normalized);
  if (!liveMap.has(key)) liveMap.set(key, []);
  liveMap.get(key).push(route.routePath);
}

// Знайти всі фронтові виклики, що не мають відповідного маршрута
console.log("\n=== РОЗХОДЖЕННЯ: ФРОНТ КЛИЧЕ, СЕРВЕР НЕ ВІДПОВІДАЄ ===");
const missingRoutes = [];
const methodMismatches = [];

for (const call of clientUsage.calls) {
  const callPath = normalizeRoutePath(call.path);
  const callKey = routeKey(call.method, callPath);

  if (!liveMap.has(callKey)) {
    // Перевірити, чи існує маршрут з іншим методом
    const allMethodsForPath = [];
    for (const [key, paths] of liveMap.entries()) {
      if (key.split(" ")[1] === callPath) {
        allMethodsForPath.push(key.split(" ")[0]);
      }
    }

    if (allMethodsForPath.length > 0) {
      methodMismatches.push({
        call,
        expectedMethod: call.method,
        actualMethods: allMethodsForPath
      });
    } else {
      missingRoutes.push(call);
    }
  }
}

console.log(`\nМаршрутів, що не існують: ${missingRoutes.length}`);
for (const call of missingRoutes.slice(0, 25)) {
  console.log(`  ${call.method} ${call.path}`);
  console.log(`    ${call.file}:${call.line}`);
}

console.log(`\nРозбіжностей методу: ${methodMismatches.length}`);
for (const mismatch of methodMismatches) {
  console.log(`  ${mismatch.expectedMethod} ${normalizeRoutePath(mismatch.call.path)}`);
  console.log(`    Фронт: ${mismatch.expectedMethod}, Сервер: ${mismatch.actualMethods.join(", ")}`);
  console.log(`    ${mismatch.call.file}:${mismatch.call.line}`);
}

console.log("\n=== НЕРОЗІБРАНІ ВИКЛИКИ (можуть приховувати розходження) ===");
for (const unresolved of clientUsage.unresolved.slice(0, 15)) {
  console.log(`  ${unresolved.file}:${unresolved.line}`);
  console.log(`    ${unresolved.raw}`);
}
