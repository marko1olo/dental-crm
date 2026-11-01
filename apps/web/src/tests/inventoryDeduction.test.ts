/**
 * inventoryDeduction.test.ts — Сводный запуск тестов складского списания (Мандаты 8b, 8zi).
 * Декомпозирован на 3 модульных сьюта по 200-280 строк:
 * 1. inventoryBatchDeduction.test.ts — пакетное фоновое списание по техкартам в 1 клик.
 * 2. inventorySoftOverdraft.test.ts — устойчивость к отрицательным остаткам без блокировок врача.
 * 3. inventoryStornoAndAuditing.test.ts — ревизии, сторнирование и экспорт.
 */

import "./inventoryBatchDeduction.test.js";
import "./inventorySoftOverdraft.test.js";
import "./inventoryStornoAndAuditing.test.js";
