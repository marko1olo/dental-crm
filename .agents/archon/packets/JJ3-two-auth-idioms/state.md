started 2026-07-29T03:04:36Z: inventory of auth idioms across apps/api/src/routes, edit scope patients.ts only
committed 072cff4a5 2026-07-29T03:13:29Z: 15 обработчиков patients.ts сведены на requireClinicOrganizationId; гейт smoke-clinical-mutation-guard.mjs НЕ прогнан — падает до проверки на устаревшей сборке dist (44 файла новее, 7 без выхода сборки), нужен npm run build -w @dental/api от ведущего
committed da00ca5fd 2026-07-29T03:15:01Z: страж 8 маршрутов рекламаций/задач (4 утверждения, node --import tsx --test, exit 0)
