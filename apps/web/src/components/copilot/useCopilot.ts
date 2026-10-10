/**
 * @file useCopilot.ts
 * @description Canonical thin facade for Chairside Copilot hook.
 * Decomposed into modular DAG under ./useCopilotModules/ per Mandate 8b.
 */

export { useCopilot } from "./useCopilotModules";
export type * from "./useCopilotModules/types";
