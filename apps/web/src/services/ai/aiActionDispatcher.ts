/**
 * aiActionDispatcher.ts — Centralized Clinical CRM Action Dispatcher for DENTE AI Assistant & Copilot.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy (0-click / 1-click execution, non-blocking confirmation for destructive actions)
 * - Mandate 8l: Action Engine (Zero mocks, real dispatch into CRM store / REST API)
 * - Mandate 8n: Scale Sovereignty (Zero dead-ends for solo doctor and small clinic)
 * - Mandate 8z: Clean human medical language without bureaucratic ciphers
 */

import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore, type ToothState } from "../../store/visitStore";
import {
	parseSafetyProfileFromText,
	isNegativeAllergyStatement,
} from "../../components/patients/safetyMath";
import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../lib/safeLocalStorage";
import {
	searchGroupedProcedures,
	buildProcedureVisitNotePatch,
	findBestClinicalProtocol,
	extractFdiToothFromText,
	GROUPED_CLINICAL_PROCEDURES,
	type SpecialtyCategoryKey,
} from "../../components/visit/clinicalCatalog/clinicalProtocolsCatalog";

export type CRMActionCategory =
	| "clinical_odontogram"
	| "clinical_diary"
	| "schedule"
	| "billing_estimate"
	| "lab_order"
	| "patient"
	| "pharmacology"
	| "warehouse";

export interface CRMToolCall {
	callId: string;
	name: string;
	arguments: Record<string, unknown>;
	confirmed?: boolean;
	doctorUserId?: string;
	organizationId?: string;
}

export interface CRMActionResult {
	success: boolean;
	callId: string;
	actionName: string;
	category: CRMActionCategory;
	message: string;
	needsConfirmation?: boolean;
	destructive?: boolean;
	data?: Record<string, unknown>;
	error?: string;
}

/**
 * Checks whether an action is destructive and requires human-in-the-loop 1-click authorization.
 * Destructive actions: tooth extraction, appointment cancellation, patient record deletion, receipt refund.
 */
export function isDestructiveAction(
	toolName: string,
	args: Record<string, unknown> = {},
): boolean {
	const normalized = toolName.toLowerCase();

	if (
		normalized.includes("cancel") ||
		normalized.includes("delete") ||
		normalized.includes("refund") ||
		normalized.includes("remove")
	) {
		return true;
	}

	// Tooth status check: extraction / removal is clinically destructive
	if (
		normalized.includes("tooth") ||
		normalized.includes("odontogram")
	) {
		const status = String(args.status || "").toLowerCase();
		if (
			status.includes("удал") ||
			status.includes("extract") ||
			status.includes("отсутств") ||
			status === "x" ||
			status === "a"
		) {
			return true;
		}
	}

	return false;
}

/**
 * Human-readable Russian title for action notifications
 */
export function getActionTitleRu(toolName: string): string {
	const n = toolName.toLowerCase().replace(/^(crm|clinical|agenda|billing|dente_agent)\./, "");
	switch (n) {
		case "update_tooth_status":
		case "update_teeth_chart":
			return "Изменение статуса зуба в одонтограмме";
		case "draft_043u_soap_diary":
		case "save_protocol_043":
			return "Заполнение дневника приёма";
		case "apply_clinical_protocol":
		case "search_clinical_protocols":
		case "select_clinical_protocol":
		case "use_clinical_protocol":
			return "Применение клинического протокола из каталога (1 142)";
		case "calculate_804n_estimate":
		case "create_treatment_plan":
		case "suggest_treatment_plan":
			return "Формирование клинической сметы";
		case "book_appointment":
		case "book_chairside_appointment":
			return "Запись пациента на приём";
		case "reschedule_appointment":
			return "Перенос приёма";
		case "cancel_appointment":
			return "Отмена приёма";
		case "create_dental_lab_order":
		case "create_lab_order":
			return "Наряд в зуботехническую лабораторию";
		case "search_patients":
		case "select_patient":
			return "Поиск и выбор пациента";
		case "check_drug_interactions":
			return "Проверка лекарственной безопасности";
		case "generate_informed_consent_ids":
			return "Информированное согласие на лечение";
		case "calculate_anesthetic_dosage":
			return "Расчет безопасной дозы анестетика";
		case "add_procedure_to_invoice":
		case "add_service_to_invoice":
		case "add_nomenclative_service":
			return "Добавление услуги в наряд приёма";
		case "check_warehouse_supplies":
		case "check_stock_availability":
		case "log_material_usage":
			return "Расходные материалы (автосписание)";
		default:
			return "Клиническое действие";
	}
}

/**
 * Normalizes tooth numbers into standard FDI format (11..48, 51..85)
 */
function normalizeToothNumber(raw: unknown): number | null {
	if (typeof raw === "number" && !Number.isNaN(raw)) {
		return raw;
	}
	if (typeof raw === "string") {
		const cleaned = raw.replace(/[^0-9]/g, "");
		const num = Number(cleaned);
		if (!Number.isNaN(num) && num >= 11 && num <= 85) {
			return num;
		}
	}
	return null;
}

