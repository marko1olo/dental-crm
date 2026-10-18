import type { AccountsReceivableSummary, RawInvoiceItem } from "./financialEngineTypes";

/**
 * Расчет дебиторской задолженности клиники на основе реальных счетов (invoices).
 */
export function calculateAccountsReceivable(
	invoices: readonly RawInvoiceItem[],
	now: Date = new Date(),
): AccountsReceivableSummary {
	if (!invoices || invoices.length === 0) {
		return {
			totalDebtKopecks: 0,
			overdueDebtKopecks: 0,
			openInvoicesCount: 0,
			debtorPatientsCount: 0,
			averageDebtPerPatientKopecks: 0,
		};
	}

	let totalDebtKopecks = 0;
	let overdueDebtKopecks = 0;
	let openInvoicesCount = 0;
	const debtorPatients = new Set<string>();

	for (const inv of invoices) {
		if (inv.status === "cancelled" || inv.status === "draft") {
			continue;
		}

		const total = Math.max(0, Math.round(inv.totalAmountKopecks || 0));
		const paid = Math.max(0, Math.round(inv.paidAmountKopecks || 0));
		const debt = Math.max(0, total - paid);

		if (debt > 0) {
			totalDebtKopecks += debt;
			openInvoicesCount += 1;
			if (inv.patientId) {
				debtorPatients.add(inv.patientId);
			}

			if (inv.dueDate) {
				const due = typeof inv.dueDate === "string" ? new Date(inv.dueDate) : inv.dueDate;
				if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) {
					overdueDebtKopecks += debt;
				}
			}
		}
	}

	const debtorPatientsCount = debtorPatients.size;
	const averageDebtPerPatientKopecks =
		debtorPatientsCount > 0 ? Math.round(totalDebtKopecks / debtorPatientsCount) : 0;

	return {
		totalDebtKopecks,
		overdueDebtKopecks,
		openInvoicesCount,
		debtorPatientsCount,
		averageDebtPerPatientKopecks,
	};
}
