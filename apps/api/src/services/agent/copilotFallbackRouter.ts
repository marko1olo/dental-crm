/**
 * copilotFallbackRouter.ts — Deterministic Semantic Fallback Router for Local/Offline Copilot Execution.
 *
 * Routes doctor/staff natural language commands to CRM Universal Tools (Mandates 8l, 8e, 8n)
 * when external LLMs are unavailable or disabled:
 * 1. Patients: search_patients, create_patient, get_patient_summary
 * 2. Schedule: book_appointment, reschedule_appointment, cancel_appointment, get_doctor_schedule
 * 3. Teeth: update_teeth_chart, get_teeth_chart
 * 4. Treatment Plans: create_treatment_plan, add_treatment_stage, calculate_plan_cost
 * 5. Billing & 54-FZ: create_invoice, apply_discount, check_cashier_shift
 * 6. Pharmacology & Safety: check_drug_interactions, check_allergies, recommend_prescription
 * 7. Warehouse: check_stock_availability, log_material_usage
 * 8. Dental Lab: create_lab_order, get_lab_order_status
 */

import { SemanticRouter } from "./semanticRouter.js";
import type { LLMStreamEvent } from "./types.js";

export interface FallbackRouteContext {
	readonly userText: string;
	readonly lower: string;
	readonly contextTooth: number;
	readonly contextPatientId: string;
}

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

	// 5. Patient Summary & Passport Brief (crm.get_patient_summary)
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

	// 7. Patient Search (crm.search_patients / clinical.find_patient)
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
			name: "crm.search_patients",
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

	// 9. Billing, Invoices & Discounts (crm.create_invoice / crm.apply_discount / crm.check_cashier_shift)
	if (lower.includes("касс") || lower.includes("смена") || lower.includes("54-фз")) {
		yield {
			type: "tool_use",
			id: `call_shift_${Date.now()}`,
			name: "crm.check_cashier_shift",
			input: {},
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
				reason: "Врачебная скидка (Мандат 8e)",
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

	// 10. Warehouse Inventory & Material Deduction (crm.check_stock_availability / crm.log_material_usage)
	if (lower.includes("склад") || lower.includes("материал") || lower.includes("остат") || lower.includes("списани")) {
		if (lower.includes("списать") || lower.includes("расход")) {
			yield {
				type: "tool_use",
				id: `call_stock_log_${Date.now()}`,
				name: "crm.log_material_usage",
				input: {
					itemName: "Артикаин 4% 1.7 мл",
					quantity: 2,
					patientId: contextPatientId,
				},
			};
		} else {
			yield {
				type: "tool_use",
				id: `call_stock_check_${Date.now()}`,
				name: "crm.check_stock_availability",
				input: {
					itemNames: ["Артикаин", "Коффердам", "Filtek Ultimate"],
				},
			};
		}
		yield { type: "done", stopReason: "tool_use" };
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

	// 14. Doctor Schedule & Free Slots
	if (
		lower.includes("расписание") ||
		lower.includes("прием") ||
		lower.includes("окна") ||
		lower.includes("слот")
	) {
		const today = new Date().toISOString().slice(0, 10);
		yield {
			type: "tool_use",
			id: `call_schedule_${Date.now()}`,
			name: "crm.get_doctor_schedule",
			input: {
				doctorUserId: "00000000-0000-7000-8000-000000000002",
				date: today,
				days: 3,
			},
		};
		yield { type: "done", stopReason: "tool_use" };
		return;
	}

	// 15. Form 043/u Clinical Diary
	if (
		lower.includes("043") ||
		lower.includes("осмотр") ||
		lower.includes("дневник") ||
		lower.includes("диктовка") ||
		lower.includes("жалоб") ||
		lower.includes("статус")
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

	// 16. Price List / RAG Knowledge Search
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

	// Default Welcome Greeting
	const defaultResponse =
		"Готов к работе у кресла:\n" +
		"• Поиск пациентов и просмотр медицинских карт\n" +
		"• Расчет планов лечения (Эконом / Оптимум / Премиум) и выставление счетов\n" +
		"• Назначение рецептов и проверка совместимости лекарств (DDI)\n" +
		"• Заполнение зубной формулы и расписание приёма\n" +
		"• Списание материалов и наряды в зуботехническую лабораторию.\n\n" +
		"Назовите зуб, жалобы или действие.";

	for (const char of defaultResponse) {
		yield { type: "text_delta", text: char };
	}
	yield { type: "done", stopReason: "stop" };
}
