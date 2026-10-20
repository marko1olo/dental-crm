/**
 * demoInteractiveSimulation.ts
 *
 * Master Facade: Интерактивный симулятор действий в демо-режиме (МАНДАТ 8n & МАНДАТ 8e).
 *
 * Архитектура декомпозиции (/decomposer):
 * - simulation/demoSimulationTypes.ts: Профили ролей, токены и системное хранилище (Layer 0)
 * - simulation/demoSimulationState.ts: In-memory состояние и проверка разрешений (Layer 1)
 * - simulation/demoClinicalActionsSimulation.ts: Мутации расписания, одонтограммы и смет (Layer 2)
 * - simulation/demoRoleSwitchSimulation.ts: Переключение ролей, изоляция и детализация (Layer 3)
 */

export { generateDemoDiplomaForBravery } from "./demoClinicalCases.js";

export type { DemoRoleProfile } from "./simulation/demoSimulationTypes.js";
export {
	DEMO_CLINICAL_ROLE_PROFILES,
	DENTE_LIVE_CLINIC_TOKEN_BACKUP_KEY,
	DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY,
	DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY,
	getSimulationStorage,
} from "./simulation/demoSimulationTypes.js";

export {
	DemoInteractiveState,
	_demoStateInstance,
	isSimulationAllowed,
} from "./simulation/demoSimulationState.js";

export {
	getLiveDemoAppointments,
	simulateDemoAppointmentStatusChange,
	getLiveDemoOdontogram,
	simulateDemoToothClick,
	simulateDemoAddServiceToEstimate,
	getLiveDemoEstimate,
} from "./simulation/demoClinicalActionsSimulation.js";

export {
	restoreLiveStaffSessionAfterDemo,
	switchDemoRole,
	getDemoRoleClinicalDetails,
} from "./simulation/demoRoleSwitchSimulation.js";
