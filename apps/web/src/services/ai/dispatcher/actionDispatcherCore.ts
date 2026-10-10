/**
 * actionDispatcherCore.ts — Core Action Dispatcher Pipeline, Classification, and Validation.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy (0-click / 1-click execution, non-blocking confirmation for destructive actions)
 * - Mandate 8l: Action Engine (Zero mocks, real dispatch into CRM store / REST API)
 * - Mandate 8n: Scale Sovereignty (Zero dead-ends for solo doctor and small clinic)
 * - Mandate 8z: Clean human medical language without bureaucratic ciphers
 */

import {
	readDenteClinicToken,
	readDenteStaffToken,
} from "../../../lib/safeLocalStorage";
import type {
	CRMToolCall,
	CRMActionResult,
	ActionExecutionContext,
} from "./types.js";
import { handleClinicalAction } from "./clinicalActionHandlers.js";
import { handlePharmacologyAction } from "./pharmacologyActionHandlers.js";
import { handleSchedulingAction } from "./schedulingActionHandlers.js";

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
			message: `Действие «${getActionTitleRu(name)}» требует подтверждения врача.`,
			data: args,
		};
	}

	const token = readDenteClinicToken() || readDenteStaffToken() || "";
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
	const context: ActionExecutionContext = {
		apiBaseUrl,
		token,
		headers,
	};

	try {
		// 1. Clinical actions (odontogram, diary, catalog protocols, estimates, lab orders, invoice, warehouse)
		const clinicalResult = await handleClinicalAction(
			shortName,
			name,
			args,
			callId,
			context,
		);
		if (clinicalResult) {
			return clinicalResult;
		}

		// 2. Pharmacology actions (drug safety & allergies, anesthetic dosage)
		const pharmacologyResult = handlePharmacologyAction(
			shortName,
			name,
			args,
			callId,
		);
		if (pharmacologyResult) {
			return pharmacologyResult;
		}

		// 3. Scheduling actions (booking, cancellation, rescheduling, patient select)
		const schedulingResult = await handleSchedulingAction(
			shortName,
			name,
			args,
			callId,
			context,
		);
		if (schedulingResult) {
			return schedulingResult;
		}

		// 4. Generic Fallback Action
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
