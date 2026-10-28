/**
 * operationalFallbackRouter.ts — Deterministic Operational & Scheduling Fallback Routing.
 *
 * Mandate 8n: Solo doctor & small clinic operational sovereignty —
 * appointments, rescheduling, cancellations, family deposits, revenue, 54-FZ cashier shifts, silent stock.
 */

import type { LLMStreamEvent } from "../../types.js";
import type { FallbackRouteContext } from "../types.js";
import {
	emitDone,
	emitTextDelta,
	emitToolUse,
} from "./tokenStreamEmitter.js";

/**
 * Attempts to route operational & scheduling commands. Returns an async generator if matched, or null.
 */
export async function* tryRouteOperationalFallback(
	ctx: FallbackRouteContext,
): AsyncIterable<LLMStreamEvent> {
	const { userText, lower, contextPatientId } = ctx;

	// 1. Cancellation of Appointments (crm.cancel_appointment) — Destructive Gate
	if (
		lower.includes("отмени") ||
		lower.includes("отмена записи") ||
		lower.includes("снять запись") ||
		lower.includes("отмени визит")
	) {
		yield emitToolUse(
			"crm.cancel_appointment",
			{
				appointmentId: "app_pending_cancel",
				reason:
					userText.replace(/отмени|запись|визит|прием/gi, "").trim() ||
					"По просьбе пациента",
				cancelledBy: "patient",
			},
			"call_cancel_app",
		);
		yield emitDone("tool_use");
		return;
	}

	// 2. Rescheduling Appointments (crm.reschedule_appointment)
	if (
		lower.includes("перенеси") ||
		lower.includes("перенести запись") ||
		lower.includes("перенос приема")
	) {
		const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
		nextDay.setHours(14, 0, 0, 0);
		yield emitToolUse(
			"crm.reschedule_appointment",
			{
				appointmentId: "app_pending_reschedule",
				newStartsAt: nextDay.toISOString(),
				reason: userText,
			},
			"call_resched_app",
		);
		yield emitDone("tool_use");
		return;
	}

	// 3. Booking Appointment (crm.book_appointment)
	if (
		lower.includes("запиши") ||
		lower.includes("записать") ||
		lower.includes("создай запись") ||
		lower.includes("назначь прием")
	) {
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
		tomorrow.setHours(10, 0, 0, 0);
		yield emitToolUse(
			"crm.book_appointment",
			{
				patientId: contextPatientId,
				doctorUserId: "00000000-0000-7000-8000-000000000002",
				startsAt: tomorrow.toISOString(),
				durationMinutes: 45,
				reason: "Плановое лечение кариеса",
			},
			"call_book_app",
		);
		yield emitDone("tool_use");
		return;
	}

	// 4. Patient Family Deposit & Debt (Mandate 8ab)
	if (
		lower.includes("долг по счету") ||
		lower.includes("есть ли долг") ||
		lower.includes("семейном депозите") ||
		lower.includes("семейный депозит") ||
		lower.includes("задолженность по счетам")
	) {
		yield emitToolUse(
			"crm.get_patient_family_deposit_and_debt",
			{ patientId: contextPatientId },
			"call_family_deposit_debt",
		);
		yield emitDone("tool_use");
		return;
	}

	// 5. Patient Balance & Family Accounts (clinical.get_family_balance)
	if (
		lower.includes("баланс") ||
		lower.includes("депозит") ||
		lower.includes("долг") ||
		lower.includes("задолженност") ||
		lower.includes("остаток на счете")
	) {
		yield emitToolUse(
			"clinical.get_family_balance",
			{ patientId: contextPatientId },
			"call_balance",
		);
		yield emitDone("tool_use");
		return;
	}

	// 6. Patient Summary & Passport Brief (crm.get_patient_summary)
	if (
		lower.includes("сводка") ||
		lower.includes("анамнез") ||
		lower.includes("карточк") ||
		lower.includes("дайджест")
	) {
		yield emitToolUse(
			"crm.get_patient_summary",
			{ patientId: contextPatientId },
			"call_summary",
		);
		yield emitDone("tool_use");
		return;
	}

	// 7. Patient Registration (crm.create_patient)
	if (
		lower.includes("создай пациента") ||
		lower.includes("новый пациент") ||
		lower.includes("зарегистрируй пациента")
	) {
		const nameMatch = userText
			.replace(/создай пациента|новый пациент|зарегистрируй пациента|пациент/gi, "")
			.trim();
		yield emitToolUse(
			"crm.create_patient",
			{
				fullName: nameMatch || "Смирнов Алексей Владимирович",
				phone: "+7 (999) 765-43-21",
				birthDate: "1992-04-12",
			},
			"call_create_patient",
		);
		yield emitDone("tool_use");
		return;
	}

	// 8. Patient Search (clinical.find_patient)
	if (
		lower.includes("пациент") ||
		lower.includes("найди") ||
		lower.includes("поиск") ||
		lower.includes("больной")
	) {
		const query =
			userText.replace(/найди|пациента|пациент|поиск|карту/gi, "").trim() ||
			"Иванов";
		yield emitToolUse(
			"clinical.find_patient",
			{ query },
			"call_patient",
		);
		yield emitDone("tool_use");
		return;
	}

	// 9. Doctor Piece-Rate & Revenue Intelligence (crm.get_clinic_or_doctor_revenue)
	if (
		lower.includes("выручк") ||
		lower.includes("заработ") ||
		lower.includes("сколько начислено") ||
		lower.includes("сдельщин") ||
		lower.includes("средний чек") ||
		lower.includes("выставлено счетов") ||
		lower.includes("сколько счетов")
	) {
		const period = lower.includes("вчера")
			? "yesterday"
			: lower.includes("недел")
				? "this_week"
				: lower.includes("месяц")
					? "this_month"
					: "today";

		yield emitToolUse(
			"crm.get_clinic_or_doctor_revenue",
			{ period },
			"call_revenue",
		);
		yield emitDone("tool_use");
		return;
	}

	// 10. Cashier Shift & 54-FZ (crm.check_cashier_shift)
	if (
		lower.includes("54-фз") ||
		lower.includes("ккт") ||
		(lower.includes("касс") &&
			(lower.includes("смен") ||
				lower.includes("открыт") ||
				lower.includes("закрыт") ||
				lower.includes("z-отчет") ||
				lower.includes("24")))
	) {
		yield emitToolUse(
			"crm.check_cashier_shift",
			{},
			"call_shift",
		);
		yield emitDone("tool_use");
		return;
	}

	// 11. Doctor Shifts & Chair Occupancy (crm.get_doctor_shifts_and_chairs)
	if (
		lower.includes("какая смена") ||
		lower.includes("какая у меня смена") ||
		lower.includes("в каком я кресле") ||
		lower.includes("каком кресле") ||
		lower.includes("часов отработано") ||
		lower.includes("отработанных часов") ||
		lower.includes("график смен") ||
		(lower.includes("смен") &&
			(lower.includes("четверг") ||
				lower.includes("пятниц") ||
				lower.includes("понедельник") ||
				lower.includes("вторник") ||
				lower.includes("сред") ||
				lower.includes("суббот") ||
				lower.includes("недел")))
	) {
		const targetDay = lower.includes("четверг")
			? "четверг"
			: lower.includes("пятниц")
				? "пятница"
				: lower.includes("понедельник")
					? "понедельник"
					: lower.includes("вторник")
						? "вторник"
						: lower.includes("сред")
							? "среда"
							: lower.includes("суббот")
								? "суббота"
								: lower.includes("недел")
									? "this_week"
									: "сегодня";

		yield emitToolUse(
			"crm.get_doctor_shifts_and_chairs",
			{ targetDateOrDay: targetDay },
			"call_shifts_chairs",
		);
		yield emitDone("tool_use");
		return;
	}

	// 12. Operational Schedule Intelligence (crm.get_daily_schedule_intelligence)
	if (
		lower.includes("после обеда") ||
		lower.includes("свободные окна") ||
		lower.includes("окна на") ||
		(lower.includes("свободн") && lower.includes("окн")) ||
		lower.includes("расписание на завтра")
	) {
		const isTomorrow = lower.includes("завтра");
		const targetDate = isTomorrow
			? new Date(Date.now() + 86400000).toISOString().slice(0, 10)
			: new Date().toISOString().slice(0, 10);
		const timeWindowFilter = lower.includes("после обеда")
			? "afternoon"
			: "all";
		const minGap =
			lower.includes("1.5") || lower.includes("полтора") ? 90 : 60;

		yield emitToolUse(
			"crm.get_daily_schedule_intelligence",
			{
				dateIso: targetDate,
				timeWindowFilter,
				minGapMinutes: minGap,
			},
			"call_schedule_intel",
		);
		yield emitDone("tool_use");
		return;
	}

	// 13. Discounts
	if (lower.includes("скидк") || lower.includes("дисконт")) {
		const percentMatch = userText.match(/(\d+)\s*%/);
		const discountPercent = percentMatch ? Number(percentMatch[1]) : 15;
		yield emitToolUse(
			"crm.apply_discount",
			{
				planId: "plan_sample_01",
				discountPercent,
				reason: "Врачебная скидка",
			},
			"call_discount",
		);
		yield emitDone("tool_use");
		return;
	}

	// 14. Invoices and receipts
	if (
		lower.includes("счет") ||
		lower.includes("чек") ||
		lower.includes("инвойс") ||
		lower.includes("оплат")
	) {
		yield emitToolUse(
			"crm.create_invoice",
			{
				patientId: contextPatientId,
				items: [
					{
						title: "Терапевтическое лечение кариеса",
						priceRub: 4500,
						quantity: 1,
						serviceCode: "A16.07.002",
					},
					{
						title: "Анестезия инфильтрационная",
						priceRub: 950,
						quantity: 1,
						serviceCode: "A16.07.030",
					},
				],
			},
			"call_invoice",
		);
		yield emitDone("tool_use");
		return;
	}

	// 15. Doctor Schedule & Today's Patients (clinical.get_doctor_schedule)
	if (
		lower.includes("расписание") ||
		lower.includes("график") ||
		lower.includes("окна") ||
		lower.includes("слот") ||
		lower.includes("прием") ||
		lower.includes("пациенты сегодня") ||
		lower.includes("пациентов сегодня") ||
		lower.includes("кто следующий") ||
		lower.includes("кто записан")
	) {
		const now = new Date();
		const isTomorrow = lower.includes("завтра");
		const targetDate = isTomorrow ? new Date(now.getTime() + 86400000) : now;
		const startOfDay = new Date(
			targetDate.getFullYear(),
			targetDate.getMonth(),
			targetDate.getDate(),
			0,
			0,
			0,
		).toISOString();
		const endOfDay = new Date(
			targetDate.getFullYear(),
			targetDate.getMonth(),
			targetDate.getDate(),
			23,
			59,
			59,
		).toISOString();

		yield emitToolUse(
			"clinical.get_doctor_schedule",
			{
				doctorUserId: "00000000-0000-7000-8000-000000000002",
				dateFrom: startOfDay,
				dateTo: endOfDay,
			},
			"call_schedule",
		);
		yield emitDone("tool_use");
		return;
	}

	// 16. Warehouse Inventory Invariant (Mandate 8aa)
	if (
		lower.includes("склад") ||
		lower.includes("остатки материалов") ||
		/(?:^|\s)(?:списание|списать)\b/i.test(lower)
	) {
		yield emitTextDelta(
			"Списание расходных материалов выполняется автоматически в фоновом режиме на основе протоколов лечения без отвлечения внимания врача от приёма.",
		);
		yield emitDone("stop");
		return;
	}
}
