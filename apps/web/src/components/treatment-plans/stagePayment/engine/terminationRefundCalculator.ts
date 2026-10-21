import { formatKopecksRu } from "@dental/shared";
import type { MilestoneStage, TerminationExpenseItem, TerminationRefundCalculation } from "./types";

/**
 * Расчет суммы возврата при досрочном расторжении договора (ст. 32 Закона РФ № 2300-1 и ст. 709 ГК РФ)
 * Возврат аванса за вычетом фактически понесенных клиникой расходов (Lab/BOM)
 */
export function calculateTerminationRefund(
	stages: readonly MilestoneStage[],
	actualCustomExpenses?: readonly TerminationExpenseItem[],
): TerminationRefundCalculation {
	let totalPaidByPatient = 0;
	let completedActsTotal = 0;
	let uncompletedAdvance = 0;
	let calculatedClinicExpenses = 0;
	const itemizedExpenses: TerminationExpenseItem[] = [];

	for (const stage of stages) {
		const advancePaid = Number(stage.advancePaidKopecks) || 0;
		const completionPaid = Number(stage.completionPaidKopecks) || 0;
		const stagePaid = advancePaid + completionPaid;
		totalPaidByPatient += stagePaid;

		if (stage.status === "act_completed" || stage.status === "fully_paid") {
			completedActsTotal += Number(stage.totalKopecks) || 0;
		} else {
			uncompletedAdvance += stagePaid;

			if (stage.status !== "draft" || stagePaid > 0) {
				const labCost = Number(stage.directExpensesKopecks?.labKopecks) || 0;
				const materialsCost = Number(stage.directExpensesKopecks?.materialsKopecks) || 0;
				const otherCost = Number(stage.directExpensesKopecks?.otherKopecks) || 0;

				if (labCost > 0) {
					calculatedClinicExpenses += labCost;
					itemizedExpenses.push({
						title: `Лабораторные расходы CAD/CAM (Этап №${stage.stageNumber})`,
						category: "lab_cadcam",
						amountKopecks: labCost,
						justificationRu: `Оплата фрезерования и моделирования в зуботехнической лаборатории по наряду этапа №${stage.stageNumber}`,
					});
				}

				if (materialsCost > 0) {
					calculatedClinicExpenses += materialsCost;
					itemizedExpenses.push({
						title: `Расходные материалы и стерилизация (Этап №${stage.stageNumber})`,
						category: "sterilization_materials",
						amountKopecks: materialsCost,
						justificationRu: `Списание индивидуальных стерильных наборов и боров по этапу №${stage.stageNumber}`,
					});
				}

				if (otherCost > 0) {
					calculatedClinicExpenses += otherCost;
					itemizedExpenses.push({
						title: `Имплантологические компоненты и диагностика (Этап №${stage.stageNumber})`,
						category: "implant_hardware",
						amountKopecks: otherCost,
						justificationRu: `Закупка индивидуальных компонентов и хирургических шаблонов под этап №${stage.stageNumber}`,
					});
				}
			}
		}
	}

	if (actualCustomExpenses && actualCustomExpenses.length > 0) {
		for (const exp of actualCustomExpenses) {
			calculatedClinicExpenses += exp.amountKopecks;
			itemizedExpenses.push(exp);
		}
	}

	const clinicRetention = Math.min(uncompletedAdvance, calculatedClinicExpenses);
	const refundableToPatient = Math.max(0, uncompletedAdvance - clinicRetention);

	const legalRationaleRu = `В соответствии со ст. 32 Закона РФ от 07.02.1992 № 2300-1 "О защите прав потребителей" и ст. 709 ГК РФ Потребитель вправе отказаться от исполнения договора о выполнении работ в любое время при условии оплаты исполнителю фактически понесенных им расходов, связанных с исполнением обязательств по данному договору. Сумма ранее подписанных Актов выполненных работ (${formatKopecksRu(completedActsTotal)}) признана в полном объеме и возврату не подлежит. Из суммы внесенного аванса по незавершенным этапам (${formatKopecksRu(uncompletedAdvance)}) удержаны фактически понесенные клиникой затраты (${formatKopecksRu(clinicRetention)}). К возврату пациенту: ${formatKopecksRu(refundableToPatient)}.`;

	return {
		totalPaidByPatientKopecks: totalPaidByPatient,
		completedActsTotalKopecks: completedActsTotal,
		uncompletedAdvanceKopecks: uncompletedAdvance,
		actualClinicExpensesKopecks: calculatedClinicExpenses,
		itemizedExpenses,
		refundableToPatientKopecks: refundableToPatient,
		clinicRetentionKopecks: clinicRetention,
		legalRationaleRu,
	};
}
