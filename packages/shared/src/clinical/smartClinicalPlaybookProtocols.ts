/**
 * packages/shared/src/clinical/smartClinicalPlaybookProtocols.ts
 *
 * Form 043/u A4 Clinical Playbook Protocol Formatter.
 * Mandate 8d item 7: Strictly 0 cartoon emojis in regulatory medical/financial documents.
 * Mandate 8e: Doctor autonomy, somatic/allergy warnings, 0-click chairside guidance.
 */

import type {
	CancellationGapRecovery,
	DoctorMorningBriefing,
	PreAppointmentSummary,
} from "./smartClinicalPlaybooksEngine.js";

export type PlaybookA4ProtocolInput =
	| { type: "morning_briefing"; data: DoctorMorningBriefing; organizationName?: string }
	| { type: "pre_appointment"; data: PreAppointmentSummary; organizationName?: string }
	| { type: "cancellation_gap"; data: CancellationGapRecovery; organizationName?: string };

/**
 * Formats regulatory Form 043/u A4 Clinical Playbook Protocol.
 * STRICTLY 0 EMOJIS per Mandate 8d item 7.
 */
export function formatPlaybookForm043A4Protocol(
	input: DoctorMorningBriefing | PreAppointmentSummary | CancellationGapRecovery | PlaybookA4ProtocolInput,
	options?: { organizationName?: string | undefined },
): string {
	const org = options?.organizationName ?? "ООО «ДЕНТЕ» СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА";
	const divider = "=".repeat(78);
	const subDivider = "-".repeat(78);

	// Normalize input to determine type
	let type: "morning_briefing" | "pre_appointment" | "cancellation_gap" = "morning_briefing";
	let data: unknown = input;

	if ("type" in input && typeof input.type === "string" && "data" in input) {
		type = input.type as typeof type;
		data = input.data;
	} else if ("doctorId" in input && "appointments" in input) {
		type = "morning_briefing";
		data = input;
	} else if ("patient" in input && "financialSummary" in input) {
		type = "pre_appointment";
		data = input;
	} else if ("slot" in input && "candidates" in input) {
		type = "cancellation_gap";
		data = input;
	}

	// 1. Morning Briefing Protocol
	if (type === "morning_briefing") {
		const b = data as DoctorMorningBriefing;
		const lines: string[] = [];
		lines.push(divider);
		lines.push("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ");
		lines.push("МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ: ФОРМА N 043/У (АМБУЛАТОРНЫЙ СТОМАТОЛОГИЧЕСКИЙ ПРИЕМ)");
		lines.push("КЛИНИЧЕСКИЙ РЕГЛАМЕНТ / SMART PLAYBOOK: УТРЕННИЙ БРИФИНГ ВРАЧА");
		lines.push(divider);
		lines.push(`Организация: ${org}`);
		lines.push(`Дата смены: ${b.date} | Врач: ${b.doctorFullName} (Табельный номер: ${b.doctorId})`);
		lines.push(`Запланировано приемов: ${b.appointmentsCount}`);
		lines.push(subDivider);

		lines.push("1. ГРАФИК ПРИЕМОВ НА ТЕКУЩУЮ СМЕНУ:");
		if (b.appointments.length === 0) {
			lines.push("   (На текущую дату приемы не запланированы)");
		} else {
			for (const app of b.appointments) {
				const visitStatus = app.isFirstVisit ? "[Первичный]" : "[Повторный]";
				const alertTag = app.criticalAllergies.length > 0 || app.somaticRiskFactors.length > 0 ? " [!] СТОП-ФАКТОР" : "";
				lines.push(`   ${app.time} | Кресло: ${app.chairName} | ${app.patientFullName} ${visitStatus}${alertTag}`);
				lines.push(`     Причина визита: ${app.reason} (${app.durationMinutes} мин)`);
				if (app.criticalAllergies.length > 0) {
					lines.push(`     Критические аллергии: ${app.criticalAllergies.join(", ")}`);
				}
				if (app.somaticRiskFactors.length > 0) {
					lines.push(`     Соматические риски: ${app.somaticRiskFactors.join(", ")}`);
				}
			}
		}
		lines.push(subDivider);

		lines.push("2. КРИТИЧЕСКИЕ АЛЛЕРГИИ И СОМАТИЧЕСКИЕ СТОП-ФАКТОРЫ (МАНДАТ 8E):");
		if (b.criticalAlerts.length === 0) {
			lines.push("   [OK] Стоп-факторы отсутствуют. Физиологическая норма активна по умолчанию в 1 клик.");
		} else {
			for (const alert of b.criticalAlerts) {
				lines.push(`   [!] ПАЦИЕНТ: ${alert.patientFullName} (${alert.appointmentTime}, ${alert.chairName})`);
				lines.push(`       ${alert.description}`);
				lines.push(`       Действие: ${alert.actionRequiredRu}`);
			}
		}
		lines.push(subDivider);

		lines.push(`3. ПРОСРОЧЕННЫЕ ДИСПАНСЕРНЫЕ ВЫЗОВЫ (OVERDUE RECALLS: ${b.overdueRecallsCount}):`);
		if (b.overdueRecalls.length === 0) {
			lines.push("   [OK] Просроченные диспансерные вызовы отсутствуют.");
		} else {
			for (const recall of b.overdueRecalls.slice(0, 5)) {
				lines.push(
					`   - ${recall.patientFullName} (тел: ${recall.patientPhone ?? "нет"}): просрочка ${recall.overdueDays} дн. (срок: ${recall.dueDate})`,
				);
				lines.push(`     Действие: ${recall.recommendedAction}`);
			}
		}
		lines.push(subDivider);

		lines.push(
			`4. НЕОТВЕЧЕННЫЕ СМЕТЫ И ПЛАНЫ ЛЕЧЕНИЯ (СМЕТ: ${b.unansweredBudgetsCount} НА СУММУ ${b.totalPendingBudgetsRub}):`,
		);
		if (b.unansweredBudgets.length === 0) {
			lines.push("   [OK] Все планы лечения согласованы либо обработаны.");
		} else {
			for (const budget of b.unansweredBudgets.slice(0, 5)) {
				lines.push(
					`   - ${budget.patientFullName}: «${budget.title}» — ${budget.totalRub} (ожидание: ${budget.pendingDays} дн., этапов: ${budget.stageCount})`,
				);
			}
		}
		lines.push(subDivider);

		lines.push("5. КЛИНИЧЕСКОЕ РЕЗЮМЕ ДНЯ ДЛЯ ВРАЧА У КРЕСЛА (0-КЛИК):");
		lines.push(`   ${b.summaryChairsideNote}`);
		lines.push(subDivider);
		lines.push("Подпись врача-стоматолога: ____________________ / " + b.doctorFullName + " /");
		lines.push(divider);

		return lines.join("\n");
	}

	// 2. Pre-Appointment Summary Protocol
	if (type === "pre_appointment") {
		const p = data as PreAppointmentSummary;
		const lines: string[] = [];
		lines.push(divider);
		lines.push("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ");
		lines.push("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО (ФОРМА N 043/У)");
		lines.push("КЛИНИЧЕСКИЙ РЕГЛАМЕНТ / SMART PLAYBOOK: ПОДГОТОВКА К ПРИЕМУ ПАЦИЕНТА");
		lines.push(divider);
		lines.push(`Организация: ${org}`);
		lines.push(
			`Пациент: ${p.patient.fullName} | Карта 043/у: ${p.patient.cardRecordNumber ?? "б/н"} | Дата рождения: ${p.patient.birthDate ?? "не указана"}`,
		);
		lines.push(`Телефон: ${p.patient.phone ?? "не указан"} | Статус: ${p.isFirstVisit ? "ПЕРВИЧНЫЙ" : "ПОВТОРНЫЙ"}`);
		lines.push(subDivider);

		lines.push("1. СОМАТИЧЕСКИЙ АНАМНЕЗ И КРИТИЧЕСКИЕ АЛЛЕРГИИ (МАНДАТ 8E):");
		if (!p.hasCriticalAlerts) {
			lines.push("   [OK] Соматически здоров / физиологическая норма активна в 1 клик.");
		} else {
			for (const alert of p.criticalAlerts) {
				lines.push(`   [!] КРИТИЧЕСКИЙ СТОП-ФАКТОР: ${alert}`);
			}
		}
		lines.push(subDivider);

		lines.push("2. ПРЕДЫДУЩИЙ ВИЗИТ И ОКАЗАННЫЕ УСЛУГИ:");
		if (!p.lastVisit) {
			lines.push("   (Предыдущие визиты отсутствуют — пациент обратился впервые)");
		} else {
			lines.push(`   Дата: ${p.lastVisit.visitDate} | Врач: ${p.lastVisit.doctorName}`);
			if (p.lastVisit.diagnosis) {
				lines.push(`   Диагноз: ${p.lastVisit.diagnosis}`);
			}
			if (p.lastVisit.completedServices.length > 0) {
				lines.push("   Выполненные манипуляции:");
				for (const s of p.lastVisit.completedServices) {
					const tooth = s.toothNumber ? ` [Зуб ${s.toothNumber}]` : "";
					const code = s.code804n ? ` (${s.code804n})` : "";
					lines.push(`     - ${s.name}${tooth}${code}`);
				}
			}
		}
		lines.push(subDivider);

		lines.push("3. СОГЛАСОВАННЫЕ ЭТАПЫ СМЕТЫ И ПЛАНА ЛЕЧЕНИЯ:");
		if (p.agreedBudgetStages.length === 0) {
			lines.push("   (Активных согласованных этапов сметы нет)");
		} else {
			for (const stage of p.agreedBudgetStages) {
				lines.push(`   - Этап N${stage.stageNumber}: «${stage.title}» — ${stage.totalPriceRub} [${stage.status}]`);
			}
		}
		lines.push(subDivider);

		lines.push("4. ФИНАНСОВЫЙ СТАТУС ПАЦИЕНТА (БЕЗ ПАЛОК В КОЛЕСА):");
		lines.push(`   Статус: ${p.financialSummary.financialStatusRu}`);
		lines.push(subDivider);

		lines.push("5. КЛИНИЧЕСКАЯ ПОДСКАЗКА ДЛЯ ВРАЧА У КРЕСЛА (0-КЛИК CHAIRSIDE GUIDANCE):");
		lines.push(`   ${p.chairsideTip}`);
		lines.push(subDivider);
		lines.push("Подпись врача-стоматолога: ____________________ /                         /");
		lines.push(divider);

		return lines.join("\n");
	}

	// 3. Cancellation Gap Recovery Protocol
	const g = data as CancellationGapRecovery;
	const lines: string[] = [];
	lines.push(divider);
	lines.push("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ");
	lines.push("КЛИНИЧЕСКИЙ РЕГЛАМЕНТ / SMART PLAYBOOK: ЗАПОЛНЕНИЕ ОКНА ПРИ ОТМЕНЕ ЗАПИСИ");
	lines.push(divider);
	lines.push(`Организация: ${org}`);
	lines.push(
		`Слот отмены: ${g.slot.startTime} (длительность: ${g.slot.durationMinutes} мин) | Кресло: ${g.slot.chairName}`,
	);
	if (g.slot.doctorName) {
		lines.push(`Врач: ${g.slot.doctorName}`);
	}
	if (g.slot.cancelledPatientName) {
		lines.push(`Отменивший пациент: ${g.slot.cancelledPatientName}`);
	}
	lines.push(subDivider);

	lines.push(`РЕКОМЕНДОВАННЫЕ КАНДИДАТЫ НА СЛОТ (НАЙДЕНО: ${g.totalCandidatesFound}):`);
	if (g.candidates.length === 0) {
		lines.push("   (Кандидаты для заполнения окна не найдены)");
	} else {
		for (let i = 0; i < g.candidates.length; i++) {
			const c = g.candidates[i];
			if (!c) continue;
			lines.push(`   ${i + 1}. ${c.patientFullName} | Тел: ${c.patientPhone ?? ""}`);
			lines.push(`      Диагноз/Процедура: ${c.recommendedProcedure}${c.toothNumber ? ` (Зуб ${c.toothNumber})` : ""}`);
			lines.push(
				`      Скоринг: ${c.matchScore}/100 [Приоритет: ${c.scoreBreakdown.priorityScore}, Срочность: ${c.scoreBreakdown.pathologyUrgencyScore}, Тайминг: ${c.scoreBreakdown.timingFitScore}, Просрочка: ${c.scoreBreakdown.overdueDaysScore}]`,
			);
			lines.push(`      Обоснование: ${c.recommendationReason}`);
		}
	}
	lines.push(subDivider);
	lines.push(`ДЕЙСТВИЕ РЕГИСТРАТУРЫ: ${g.actionPromptRu}`);
	lines.push(divider);

	return lines.join("\n");
}
