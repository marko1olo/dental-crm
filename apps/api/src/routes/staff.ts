/**
 * staff.ts — Фасад маршрутов сотрудников клиники (Staff Routes Facade).
 *
 * Нормативы: 152-ФЗ, Приказ ФСТЭК № 21, Минздрав РФ, ФНС (ИНН), СФР/ЕГИСЗ (СНИЛС).
 * Архитектура: Fastify Plugin Facade (<= 80 строк) со строгим DAG графом подмодулей.
 */

import type { FastifyInstance } from "fastify";
import { registerStaffDomainRoutes } from "./staff/index.js";

export async function registerStaffRoutes(app: FastifyInstance): Promise<void> {
	await registerStaffDomainRoutes(app);
}

export * from "./staff/index.js";
