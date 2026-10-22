import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import type { DentalLabOrderData } from "./labMath";
import { validateLabOrderInput } from "./orderSaveModules/labOrderValidator";
import {
	mapConstructionTypeToRestorationType,
	mapMaterialToRestorationMaterial,
	buildLabOrderApiPayload,
	buildFittingAppointmentDraft,
} from "./orderSaveModules/labOrderPayloadBuilder";
import {
	formatDisplayDate,
	copyLabOrderZtl1Protocol,
	copyLabOrderMessengerSummary,
} from "./orderSaveModules/labOrderProtocolExporter";
import type { SaveLabOrderParams } from "./orderSaveModules/labOrderSaveTypes";
import { dispatchSavedOrderEvents } from "./orderSaveModules/labOrderSaveEvents";
import { buildSavedOrderResult } from "./orderSaveModules/labOrderResultBuilder";

export type { SaveLabOrderParams };
export {
	mapConstructionTypeToRestorationType,
	mapMaterialToRestorationMaterial,
	formatDisplayDate,
	copyLabOrderZtl1Protocol,
	copyLabOrderMessengerSummary,
	buildFittingAppointmentDraft,
};

export async function executeSaveLabOrder(params: SaveLabOrderParams): Promise<void> {
	const validation = validateLabOrderInput({
		patientId: params.effectivePatientId,
		patientName: params.formPatientName,
		doctorId: params.formDoctorId,
		doctorName: params.formDoctorName,
		selectedTeeth: params.selectedTeeth,
		jawScope: params.jawScope,
		constructionType: params.constructionType,
		material: params.material,
		shadeFinal: params.finalShade,
		dueDate: params.dueDate,
		scheduledVisitDate: params.scheduledVisitDate,
		frameworkTrialDate: params.frameworkTrialDate,
		ceramicTrialDate: params.ceramicTrialDate,
		totalLabPriceRub: params.totalLabPriceRub,
	});

	if (!validation.isValid) {
		const errMsg = validation.errors.join("; ");
		showToast(`Ошибка наряда: ${errMsg}`, "error");
		throw new Error(errMsg);
	}

	for (const warning of validation.warnings) {
		showToast(warning, "warning");
	}

	const payload = buildLabOrderApiPayload(params);
	const isExistingOrder = Boolean(
		params.initialOrder?.id &&
		!params.initialOrder.id.startsWith("LAB-") &&
		!params.initialOrder.id.startsWith("TEMP-") &&
		!params.initialOrder.id.startsWith("live-ztl-") &&
		/^[0-9a-fA-F-]{36}$/.test(params.initialOrder.id)
	);

	const url = isExistingOrder ? `/api/clinical/lab-orders/${params.initialOrder!.id}` : "/api/clinical/lab-orders";
	const method = isExistingOrder ? "PUT" : "POST";

	const res = await fetch(url, {
		method,
		headers: {
			"Content-Type": "application/json",
			"Idempotency-Key": `lab-order-${Date.now()}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now().toString(36)}`,
			...denteAdminSecretRequestHeaders(),
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const errData = await res.json().catch(() => ({}));
		const errMsg = errData.message || "Не удалось сохранить заказ ЗТЛ";
		showToast(errMsg, "error");
		throw new Error(errMsg);
	}

	const savedOrder = await res.json();
	showToast(isExistingOrder ? "Наряд ЗТЛ успешно обновлен" : "Наряд-заказ в ЗТЛ успешно оформлен!", "success");

	const resultData = buildSavedOrderResult(savedOrder, params);

	params.onOrderSaved?.(resultData);
	params.onSaveOrder?.(resultData);
	dispatchSavedOrderEvents(params, resultData, isExistingOrder);
	params.onClose();
}
