/**
 * loginRoutes.ts (Layer 5 Facade)
 *
 * Тонкий фасад маршрутизации аутентификации клиники, сотрудников и универсального входа.
 * Архитектура декомпозирована в соответствии со стандартом /decomposer:
 * - Layer 0: loginValidationSchemas.ts (Zod-схемы валидации тел запросов)
 * - Layer 1: loginRateLimiter.ts (Защита от брутфорса PIN-кодов: 5 попыток / 5 минут)
 * - Layer 2: staffPinAuthHandlers.ts (Разблокировка PIN-кодом, смена роли врача у кресла)
 * - Layer 3: clinicLoginHandlers.ts (Вход в кабинет клиники, демо-сидер)
 * - Layer 4: universalLoginHandlers.ts (Универсальный SaaS-вход по email/phone/UUID/code)
 */

import type { FastifyInstance } from "fastify";
import {
	handleClinicLogin,
	handleDemoSeed,
} from "./loginModules/clinicLoginHandlers.js";
import {
	handleStaffSwitchRole,
	handleStaffUnlock,
} from "./loginModules/staffPinAuthHandlers.js";
import { handleUniversalLogin } from "./loginModules/universalLoginHandlers.js";

export {
	handleClinicLogin,
	handleDemoSeed,
	handleStaffSwitchRole,
	handleStaffUnlock,
	handleUniversalLogin,
};

export function registerLoginRoutes(app: FastifyInstance): void {
	// ─── Clinic Workspace Login ───────────────────────────────────────────────────
	app.post(
		"/api/auth/clinic/login",
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: "1 minute",
				},
			},
		},
		handleClinicLogin,
	);

	// ─── Staff PIN Unlock & Chairside Role Switch (МАНДАТ 8e: Doctor Autonomy) ────
	app.post("/api/auth/staff/unlock", handleStaffUnlock);
	app.post("/api/auth/staff/switch-role", handleStaffSwitchRole);

	// ─── SaaS Universal User Login (email / phone / clinic UUID / code) ───────────
	app.post("/api/auth/login", handleUniversalLogin);

	// ─── Demo Tenant Seeding / Reinitialization Endpoint ────────────────────────
	app.post("/api/auth/demo/seed", handleDemoSeed);
}
