START: инвертирую предикат обхода гейта в apps/api/src/accessGuard.ts — пустое NODE_ENV перестаёт быть разрешающим.
DONE: f97acbe3d — обход требует названного режима (development/test) плюс флага; тест в src/tests/accessGuard.test.ts, 25/25 pass (node --import tsx --test), exit 0.