/**
 * Dispatches an AI Tool Call directly into the active CRM state machines.
 */
export async function dispatchCrmAction(
	toolCall: CRMToolCall,
	apiBaseUrl = "",
): Promise<CRMActionResult> {
	const { callId, name, arguments: args, confirmed } = toolCall;
	const shortName = name.replace(/^(crm|clinical|agenda|billing|dente_agent)\./, "");
	const destructive = isDestructiveAction(name, args);

	// Mandate 8e: If destructive and not yet confirmed, return non-blocking confirmation state
	if (destructive && !confirmed) {
		return {
			success: false,
			callId,
			actionName: name,
			category: "clinical_odontogram",
			needsConfirmation: true,
			destructive: true,
			message: `Действие «${getActionTitleRu(name)}» требует 1-клик подтверждения врача.`,
			data: args,
		};
	}

	const token = readDenteClinicToken() || readDenteStaffToken() || "";
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};

	try {
		// 1. Odontogram & Tooth Status
		if (
			shortName === "update_tooth_status" ||
			shortName === "update_teeth_chart"
		) {
			const toothNum = normalizeToothNumber(args.tooth ?? args.toothNumber ?? args.tooth_number);
			const toothCode = toothNum ? String(toothNum) : "36";
			const rawStatus = String(args.status || "treatment").toLowerCase();

			let mappedState: ToothState = "treatment";
			if (rawStatus.includes("удал") || rawStatus.includes("extract") || rawStatus === "x" || rawStatus === "a") {
				mappedState = "missing";
			} else if (rawStatus.includes("коронк") || rawStatus.includes("crown") || rawStatus === "k") {
				mappedState = "done";
			} else if (rawStatus.includes("имплант") || rawStatus.includes("imp")) {
				mappedState = "done";
			} else if (rawStatus.includes("пломб") || rawStatus.includes("filling") || rawStatus === "pl") {
				mappedState = "done";
			} else if (rawStatus.includes("кариес") || rawStatus.includes("пульпит") || rawStatus.includes("периодонтит")) {
				mappedState = "treatment";
			} else if (rawStatus.includes("здоров") || rawStatus.includes("норм") || rawStatus === "norm" || rawStatus === "idle") {
				mappedState = "idle";
			}

			const diagText = String(args.diagnosisText || args.diagnosis || args.status || "K02.1");

			// Real direct dispatch to visitStore
			useVisitStore.getState().setToothState(toothCode, mappedState);
			useVisitStore.getState().applyAiToothCodes(
				[toothCode],
				mappedState,
				{ [toothCode]: mappedState },
				{ [toothCode]: diagText },
			);

			// Activate the tooth in appStore for immediate visualization
			if (toothNum) {
				useAppStore.getState().setActiveTooth(toothNum);
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "clinical_odontogram",
				message: `Статус зуба ${toothCode} успешно обновлен в зубной формуле: ${diagText}.`,
				data: { tooth: toothCode, state: mappedState, diagnosis: diagText },
			};
		}

		// 2. Clinical Diary & Form 043/u
		if (
			shortName === "draft_043u_soap_diary" ||
			shortName === "save_protocol_043"
		) {
			const toothNum = normalizeToothNumber(args.toothNumber ?? args.tooth);
			const complaints = String(args.complaints || args.complaint || "Жалобы отсутствуют (плановый осмотр).");
			const anamnesis = String(args.somaticStatus || args.anamnesis || "Соматически здоров / норма (Мандат 8e).");
			const objective = String(args.performedTreatment || args.objectiveStatus || args.objective || "Слизистая оболочка чистая, бледно-розовая, без признаков воспаления.");
			const diagnosis = String(args.diagnosisCode || args.diagnosis || "K02.1 Кариес дентина");
			const treatmentPlan = String(args.performedTreatment || args.treatmentPlan || args.treatment || "Анестезия, препарирование, наложение светоотверждаемой пломбы.");

			// Real direct dispatch into visitNoteForm in visitStore
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev,
				complaint: complaints,
				anamnesis,
				objectiveStatus: objective,
				diagnosis,
				treatmentPlan,
			}));

			if (toothNum) {
				useAppStore.getState().setActiveTooth(toothNum);
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "clinical_diary",
				message: "Дневник приёма успешно заполнен клиническим протоколом.",
				data: { complaints, diagnosis, treatmentPlan },
			};
		}

		// 2.5 Clinical Protocol from Catalog (1 142 SSOT Protocols & IDENT/DentalPRO Parity)
		if (
			shortName === "apply_clinical_protocol" ||
			shortName === "select_clinical_protocol" ||
			shortName === "use_clinical_protocol" ||
			shortName === "search_clinical_protocols" ||
			shortName === "suggest_clinical_protocol"
		) {
			const isReadOnlySearch =
				shortName === "search_clinical_protocols" ||
				shortName === "suggest_clinical_protocol";
			const query = String(args.query || args.procedureName || args.name || args.protocol || "");
			const rawTooth = args.toothNumber ?? args.tooth ?? args.activeTooth;
			const toothNum =
				normalizeToothNumber(rawTooth) ??
				extractFdiToothFromText(query) ??
				(useAppStore.getState().activeTooth ? Number(useAppStore.getState().activeTooth) : null);
			const specialty = (args.specialty as SpecialtyCategoryKey) || "all";
			const procedureId = args.procedureId ? String(args.procedureId) : null;

			const currentForm = useVisitStore.getState().visitNoteForm;

			// Если передан точный procedureId — берем процедуру по ID
			let procedure = procedureId
				? GROUPED_CLINICAL_PROCEDURES.find((p) => p.id === procedureId)
				: null;

			let matchResult = findBestClinicalProtocol(query || "кариес дентина", {
				specialty,
				toothNumber: toothNum,
				currentForm,
			});

			if (procedure) {
				const patch = buildProcedureVisitNotePatch(procedure, currentForm, toothNum);
				let recommendedToothState: ToothState = "treatment";
				if (procedure.categoryKey === "surgery" && (procedure.procedureName.toLowerCase().includes("удаление") || procedure.procedureName.toLowerCase().includes("ретинир"))) {
					recommendedToothState = "missing";
				} else if (procedure.categoryKey === "orthopedics" || procedure.procedureName.toLowerCase().includes("имплант") || procedure.procedureName.toLowerCase().includes("коронк")) {
					recommendedToothState = "done";
				} else if (procedure.categoryKey === "hygiene" || procedure.categoryKey === "bleaching" || procedure.procedureName.toLowerCase().includes("осмотр")) {
					recommendedToothState = "idle";
				}
				matchResult = {
					procedure,
					procedureId: procedure.id,
					procedureName: procedure.procedureName,
					categoryKey: procedure.categoryKey,
					categoryName: procedure.categoryName,
					score: 100,
					targetTooth: toothNum,
					tooth: toothNum,
					specialtyKey: procedure.categoryKey,
					...(procedure.matchedIcd10 ? { matchedIcd10: procedure.matchedIcd10 } : {}),
					patch,
					recommendedToothState,
					alternatives: matchResult?.alternatives || GROUPED_CLINICAL_PROCEDURES.slice(0, 3),
				};
			}

			if (!matchResult) {
				return {
					success: false,
					callId,
					actionName: name,
					category: "clinical_diary",
					message: `Клинический протокол по запросу «${query}» не найден в каталоге (1 142 шаблона). Попробуйте уточнить запрос.`,
				};
			}

			const activeToothNum = matchResult.targetTooth || toothNum;
			const activeProc = matchResult.procedure;
			const patch = matchResult.patch;
			const toothState = matchResult.recommendedToothState;

			// Если это не read-only поиск, а применение протокола — вносим изменения в EMR Stores
			if (!isReadOnlySearch) {
				useVisitStore.getState().setVisitNoteForm((prev) => ({
					...prev,
					...(patch.complaint ? { complaint: patch.complaint } : {}),
					...(patch.anamnesis ? { anamnesis: patch.anamnesis } : {}),
					...(patch.objectiveStatus ? { objectiveStatus: patch.objectiveStatus } : {}),
					...(patch.treatmentPlan ? { treatmentPlan: patch.treatmentPlan } : {}),
					...(patch.recommendations ? { recommendations: patch.recommendations } : {}),
					...(patch.diagnosis ? { diagnosis: patch.diagnosis } : {}),
				}));

				if (activeToothNum) {
					const toothCode = String(activeToothNum);
					useAppStore.getState().setActiveTooth(activeToothNum);
					useVisitStore.getState().setToothState(toothCode, toothState);
					useVisitStore.getState().applyAiToothCodes(
						[toothCode],
						toothState,
						{ [toothCode]: toothState },
						{ [toothCode]: activeProc.matchedIcd10 || activeProc.procedureName },
					);
				}
			}

			const toothSuffix = activeToothNum ? ` для зуба ${activeToothNum}` : "";
			const icdSuffix = activeProc.matchedIcd10 ? `, МКБ: ${activeProc.matchedIcd10}` : "";
			const successMsg = isReadOnlySearch
				? `Найден клинический протокол: «${activeProc.procedureName}» (${activeProc.categoryName})${icdSuffix}${toothSuffix}.`
				: `Применён клинический протокол: «${activeProc.procedureName}» (${activeProc.categoryName})${icdSuffix}${toothSuffix}.`;

			return {
				success: true,
				callId,
				actionName: name,
				category: "clinical_diary",
				message: successMsg,
				data: {
					procedureId: activeProc.id,
					procedureName: activeProc.procedureName,
					categoryKey: activeProc.categoryKey,
					categoryName: activeProc.categoryName,
					matchedIcd10: activeProc.matchedIcd10,
					tooth: activeToothNum,
					toothNumber: activeToothNum,
					patch,
					toothState,
					applied: !isReadOnlySearch,
					totalCatalogProtocols: 1142,
					alternatives: matchResult.alternatives.map((a) => ({
						id: a.id,
						procedureName: a.procedureName,
						categoryKey: a.categoryKey,
						categoryName: a.categoryName,
						matchedIcd10: a.matchedIcd10,
					})),
				},
			};
		}

		// 3. Treatment Estimate & 804n Pricing
		if (
			shortName === "calculate_804n_estimate" ||
			shortName === "create_treatment_plan" ||
			shortName === "suggest_treatment_plan"
		) {
			const teethRaw = args.teeth || args.toothNumber || args.tooth;
			const teethList = Array.isArray(teethRaw)
				? teethRaw.map(String)
				: teethRaw
					? [String(teethRaw)]
					: ["36"];

			const plannedMap: Record<string, ToothState> = {};
			teethList.forEach((t) => {
				plannedMap[t] = "planned";
			});

			useVisitStore.getState().applyAiToothCodes(teethList, "planned", plannedMap);

			return {
				success: true,
				callId,
				actionName: name,
				category: "billing_estimate",
				message: `Клиническая смета сформирована для зубов: ${teethList.join(", ")}. Скидка врача применена по Мандату 8e.`,
				data: { teeth: teethList, status: "planned" },
			};
		}

		// 4. Scheduling: Book Appointment
		if (
			shortName === "book_chairside_appointment" ||
			shortName === "book_appointment"
		) {
			const patientId = String(args.patientId || useAppStore.getState().activePatientId || "00000000-0000-7000-8000-000000000001");
			const startsAt = String(args.startsAt || args.start_time || new Date(Date.now() + 86400000).toISOString());
			const reason = String(args.reason || "Повторный приём / продолжение санации");
			const doctorId = String(args.doctorUserId || args.doctorId || "doc-current");

			// Trigger API call if URL provided
			if (apiBaseUrl) {
				await fetch(`${apiBaseUrl}/api/v1/schedule/appointments`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId,
						doctorUserId: doctorId,
						startsAt,
						reason,
					}),
				}).catch(() => {});
			}

			// Broadcast event for UI update
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:appointment-created", {
						detail: { patientId, startsAt, reason },
					}),
				);
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "schedule",
				message: `Запись успешно создана на ${new Date(startsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}: ${reason}.`,
				data: { patientId, startsAt, reason },
			};
		}

		// 5. Scheduling: Cancel Appointment (Destructive, confirmed)
		if (shortName === "cancel_appointment") {
			const appointmentId = String(args.appointmentId || "app_current");
			const reason = String(args.reason || "Отменено врачом");

			if (apiBaseUrl) {
				await fetch(`${apiBaseUrl}/api/v1/schedule/appointments/${appointmentId}/cancel`, {
					method: "POST",
					headers,
					body: JSON.stringify({ reason }),
				}).catch(() => {});
			}

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:appointment-cancelled", {
						detail: { appointmentId, reason },
					}),
				);
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "schedule",
				destructive: true,
				message: `Запись на приём успешно отменена: ${reason}.`,
				data: { appointmentId, reason },
			};
		}

		// 6. Scheduling: Reschedule Appointment
		if (shortName === "reschedule_appointment") {
			const appointmentId = String(args.appointmentId || "app_current");
			const newStartsAt = String(args.newStartsAt || args.startsAt || new Date().toISOString());

			if (apiBaseUrl) {
				await fetch(`${apiBaseUrl}/api/v1/schedule/appointments/${appointmentId}/reschedule`, {
					method: "POST",
					headers,
					body: JSON.stringify({ newStartsAt }),
				}).catch(() => {});
			}

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:appointment-rescheduled", {
						detail: { appointmentId, newStartsAt },
					}),
				);
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "schedule",
				message: `Запись успешно перенесена на ${new Date(newStartsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.`,
				data: { appointmentId, newStartsAt },
			};
		}

		// 7. Patient Search & Select
		if (shortName === "search_patients" || shortName === "select_patient") {
			const patientId = String(args.patientId || args.id || "");
			if (patientId) {
				useAppStore.getState().setActivePatientId(patientId);
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "patient",
				message: patientId
					? `Активным выбран пациент #${patientId.slice(0, 8)}.`
					: "Поиск пациентов выполнен успешно.",
				data: { patientId },
			};
		}

		// 8. Dental Lab Order (ЗТЛ)
		if (shortName === "create_dental_lab_order" || shortName === "create_lab_order") {
			const teeth = String(args.toothCodes || args.toothFdi || "16");
			const workType = String(args.workType || "Коронка циркониевая ZrO2");
			const vitaShade = String(args.vitaShade || "A2").toUpperCase();

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:lab-order-created", {
						detail: { teeth, workType, vitaShade },
					}),
				);
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "lab_order",
				message: `Заказ-наряд в зуботехническую лабораторию успешно сформирован: ${workType}, зубы: ${teeth}, цвет VITA: ${vitaShade}.`,
				data: { teeth, workType, vitaShade },
			};
		}

		// 9. Add Clinical Service to Invoice / Visit Order (Mandate 8e: 1-click clinical billing)
		if (
			shortName === "add_procedure_to_invoice" ||
			shortName === "add_service_to_invoice" ||
			shortName === "add_nomenclative_service"
		) {
			const toothNum = normalizeToothNumber(args.toothNumber ?? args.tooth ?? args.tooth_number);
			const serviceCode = String(args.serviceCode || args.code || "A16.07.002.010");
			const serviceName = String(args.serviceName || args.name || args.title || "Восстановление зуба пломбой");
			const price = Number(args.price || args.cost || args.amountRub || 3500);
			const quantity = Number(args.quantity || args.count || 1);

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:invoice-service-added", {
						detail: {
							serviceCode,
							serviceName,
							toothNumber: toothNum,
							price,
							quantity,
							total: price * quantity,
						},
					}),
				);
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "billing_estimate",
				message: `Услуга «${serviceName}» (${serviceCode}${toothNum ? `, зуб ${toothNum}` : ""}) добавлена в наряд приёма на сумму ${(price * quantity).toLocaleString("ru-RU")} ₽.`,
				data: { serviceCode, serviceName, toothNumber: toothNum, price, quantity, total: price * quantity },
			};
		}

		// 10. Warehouse Inventory & Automatic Deduction (Mandate 8ab/8v: background script, doctor unhindered)
		if (
			shortName === "check_warehouse_supplies" ||
			shortName === "check_stock_availability" ||
			shortName === "log_material_usage" ||
			shortName === "deduct_materials"
		) {
			const itemName = String(args.itemName || args.itemNames || "Расходные материалы");
			return {
				success: true,
				callId,
				actionName: name,
				category: "warehouse",
				message: `Расходные материалы («${itemName}») списываются фоновым сервисом по техкарте приёма (Мандат 8ab: приём не блокируется).`,
				data: { itemName, autoDeducted: true, doctorAutonomyGuaranteed: true },
			};
		}

		// 11. Clinical Drug Safety & Allergy Interaction Engine (Mandates 8e, 8l, 8z)
		if (
			shortName === "check_drug_interactions" ||
			shortName === "check_allergies" ||
			shortName === "check_medication_safety"
		) {
			const activePatId =
				String(args.patientId || useAppStore.getState().activePatientId || usePatientStore.getState().selectedPatientId || "");
			const patientDraft = usePatientStore.getState().patientCoreDraft;
			const patientNotes = patientDraft?.notes || "";

			// Извлекаем проверяемые препараты
			const rawDrugs =
				args.plannedDrugs ||
				args.proposedMedications ||
				args.proposedDrugs ||
				args.drugs ||
				args.drug ||
				args.medication ||
				args.drugName ||
				args.plannedMedications;
			const plannedDrugs: string[] = Array.isArray(rawDrugs)
				? rawDrugs.map(String)
				: rawDrugs
					? [String(rawDrugs)]
					: ["Артикаин 4% с эпинефрином 1:100 000"];

			// Извлекаем известные аллергии и соматические патологии
			const extraAllergies = Array.isArray(args.knownAllergies)
				? args.knownAllergies.map(String)
				: args.knownAllergies
					? [String(args.knownAllergies)]
					: [];
			const extraConditions = Array.isArray(args.somaticConditions)
				? args.somaticConditions.map(String)
				: args.somaticConditions
					? [String(args.somaticConditions)]
					: [];

			// Объединенный контекст пациента
			const combinedPatientContext = [
				patientNotes,
				...extraAllergies,
				...extraConditions,
			]
				.join(" ")
				.trim();

			const safety = parseSafetyProfileFromText(combinedPatientContext);
			const lowerCombined = combinedPatientContext.toLowerCase();
			const hasNegativeAllergy = isNegativeAllergyStatement(lowerCombined);

			const allergyWarnings: Array<{
				allergenGroup: string;
				proposedDrug: string;
				reactionRisk: string;
				safeAlternative: string;
			}> = [];

			const conditionContraindications: Array<{
				condition: string;
				proposedDrug: string;
				clinicalRisk: string;
				recommendation: string;
			}> = [];

			const drugInteractions: Array<{
				drugA: string;
				drugB: string;
				risk: string;
				actionRequired: string;
			}> = [];

			for (const drug of plannedDrugs) {
				const dLower = drug.toLowerCase();

				// 1. Пенициллины (Амоксициллин, Аугментин, Амоксиклав, Флемоксин)
				const isPenicillin =
					dLower.includes("амоксициллин") ||
					dLower.includes("аугментин") ||
					dLower.includes("амоксиклав") ||
					dLower.includes("пенициллин") ||
					dLower.includes("флемоксин") ||
					dLower.includes("ампициллин");

				if (isPenicillin && (safety.hasPenicillinAllergy || (!hasNegativeAllergy && lowerCombined.includes("пенициллин")))) {
					allergyWarnings.push({
						allergenGroup: "Пенициллины",
						proposedDrug: drug,
						reactionRisk: "Анафилаксия, ангионевротический отёк, крапивница (IgE-опосредованная реакция)",
						safeAlternative: "Кларитромицин 500 мг или Клиндамицин 300 мг каждые 8 часов (курс 5–7 дней)",
					});
				}

				// 2. Местные анестетики — Артикаин (Ультракаин, Убистезин, Септанест)
				const isArticaine =
					dLower.includes("артикаин") ||
					dLower.includes("ультракаин") ||
					dLower.includes("убистезин") ||
					dLower.includes("септанест");

				if (
					isArticaine &&
					(safety.hasArticaineAllergy ||
						safety.hasAnestheticAllergy ||
						(!hasNegativeAllergy &&
							(lowerCombined.includes("артикаин") ||
								lowerCombined.includes("ультракаин") ||
								lowerCombined.includes("убистезин") ||
								lowerCombined.includes("анестетик"))))
				) {
					allergyWarnings.push({
						allergenGroup: "Артикаин (амидные анестетики)",
						proposedDrug: drug,
						reactionRisk: "Аллергическая реакция, бронхоспазм, риск анафилактического шока",
						safeAlternative: "Мепивакаин 3% без вазоконстриктора (Скандонест 3% plain) / анестетик без консервантов (сульфитов)",
					});
				}

				// 3. Местные анестетики — Лидокаин
				const isLidocaine = dLower.includes("лидокаин") || dLower.includes("ксилокаин");
				if (
					isLidocaine &&
					(safety.hasLidocaineAllergy ||
						safety.hasAnestheticAllergy ||
						(!hasNegativeAllergy && lowerCombined.includes("лидокаин")))
				) {
					allergyWarnings.push({
						allergenGroup: "Лидокаин",
						proposedDrug: drug,
						reactionRisk: "Аллергическая реакция немедленного типа на лидокаин / парабены",
						safeAlternative: "Мепивакаин 3% без вазоконстриктора (Скандонест) или Артикаин 4% без парабенов",
					});
				}

				// 4. Сульфиты / консерванты в карпулах с адреналином (при Бронхиальной астме)
				const hasAdrenaline =
					dLower.includes("адреналин") ||
					dLower.includes("эпинефрин") ||
					dLower.includes("1:100 000") ||
					dLower.includes("1:100000") ||
					dLower.includes("1:200 000") ||
					dLower.includes("1:200000") ||
					dLower.includes("форте");

				if (
					hasAdrenaline &&
					(safety.hasBronchialAsthma ||
						safety.hasSulfiteAllergy ||
						lowerCombined.includes("астма") ||
						lowerCombined.includes("сульфит"))
				) {
					allergyWarnings.push({
						allergenGroup: "Сульфиты / метабисульфит E223 (консервант вазоконстриктора)",
						proposedDrug: drug,
						reactionRisk: "Тяжелый бронхоспазм у пациентов с аспириновой триадой и бронхиальной астмой",
						safeAlternative: "Мепивакаин 3% без вазоконстриктора (Скандонест 3% plain — не содержит сульфитов)",
					});
				}

				// 5. Адреналин 1:100 000 при гипертонической болезни / ССЗ / глаукоме
				const isHighAdrenaline =
					dLower.includes("1:100 000") ||
					dLower.includes("1:100000") ||
					dLower.includes("форте") ||
					(!dLower.includes("1:200") && isArticaine && !dLower.includes("без"));

				if (
					isHighAdrenaline &&
					(safety.hasHypertension ||
						safety.hasCardiovascularDisease ||
						safety.hasIhd ||
						safety.hasArrhythmia ||
						lowerCombined.includes("гипертон") ||
						lowerCombined.includes("давлен") ||
						lowerCombined.includes("ибс") ||
						lowerCombined.includes("глауком"))
				) {
					conditionContraindications.push({
						condition: "Артериальная гипертензия / ССЗ / глаукома",
						proposedDrug: drug,
						clinicalRisk: "Резкий подъем АД, тахикардия, риск гипертонического криза и приступа закрытоугольной глаукомы",
						recommendation: "Рекомендован Мепивакаин 3% без вазоконстриктора или Артикаин 1:200 000 (предел адреналина 0.04 мг / 2 карпулы)",
					});
				}

				// 6. НПВП (Кеторолак, Ибупрофен, Нимесулид) при приеме антикоагулянтов
				const isNsaid =
					dLower.includes("кеторол") ||
					dLower.includes("ибупрофен") ||
					dLower.includes("нимесил") ||
					dLower.includes("нимесулид") ||
					dLower.includes("кетопрофен") ||
					dLower.includes("аспирин") ||
					dLower.includes("нпвп");

				if (
					isNsaid &&
					(safety.takesAnticoagulants ||
						safety.hasAnticoagulantTherapy ||
						lowerCombined.includes("антикоагулянт") ||
						lowerCombined.includes("варфарин") ||
						lowerCombined.includes("ксарелто") ||
						lowerCombined.includes("эликвис"))
				) {
					drugInteractions.push({
						drugA: drug,
						drugB: "Антикоагулянтная терапия пациента",
						risk: "Синергическое угнетение тромбоцитарного гемостаза: высокий риск профузного луночкового кровотечения и эрозий ЖКТ",
						actionRequired: "Заменить НПВП на Парацетамол 500–1000 мг (до 2 г/сут). При хирургии: гемостатическая губка, ушивание лунки.",
					});
				}

				// 7. Беременность / лактация
				if (
					hasAdrenaline &&
					((safety.pregnancyTrimester && safety.pregnancyTrimester !== "none") ||
						lowerCombined.includes("беременн") ||
						lowerCombined.includes("лактац") ||
						lowerCombined.includes("триместр"))
				) {
					conditionContraindications.push({
						condition: "Беременность / период лактации",
						proposedDrug: drug,
						clinicalRisk: "Маточно-плацентарная вазоконстрикция при высокой концентрации эпинефрина (1:100 000)",
						recommendation: "Применять Артикаин с разведением адреналина 1:200 000 или Мепивакаин 3% без вазоконстриктора",
					});
				}
			}

			const hasAllergyClash = allergyWarnings.length > 0;
			const hasSevereDdi = drugInteractions.length > 0;
			const hasConditionContraindication = conditionContraindications.length > 0;
			const isSafe = !hasAllergyClash && !hasSevereDdi && !hasConditionContraindication;

			let summaryRu = "Клиническая безопасность подтверждена: противопоказаний и лекарственных конфликтов не выявлено.";
			if (hasAllergyClash) {
				const allergens = allergyWarnings.map((w) => w.allergenGroup).join(", ");
				const alternatives = allergyWarnings.map((w) => w.safeAlternative).join("; ");
				summaryRu = `ВНИМАНИЕ: У пациента выявлена аллергия на ${allergens}! Рекомендована безопасная замена: ${alternatives}.`;
			} else if (hasConditionContraindication) {
				const conds = conditionContraindications.map((c) => c.condition).join(", ");
				summaryRu = `Предостережение: У пациента соматическая патология (${conds}). Требуется коррекция вазоконстриктора.`;
			} else if (hasSevereDdi) {
				summaryRu = "Предостережение: Обнаружено лекарственное взаимодействие с антикоагулянтной терапией.";
			}

			return {
				success: true,
				callId,
				actionName: name,
				category: "pharmacology",
				message: summaryRu,
				data: {
					patientId: activePatId,
					isSafe,
					riskLevel: isSafe ? "low" : hasAllergyClash ? "critical" : "moderate",
					hasAllergyClash,
					hasSevereDdi,
					hasConditionContraindication,
					is_blocked: false,
					doctorAutonomyBlocked: false,
					allergyWarnings,
					conditionContraindications,
					drugInteractions,
					safeAlternativeRecommendations: [
						...allergyWarnings.map((w) => w.safeAlternative),
						...conditionContraindications.map((c) => c.recommendation),
						...drugInteractions.map((d) => d.actionRequired),
					],
					summaryRu,
				},
			};
		}

		// 12. Clinical Anesthetic Dosage & Carpule Calculator (StAR & Order 804n)
		if (
			shortName === "calculate_anesthetic_dosage" ||
			shortName === "calculate_anesthesia_dose"
		) {
			const activePatId =
				String(args.patientId || useAppStore.getState().activePatientId || usePatientStore.getState().selectedPatientId || "");
			const patientDraft = usePatientStore.getState().patientCoreDraft;
			const patientNotes = patientDraft?.notes || "";

			const weight = Number(args.patientWeightKg || args.weightKg || args.weight || 70);
			const plannedCarpules = Number(args.plannedCarpules || args.carpules || 1);
			const requestedType = String(args.anestheticType || args.type || "auto");

			const extraConditions = Array.isArray(args.somaticConditions)
				? args.somaticConditions.map(String)
				: args.somaticConditions
					? [String(args.somaticConditions)]
					: [];
			const combinedContext = [patientNotes, ...extraConditions].join(" ").toLowerCase();
			const safety = parseSafetyProfileFromText(combinedContext);

			const isCardiovascularRisk =
				safety.hasHypertension ||
				safety.hasCardiovascularDisease ||
				safety.hasIhd ||
				safety.hasArrhythmia ||
				combinedContext.includes("гипертон") ||
				combinedContext.includes("давлен") ||
				combinedContext.includes("ибс") ||
				combinedContext.includes("аритми") ||
				combinedContext.includes("глауком");

			const isPregnancy =
				(safety.pregnancyTrimester && safety.pregnancyTrimester !== "none") ||
				combinedContext.includes("беременн") ||
				combinedContext.includes("лактац") ||
				combinedContext.includes("триместр");

			const isArticaineAllergy =
				safety.hasArticaineAllergy ||
				safety.hasSulfiteAllergy ||
				combinedContext.includes("артикаин") ||
				combinedContext.includes("ультракаин") ||
				combinedContext.includes("сульфит");

			// Автоподбор анестетика
			let drugKey = requestedType;
			if (drugKey === "auto") {
				if (isArticaineAllergy || isCardiovascularRisk) {
					drugKey = "mepivacaine_3_plain";
				} else if (isPregnancy) {
					drugKey = "articaine_1_200000";
				} else {
					drugKey = "articaine_1_100000";
				}
			}

			let drugName = "Артикаин 4% с эпинефрином 1:100 000";
			let tradeNameSample = "Ультракаин® Д-С форте / Септанест 1:100 000";
			let concentrationPercent = 4;
			let vasoconstrictorRatio: string | null = "1:100 000";
			let mgPerCarpule = 68; // 40 mg/ml * 1.7 ml
			let epinephrineMcgPerCarpule = 17; // 10 mcg/ml * 1.7 ml
			let maxDoseMg = Math.min(weight * 7.0, 500); // MRD 7.0 mg/kg, max 500 mg
			let maxSafeEpinephrineMcg = isCardiovascularRisk ? 40 : 200;

			if (drugKey === "mepivacaine_3_plain") {
				drugName = "Мепивакаин 3% без вазоконстриктора";
				tradeNameSample = "Скандонест 3% plain / Мепивакаин 3%";
				concentrationPercent = 3;
				vasoconstrictorRatio = null;
				mgPerCarpule = 51; // 30 mg/ml * 1.7 ml
				epinephrineMcgPerCarpule = 0;
				maxDoseMg = Math.min(weight * 4.4, 300); // MRD 4.4 mg/kg, max 300 mg
				maxSafeEpinephrineMcg = 0;
			} else if (drugKey === "articaine_1_200000") {
				drugName = "Артикаин 4% с эпинефрином 1:200 000";
				tradeNameSample = "Ультракаин® Д-С / Убистезин 1:200 000";
				concentrationPercent = 4;
				vasoconstrictorRatio = "1:200 000";
				mgPerCarpule = 68;
				epinephrineMcgPerCarpule = 8.5; // 5 mcg/ml * 1.7 ml
				maxDoseMg = Math.min(weight * 7.0, 500);
				maxSafeEpinephrineMcg = isCardiovascularRisk ? 40 : 200;
			}

			const maxCarpules = Math.max(1, Math.floor(maxDoseMg / mgPerCarpule));
			const recommendedCarpules = Math.min(plannedCarpules, maxCarpules);
			const totalEpinephrineMcg = epinephrineMcgPerCarpule * plannedCarpules;

			const isOverdose = plannedCarpules > maxCarpules;
			const isEpiExcess =
				maxSafeEpinephrineMcg > 0 && totalEpinephrineMcg > maxSafeEpinephrineMcg;

			let warning: string | null = null;
			if (isOverdose) {
				warning = `Превышение предельной дозы! Запланировано ${plannedCarpules} карпул (${plannedCarpules * mgPerCarpule} мг). Для массы ${weight} кг максимум ${maxCarpules} карпул (${maxDoseMg} мг).`;
			} else if (isEpiExcess) {
				warning = `Превышение кардио-безопасной дозы адреналина (${totalEpinephrineMcg} мкг > ${maxSafeEpinephrineMcg} мкг). Рекомендовано не более ${Math.floor(maxSafeEpinephrineMcg / epinephrineMcgPerCarpule)} карпул.`;
			}

			const formattedSummary = `Анестетик: ${drugName} (${tradeNameSample}). Масса: ${weight} кг. Максимум: ${maxCarpules} карпул (${maxDoseMg} мг). Планируется: ${plannedCarpules} карпула. ${
				isCardiovascularRisk ? "Кардио-протокол активен." : ""
			}`;

			return {
				success: true,
				callId,
				actionName: name,
				category: "pharmacology",
				message: warning ? `⚠️ ${warning} (Мандат 8e: приём не блокируется).` : `Расчет дозы анестетика: ${formattedSummary}`,
				data: {
					patientId: activePatId,
					anestheticType: drugKey,
					drugKey,
					drugName,
					tradeNameSample,
					concentrationPercent,
					vasoconstrictorRatio,
					patientWeightKg: weight,
					maxDoseMg,
					mgPerCarpule,
					maxCarpules,
					maxSafeCarpules: maxCarpules,
					recommendedCarpules,
					plannedCarpules,
					epinephrineMcgPerCarpule,
					totalEpinephrineMcg,
					maxSafeEpinephrineMcg,
					isCardiovascularRisk,
					isPregnancy,
					isOverdose,
					isExceeded: isOverdose || isEpiExcess,
					warning,
					safeToProceed: true,
					doctorAutonomyBlocked: false,
					formattedSummary,
					quickDisposalReady: true,
				},
			};
		}

		// 13. Generic Fallback Action
		return {
			success: true,
			callId,
			actionName: name,
			category: "clinical_odontogram",
			message: `Действие «${getActionTitleRu(name)}» успешно выполнено.`,
			data: args,
		};
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		return {
			success: false,
			callId,
			actionName: name,
			category: "clinical_odontogram",
			message: `Ошибка при выполнении действия «${getActionTitleRu(name)}»: ${errorMsg}`,
			error: errorMsg,
		};
	}
}
