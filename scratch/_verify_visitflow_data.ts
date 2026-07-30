// ЗАМЕР: что TypeScript реально делает с visitFlowStepResultSchema.data.
// Скрипт-разведчик, удаляется поимённо после прогона. Ничего не правит.
import type { VisitFlowResult, VisitFlowStepResult } from "@dental/shared";

declare const step: VisitFlowStepResult;
declare const flow: VisitFlowResult;

// ЗАМЕР 1: точный текст типа поля data (ошибка присваивания печатает тип).
export const probeExactType: { __PRINT_ME__: 1 } = step.data;

// ЗАМЕР 2: сужает ли data?.x до {} или остаётся unknown.
export const probeOptionalChain = step.data?.diagnosisSummary;

// ЗАМЕР 3: то же на реальном пути потребителя из useVisitLogic.ts:1091-1102.
export const probeDraftRead = flow.draft.data.quality?.detectedToothCodes;

// ЗАМЕР 4: путь потребителя из VisitFlowProgress.tsx:101 без приведения.
export const probePlanRead = (flow.plan.data ?? null)?.diagnosisSummary;

// ЗАМЕР 5: обязательно ли приведение, чтобы то же чтение прошло.
export const probeWithCast = (flow.plan.data as { diagnosisSummary?: string } | null)
  ?.diagnosisSummary;

// ЗАМЕР 6: приведение к полю, которого в данных НЕТ — ловит ли это компилятор.
export const probeBogusField = (flow.plan.data as { totalPriceRub: number }).totalPriceRub;
