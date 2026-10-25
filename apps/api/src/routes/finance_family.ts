/**
 * finance_family.ts — Тонкий фасад финансовой подсистемы семьи и семейного кошелька.
 *
 * Архитектурно распилен по Мандату 8b (лимит строго <= 120 строк на модуль):
 * - family/familyFinanceTypes.ts: Zod-контракты и ошибки
 * - family/familyBalanceService.ts: выборка данных и балансов
 * - family/familyGroupReadRoutes.ts: поиск и чтение групп
 * - family/familyGroupWriteRoutes.ts: транзакционное создание и редактирование
 * - family/familyWalletRoutes.ts: списание и история операций
 * - family/familyWalletOperationsRoutes.ts: пополнение и возврат
 * - family/fiscalReceiptRoutes.ts: фискализация и проверка чеков
 */

import type { FastifyInstance } from "fastify";
import { registerFamilyGroupReadRoutes } from "./family/familyGroupReadRoutes.js";
import { registerFamilyGroupWriteRoutes } from "./family/familyGroupWriteRoutes.js";
import { registerFamilyWalletRoutes } from "./family/familyWalletRoutes.js";
import { registerFamilyWalletOperationsRoutes } from "./family/familyWalletOperationsRoutes.js";
import { registerFamilyFiscalReceiptRoutes } from "./family/fiscalReceiptRoutes.js";

export {
	familyPaymentSchema,
	familyRefundSchema,
	familyTopupSchema,
	createFamilyGroupSchema,
	updateFamilyGroupSchema,
	FamilyFinanceError,
} from "./family/familyFinanceTypes.js";

export {
	familyGroupForOrganization,
	familyMembersForOrganization,
	getFamilyHistoryRecords,
} from "./family/familyBalanceService.js";

export async function registerFamilyFinanceRoutes(app: FastifyInstance) {
	registerFamilyGroupReadRoutes(app);
	registerFamilyGroupWriteRoutes(app);
	registerFamilyWalletRoutes(app);
	registerFamilyWalletOperationsRoutes(app);
	registerFamilyFiscalReceiptRoutes(app);
}

export default registerFamilyFinanceRoutes;
