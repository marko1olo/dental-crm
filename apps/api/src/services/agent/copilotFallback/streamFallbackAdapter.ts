/**
 * streamFallbackAdapter.ts — Layer 3: Stream Fallback Adapter for Local/Offline Copilot Execution.
 *
 * Routes doctor/staff natural language commands to CRM Universal Tools (Mandates 8l, 8e, 8n)
 * when external LLMs are unavailable or disabled without connection drops.
 */

import { SemanticRouter } from "../semanticRouter.js";
import type { LLMStreamEvent } from "../types.js";
import {
	tryResolveDirectComponentKnowledge,
	tryResolveKnowledgeInquiry,
} from "./knowledgeFallback.js";
import type { FallbackRouteContext } from "./types.js";

/**
 * Streams tool_use or text_delta events for natural language requests.
 */
export async function* routeCopilotFallback(
	ctx: FallbackRouteContext,
): AsyncIterable<LLMStreamEvent> {
	const { userText, lower, contextTooth, contextPatientId } = ctx;

	// 0. Fast Deterministic Semantic Router for Compound Doctor Prompts
	const decomposedPlan = SemanticRouter.decompose(userText, {
		currentTooth: contextTooth,
		patientId: contextPatientId,
	});

	if (
		decomposedPlan.hasClinical &&
		(decomposedPlan.hasFinance || decomposedPlan.hasBooking)
	) {
		const aggregated = SemanticRouter.dispatchAndAggregate(decomposedPlan, {
			currentTooth: contextTooth,
			patientId: contextPatientId,
		});

		yield {
			type: "text_delta",
			text: `${aggregated.unifiedResponseRu}\n\n`,
		};

		const clinicalTask = decomposedPlan.subtasks.find(
			(s) => s.intent === "clinical",
		);
		const tooth =
			(clinicalTask && "toothNumber" in clinicalTask
				? clinicalTask.toothNumber
				: undefined) || contextTooth;
		const diagnosis =
			clinicalTask && "diagnoses" in clinicalTask && clinicalTask.diagnoses?.[0]
				? clinicalTask.diagnoses[0]
				: "K02.1";

		yield {
			type: "tool_use",
			id: `call_plan_${Date.now()}`,
			name: "clinical.suggest_treatment_plan",
			input: {
				patientId: contextPatientId,
				tooth,
				primaryDiagnosis: diagnosis,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 0.5. CRM Component Knowledge & Clinical Guidance (Mandates 8l, 8e, 8n)
	// Answers how-to documentation questions ("Как оформить возврат?", "Где смотреть снимок КТ?", "Как применить скидку по гарантии?")
	const knowledgeAnswer = tryResolveKnowledgeInquiry(userText, lower);
	if (knowledgeAnswer) {
		yield {
			type: "text_delta",
			text: knowledgeAnswer,
		};
		yield { type: "done", stopReason: "stop" };
		return;
	}

	// 1. Odontogram & Teeth Status Updates (crm.update_teeth_chart / crm.get_teeth_chart)
	if (
		lower.includes("зубная формула") ||
		lower.includes("одонтограмм") ||
		lower.includes("карта зубов")
	) {
		yield {
			type: "tool_use",
			id: `call_teeth_chart_${Date.now()}`,
			name: "crm.get_teeth_chart",
			input: { patientId: contextPatientId },
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	const toothStatusMatch = userText.match(
		/(?:зуб[аеу]?|tooth)\s*#?\s*([1-48][1-8])\s*(?:-|—|:)?\s*(кариес|пульпит|периодонтит|пломба|коронка|удален|имплант|норма)/i,
	);
	if (toothStatusMatch) {
		const toothNum = Number(toothStatusMatch[1]);
		const statusText = toothStatusMatch[2];
		yield {
			type: "tool_use",
			id: `call_update_tooth_${Date.now()}`,
			name: "crm.update_teeth_chart",
			input: {
				patientId: contextPatientId,
				updates: [{ toothNumber: toothNum, status: statusText }],
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 2. Cancellation of Appointments (crm.cancel_appointment) — Destructive Gate
	if (
		lower.includes("отмени") ||
		lower.includes("отмена записи") ||
		lower.includes("снять запись") ||
		lower.includes("отмени визит")
	) {
		yield {
			type: "tool_use",
			id: `call_cancel_app_${Date.now()}`,
			name: "crm.cancel_appointment",
			input: {
				appointmentId: "app_pending_cancel",
				reason: userText.replace(/отмени|запись|визит|прием/gi, "").trim() || "По просьбе пациента",
				cancelledBy: "patient",
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 3. Rescheduling Appointments (crm.reschedule_appointment)
	if (
		lower.includes("перенеси") ||
		lower.includes("перенести запись") ||
		lower.includes("перенос приема")
	) {
		const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
		nextDay.setHours(14, 0, 0, 0);
		yield {
			type: "tool_use",
			id: `call_resched_app_${Date.now()}`,
			name: "crm.reschedule_appointment",
			input: {
				appointmentId: "app_pending_reschedule",
				newStartsAt: nextDay.toISOString(),
				reason: userText,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 4. Booking Appointment (crm.book_appointment)
	if (
		lower.includes("запиши") ||
		lower.includes("записать") ||
		lower.includes("создай запись") ||
		lower.includes("назначь прием")
	) {
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
		tomorrow.setHours(10, 0, 0, 0);
		yield {
			type: "tool_use",
			id: `call_book_app_${Date.now()}`,
			name: "crm.book_appointment",
			input: {
				patientId: contextPatientId,
				doctorUserId: "00000000-0000-7000-8000-000000000002",
				startsAt: tomorrow.toISOString(),
				durationMinutes: 45,
				reason: "Плановое лечение кариеса",
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 5. Patient Timeline & Visit History (clinical.get_patient_timeline)
	if (
		lower.includes("что делали") ||
		lower.includes("прошлый прием") ||
		lower.includes("прошлом приеме") ||
		lower.includes("история визитов") ||
		lower.includes("когда ставили") ||
		lower.includes("хронологи") ||
		lower.includes("прошлые жалобы")
	) {
		yield {
			type: "tool_use",
			id: `call_timeline_${Date.now()}`,
			name: "clinical.get_patient_timeline",
			input: { patientId: contextPatientId, limit: 10 },
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 5.4. Patient Family Deposit & Debt (Mandate 8ab: crm.get_patient_family_deposit_and_debt)
	if (
		lower.includes("долг по счету") ||
		lower.includes("есть ли долг") ||
		lower.includes("семейном депозите") ||
		lower.includes("семейный депозит") ||
		lower.includes("задолженность по счетам")
	) {
		yield {
			type: "tool_use",
			id: `call_family_deposit_debt_${Date.now()}`,
			name: "crm.get_patient_family_deposit_and_debt",
			input: {
				patientId: contextPatientId,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 5.5. Patient Balance & Family Accounts (clinical.get_family_balance)
	if (
		lower.includes("баланс") ||
		lower.includes("депозит") ||
		lower.includes("долг") ||
		lower.includes("задолженност") ||
		lower.includes("остаток на счете")
	) {
		yield {
			type: "tool_use",
			id: `call_balance_${Date.now()}`,
			name: "clinical.get_family_balance",
			input: { patientId: contextPatientId },
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 5.6. Patient Summary & Passport Brief (crm.get_patient_summary)
	if (
		lower.includes("сводка") ||
		lower.includes("анамнез") ||
		lower.includes("карточк") ||
		lower.includes("дайджест")
	) {
		yield {
			type: "tool_use",
			id: `call_summary_${Date.now()}`,
			name: "crm.get_patient_summary",
			input: { patientId: contextPatientId },
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 6. Patient Registration (crm.create_patient)
	if (
		lower.includes("создай пациента") ||
		lower.includes("новый пациент") ||
		lower.includes("зарегистрируй пациента")
	) {
		const nameMatch = userText.replace(/создай пациента|новый пациент|зарегистрируй пациента|пациент/gi, "").trim();
		yield {
			type: "tool_use",
			id: `call_create_patient_${Date.now()}`,
			name: "crm.create_patient",
			input: {
				fullName: nameMatch || "Смирнов Алексей Владимирович",
				phone: "+7 (999) 765-43-21",
				birthDate: "1992-04-12",
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 7. Patient Search (clinical.find_patient)
	if (
		lower.includes("пациент") ||
		lower.includes("найди") ||
		lower.includes("поиск") ||
		lower.includes("больной")
	) {
		const query =
			userText.replace(/найди|пациента|пациент|поиск|карту/gi, "").trim() ||
			"Иванов";
		yield {
			type: "tool_use",
			id: `call_patient_${Date.now()}`,
			name: "clinical.find_patient",
			input: { query },
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 8. Dental Lab Orders (crm.create_lab_order / crm.get_lab_order_status)
	if (
		lower.includes("зтл") ||
		lower.includes("лаборатор") ||
		lower.includes("наряд") ||
		lower.includes("техник") ||
		lower.includes("коронк") ||
		lower.includes("слепок")
	) {
		if (lower.includes("статус") || lower.includes("где") || lower.includes("готов")) {
			yield {
				type: "tool_use",
				id: `call_lab_status_${Date.now()}`,
				name: "crm.get_lab_order_status",
				input: { patientId: contextPatientId },
			};
		} else {
			const due = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
			yield {
				type: "tool_use",
				id: `call_lab_create_${Date.now()}`,
				name: "crm.create_lab_order",
				input: {
					patientId: contextPatientId,
					toothCodes: [contextTooth],
					workType: "Коронка из диоксида циркония",
					material: "Диоксид циркония ZrO2",
					vitaShade: "A2",
					dueDate: due,
				},
			};
		}
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 9. Doctor Piece-Rate & Revenue Intelligence (Mandate 8ab: crm.get_clinic_or_doctor_revenue)
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

		yield {
			type: "tool_use",
			id: `call_revenue_${Date.now()}`,
			name: "crm.get_clinic_or_doctor_revenue",
			input: {
				period,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 9.1. Cashier Shift & 54-FZ (crm.check_cashier_shift)
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
		yield {
			type: "tool_use",
			id: `call_shift_${Date.now()}`,
			name: "crm.check_cashier_shift",
			input: {},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 9.2. Patient Family Deposit & Debt (Mandate 8ab: crm.get_patient_family_deposit_and_debt)
	if (
		lower.includes("семейном депозите") ||
		lower.includes("семейный депозит") ||
		lower.includes("долг по счету") ||
		lower.includes("есть ли долг") ||
		lower.includes("задолженность по счетам")
	) {
		yield {
			type: "tool_use",
			id: `call_family_deposit_debt_${Date.now()}`,
			name: "crm.get_patient_family_deposit_and_debt",
			input: {
				patientId: contextPatientId,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 9.3. Doctor Shifts & Chair Occupancy (Mandate 8ab: crm.get_doctor_shifts_and_chairs)
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

		yield {
			type: "tool_use",
			id: `call_shifts_chairs_${Date.now()}`,
			name: "crm.get_doctor_shifts_and_chairs",
			input: {
				targetDateOrDay: targetDay,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 9.4. Operational Schedule Intelligence (Mandate 8ab: crm.get_daily_schedule_intelligence)
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

		yield {
			type: "tool_use",
			id: `call_schedule_intel_${Date.now()}`,
			name: "crm.get_daily_schedule_intelligence",
			input: {
				dateIso: targetDate,
				timeWindowFilter,
				minGapMinutes: minGap,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	if (lower.includes("скидк") || lower.includes("дисконт")) {
		const percentMatch = userText.match(/(\d+)\s*%/);
		const discountPercent = percentMatch ? Number(percentMatch[1]) : 15;
		yield {
			type: "tool_use",
			id: `call_discount_${Date.now()}`,
			name: "crm.apply_discount",
			input: {
				planId: "plan_sample_01",
				discountPercent,
				reason: "Врачебная скидка",
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	if (lower.includes("счет") || lower.includes("чек") || lower.includes("инвойс") || lower.includes("оплат")) {
		yield {
			type: "tool_use",
			id: `call_invoice_${Date.now()}`,
			name: "crm.create_invoice",
			input: {
				patientId: contextPatientId,
				items: [
					{ title: "Терапевтическое лечение кариеса", priceRub: 4500, quantity: 1, serviceCode: "A16.07.002" },
					{ title: "Анестезия инфильтрационная", priceRub: 950, quantity: 1, serviceCode: "A16.07.030" },
				],
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 10. Doctor Schedule & Today's Patients (clinical.get_doctor_schedule)
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
		const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0).toISOString();
		const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59).toISOString();
		yield {
			type: "tool_use",
			id: `call_schedule_${Date.now()}`,
			name: "clinical.get_doctor_schedule",
			input: {
				doctorUserId: "00000000-0000-7000-8000-000000000002",
				dateFrom: startOfDay,
				dateTo: endOfDay,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 10.5. Warehouse Inventory Invariant (Mandate 8aa)
	// Inventory deductions are executed as silent background scripts and must NOT pollute the doctor's chat
	if (
		lower.includes("склад") ||
		lower.includes("остатки материалов") ||
		/(?:^|\s)(?:списание|списать)\b/i.test(lower)
	) {
		yield {
			type: "text_delta",
			text: "Списание расходных материалов выполняется автоматически в фоновом режиме на основе протоколов лечения без отвлечения внимания врача от приёма.",
		};
		yield { type: "done", stopReason: "stop" };
		return;
	}

	// 11. Treatment Plan & 3-Tier Estimate
	if (
		lower.includes("план") ||
		lower.includes("смет") ||
		lower.includes("тариф") ||
		lower.includes("эконом") ||
		lower.includes("оптимум") ||
		lower.includes("премиум") ||
		lower.includes("лечени") ||
		lower.includes("кариес") ||
		lower.includes("пульпит") ||
		lower.includes("имплант")
	) {
		const diagnosis = lower.includes("пульпит")
			? "Pulpitis"
			: lower.includes("имплант")
				? "Implantation"
				: "Caries";
		yield {
			type: "tool_use",
			id: `call_plan_${Date.now()}`,
			name: "clinical.suggest_treatment_plan",
			input: {
				patientId: contextPatientId,
				tooth: contextTooth,
				primaryDiagnosis: diagnosis,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 12. Statutory Prescription Form 107-1/u & Recommendations
	if (
		lower.includes("рецепт") ||
		lower.includes("107") ||
		lower.includes("назнач") ||
		lower.includes("выпиши") ||
		lower.includes("лекарств")
	) {
		yield {
			type: "tool_use",
			id: `call_rx_${Date.now()}`,
			name: "crm.recommend_prescription",
			input: {
				diagnosisCode: "K04.0",
				complaint: userText,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 13. Drug-Drug Interaction & Allergy Safety Check
	if (
		lower.includes("взаимодейств") ||
		lower.includes("совместим") ||
		lower.includes("аллерг") ||
		lower.includes("ddi") ||
		lower.includes("противопоказ")
	) {
		yield {
			type: "tool_use",
			id: `call_ddi_${Date.now()}`,
			name: "crm.check_drug_interactions",
			input: {
				patientId: contextPatientId,
				plannedDrugs: ["Амоксициллин", "Ибупрофен"],
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 14. Clinical Diary (SOAP)
	if (
		lower.includes("дневник") ||
		lower.includes("осмотр") ||
		lower.includes("диктовка") ||
		lower.includes("жалоб") ||
		lower.includes("статус") ||
		lower.includes("043")
	) {
		yield {
			type: "tool_use",
			id: `call_notes_${Date.now()}`,
			name: "clinical_notes.parse_voice_dictation",
			input: { transcript: userText, specialty: "therapist" },
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 15. Price List / RAG Knowledge Search
	if (
		lower.includes("цена") ||
		lower.includes("стоимост") ||
		lower.includes("почем") ||
		lower.includes("прайс") ||
		lower.includes("сколько стоит") ||
		lower.includes("804н") ||
		lower.includes("гаранти") ||
		lower.includes("протокол")
	) {
		const category = lower.includes("гаранти")
			? "guarantee"
			: lower.includes("протокол")
				? "clinical_protocol"
				: "price_804n";
		yield {
			type: "tool_use",
			id: `call_rag_${Date.now()}`,
			name: "internal.search_knowledge_base",
			input: { query: userText, category, threshold: 0.75 },
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 15.3 Greeting / General Assistance
	if (
		lower.startsWith("привет") ||
		lower.startsWith("здравствуй") ||
		lower.includes("чем ты можешь помочь") ||
		lower.includes("что ты умеешь") ||
		lower.includes("помоги")
	) {
		const defaultResponse =
			"DENTE Ассистент готов помочь врачу у кресла:\n" +
			"• Поиск пациентов и просмотр медицинских карт\n" +
			"• Подбор услуг, сметы и формирование планов лечения\n" +
			"• Совместимость препаратов и лекарственная безопасность\n" +
			"• Заполнение зубной формулы и расписание приёмов\n" +
			"• Наряды в зуботехническую лабораторию и дневник приёма.\n\n" +
			"Назовите зуб, клиническую жалобу или действие.";

		for (const char of defaultResponse) {
			yield { type: "text_delta", text: char };
		}
		yield { type: "done", stopReason: "stop" };
		return;
	}

	// 15.5 Direct Knowledge Lookup for high-confidence component queries (score >= 100)
	const directAnswer = tryResolveDirectComponentKnowledge(userText);
	if (directAnswer) {
		yield {
			type: "text_delta",
			text: directAnswer,
		};
		yield { type: "done", stopReason: "stop" };
		return;
	}

	// Default Welcome Greeting
	const defaultResponse =
		"DENTE Ассистент готов помочь врачу у кресла:\n" +
		"• Поиск пациентов и просмотр медицинских карт\n" +
		"• Подбор услуг, сметы и формирование планов лечения\n" +
		"• Совместимость препаратов и лекарственная безопасность\n" +
		"• Заполнение зубной формулы и расписание приёмов\n" +
		"• Наряды в зуботехническую лабораторию и дневник приёма.\n\n" +
		"Назовите зуб, клиническую жалобу или действие.";

	for (const char of defaultResponse) {
		yield { type: "text_delta", text: char };
	}
	yield { type: "done", stopReason: "stop" };
}
