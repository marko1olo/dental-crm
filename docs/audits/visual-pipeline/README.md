# 🔬 Visual Audit Pipeline — Документальная память и реестры

> Эта папка хранит **персистентную память всех раундов** визуального аудита (в отличие от тяжёлых сырых PNG, которые складываются в `artifacts/visual-audit/` под `.gitignore`).

## Состояние

🟡 **Ожидает первого боевого запуска (Раунд 1).**

Когда придёт время запуска, здесь появятся:
- `DEFECT_LEDGER.json` — единый сквозной реестр всех обнаруженных дефектов (`VAP-R1-XXXX`) с историей статусов (`OPEN → FIXED → VERIFIED / REOPENED`).
- `ROUND_{N}_MASTER_REGISTRY.md` — полный свод дефектов по 9 осям и доменам.
- `ROUND_{N}_VERIFICATION_DIFF.md` — автоматический diff метрик DOM X-Ray ДО и ПОСЛЕ.
- `batches/round_{N}/FOUNDATION_batch.md` и `{domain}_batch.md` — готовые детальные пакеты задач для фиксеров.

Полная документация и скрипты: [`.agents/skills/visual-audit-pipeline/SKILL.md`](../../../.agents/skills/visual-audit-pipeline/SKILL.md).
