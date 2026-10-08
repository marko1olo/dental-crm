/**
 * dentalLabOrderSaveHelper.ts — Выделенный хелпер сохранения и экспорта наряд-заказов ЗТЛ.
 * 
 * Соблюдение Mandate 8b (<=800 строк на файл) и Mandate 8d (Zero emojis).
 */

import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { rublesToKopecks, formatLabOrderFormZtl1A4Protocol } from "@dental/shared";
import {
	type DentalLabOrderData,
	type JawScope,
	type LabOrderStageKey,
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	formatGostOrderNumber,
	formatJawScopeLabel,
	addWorkingDays,
} from "./labMath";
import { buildLabOrderMessengerSummary } from "./dentalLabModalPresets";

export interface SaveLabOrderParams {
	initialOrder?: DentalLabOrderData | null | undefined;
	effectivePatientId: string;
	formPatientName: string;
	formDoctorId: string;
	formDoctorName: string;
	patientChartNumber?: string | undefined;
	selectedTeeth: number[];
	jawScope: JawScope | null;
	constructionType: string;
	material: string;
	impressionType: string;
	finalShade: string;
	shadeSystem: "classical" | "3d_master" | "bleach";
	shadeCervical: string;
	shadeBody: string;
	shadeIncisal: string;
	shadeStump: string;
	translucency: string;
	mamelons: boolean;
	calcifications: boolean;
	opalescence: boolean;
	occlusalScheme: string;
	contactTightness: string;
	surfaceTexture: string;
	cementGapMicrons: number;
	currentStage: LabOrderStageKey;
	dueDate: string;
	scheduledVisitDate: string;
	frameworkTrialDate: string;
	ceramicTrialDate: string;
	clinicalNotes: string;
	effectiveOverride: { authorized: boolean; doctorName: string; timestampIso: string; reason: string } | null;
	totalLabPriceRub: number;
	attachedImageUrl: string | null;
	treatmentPlanId: string | null;
	stageId: string | null;
	stageNumber: number | null;
	stageTitle: string | null;
	includeImpressionBilling: boolean;
	clinicSharePct: number;
	doctorSharePct: number;
	doctorAmountRub: number;
	fittingCollision: { hasCollision: boolean; warningRu?: string | null | undefined };
	gostOrderNumber: string;
	onOrderSaved?: ((order: DentalLabOrderData) => void) | undefined;
	onSaveOrder?: ((order: DentalLabOrderData) => void) | undefined;
	onClose: () => void;
}

export function mapConstructionTypeToRestorationType(val?: string | null): string {
	if (!val) return "crown_monolithic";
	const lower = val.toLowerCase().trim();
	const map: Record<string, string> = {
		single_crown: "crown_monolithic",
		crown_zirconia: "crown_monolithic",
		crown_emax: "crown_layered_cutback",
		crown: "crown_monolithic",
		bridge: "bridge_retainer",
		bridge_retainer: "bridge_retainer",
		bridge_pontic: "bridge_pontic",
		veneer: "veneer_laminate",
		veneer_laminate: "veneer_laminate",
		inlay_onlay: "inlay",
		inlay: "inlay",
		onlay: "onlay",
		overlay: "overlay",
		all_on_4_6: "screw_retained_crown",
		all_on_arch: "screw_retained_crown",
		implant_abutment: "custom_abutment_tibase",
		custom_abutment_tibase: "custom_abutment_tibase",
		screw_retained_crown: "screw_retained_crown",
		surgical_guide: "surgical_guide",
		aligner_splint: "clear_aligner_stage",
		aligner_nightguard: "clear_aligner_stage",
		aligners_nightguard: "clear_aligner_stage",
		aligners: "clear_aligner_stage",
		clasp_denture: "crown_monolithic",
		endocrown: "endocrown",
		core_buildup_post: "crown_monolithic",
		nightguard_bruxism: "occlusal_splint_nightguard",
		occlusal_splint: "occlusal_splint_nightguard",
		sports_mouthguard: "occlusal_splint_nightguard",
		bleaching_tray: "occlusal_splint_nightguard",
		full_denture: "crown_monolithic",
		custom_impression_tray: "crown_monolithic",
	};
	return map[lower] || "crown_monolithic";
}

export function mapMaterialToRestorationMaterial(val?: string | null): string {
	if (!val) return "zirconia_multilayer_gradient";
	const lower = val.toLowerCase().trim();
	const map: Record<string, string> = {
		zirconia_multilayer: "zirconia_multilayer_gradient",
		zirconia: "zirconia_multilayer_gradient",
		emax_lithium_disilicate: "emax_lithium_disilicate_press",
		emax_press: "emax_lithium_disilicate_press",
		emax_cad: "emax_lithium_disilicate_cad",
		emax: "emax_lithium_disilicate_press",
		pfm_cocr: "cocr_milled_cast",
		metal_ceramic: "cocr_milled_cast",
		pmma_temporary: "pmma_cad_provisional",
		pmma: "pmma_cad_provisional",
		titanium_custom_abutment: "titanium_grade_5",
		titanium: "titanium_grade_5",
		composite_lab_nanohybrid: "composite_lab_nanohybrid",
		peek_biohpp: "peek_biohpp",
		resin_3d_surgical_guide: "resin_3d_surgical_guide",
		resin_3d_splint_biocompatible: "resin_3d_splint_biocompatible",
	};
	return map[lower] || "zirconia_multilayer_gradient";
}

export async function executeSaveLabOrder(params: SaveLabOrderParams): Promise<void> {
	const {
		initialOrder,
		effectivePatientId,
		formPatientName,
		formDoctorId,
		formDoctorName,
		patientChartNumber,
		selectedTeeth,
		jawScope,
		constructionType,
		material,
		impressionType,
		finalShade,
		shadeSystem,
		shadeCervical,
		shadeBody,
		shadeIncisal,
		shadeStump,
		translucency,
		mamelons,
		calcifications,
		opalescence,
		occlusalScheme,
		contactTightness,
		surfaceTexture,
		cementGapMicrons,
		currentStage,
		dueDate,
		scheduledVisitDate,
		frameworkTrialDate,
		ceramicTrialDate,
		clinicalNotes,
		effectiveOverride,
		totalLabPriceRub,
		attachedImageUrl,
		treatmentPlanId,
		stageId,
		stageNumber,
		stageTitle,
		includeImpressionBilling,
		clinicSharePct,
		doctorSharePct,
		doctorAmountRub,
		fittingCollision,
		gostOrderNumber,
		onOrderSaved,
		onSaveOrder,
		onClose,
	} = params;

	let toothFdiStr: string;
	if (jawScope) {
		toothFdiStr = formatJawScopeLabel(jawScope);
	} else if (selectedTeeth.length > 0) {
		toothFdiStr = selectedTeeth.join(", ");
	} else {
		toothFdiStr = "Общий наряд / Челюсть целиком";
	}

	const comprehensiveNotes = [
		initialOrder?.isWarrantyRework ? "ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 РУБ ДЛЯ ПАЦИЕНТА)" : null,
		initialOrder?.reworkReason ? `Причина рекламации: ${initialOrder.reworkReason}` : null,
		initialOrder?.originalOrderNumber ? `Исходный наряд ЗТЛ: № ${initialOrder.originalOrderNumber}` : null,
		patientChartNumber ? `№ Медкарты: ${patientChartNumber}` : null,
		jawScope ? `Наряд на челюсть: ${formatJawScopeLabel(jawScope)}` : null,
		clinicalNotes.trim(),
		`Оттискная масса / Скан: ${impressionType}`,
		`Конструкция: ${CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}`,
		`Цветовые зоны: Пришейка ${shadeCervical}, Тело ${shadeBody}, Режущий край ${shadeIncisal}`,
		shadeStump ? `Культя: ${shadeStump}` : null,
		`Транслюцентность: ${translucency}`,
		mamelons ? "Эффект мамелонов" : null,
		"Окклюзия / Прикус: В привычной окклюзии (по силиконовому регистрату / шаблону)",
		"Анатомия: Естественная анатомическая форма зуба",
		frameworkTrialDate ? `Примерка каркаса: ${frameworkTrialDate}` : null,
		ceramicTrialDate ? `Примерка керамики: ${ceramicTrialDate}` : null,
		effectiveOverride?.authorized
			? `Клиническое решение лечащего врача: отправка наряда в ЗТЛ согласована (${effectiveOverride.doctorName})`
			: null,
	]
		.filter(Boolean)
		.join("\n* ");

	const payload = {
		patientId: effectivePatientId,
		doctorId: formDoctorId || null,
		toothFdi: toothFdiStr,
		jawScope: jawScope || undefined,
		material: LAB_MATERIALS.find((m) => m.id === material)?.name || material,
		colorVita: finalShade,
		dueDate: dueDate ? new Date(dueDate).toISOString() : null,
		clinicalNotes: `* ${comprehensiveNotes}`,
		priceRub: totalLabPriceRub,
		attachedImageUrl: attachedImageUrl || null,
	};

	const isExistingOrder = Boolean(
		initialOrder?.id &&
		!initialOrder.id.startsWith("LAB-") &&
		!initialOrder.id.startsWith("TEMP-") &&
		!initialOrder.id.startsWith("live-ztl-") &&
		/^[0-9a-fA-F-]{36}$/.test(initialOrder.id)
	);

	const url = isExistingOrder
		? `/api/clinical/lab-orders/${initialOrder!.id}`
		: "/api/clinical/lab-orders";
	const method = isExistingOrder ? "PUT" : "POST";

	const res = await fetch(url, {
		method,
		headers: {
			"Content-Type": "application/json",
			...denteAdminSecretRequestHeaders(),
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const errData = await res.json().catch(() => ({}));
		throw new Error(errData.message || "Не удалось сохранить заказ ЗТЛ");
	}

	const savedOrder = await res.json();

	if (method === "POST" && savedOrder?.id && selectedTeeth.length > 0) {
		const itemErrors: number[] = [];
		for (const tooth of selectedTeeth) {
			try {
				const itemRes = await fetch(
					`/api/clinical/lab-orders/${savedOrder.id}/items`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							toothFdi: tooth,
							restorationType: mapConstructionTypeToRestorationType(constructionType),
							material: mapMaterialToRestorationMaterial(material),
							shadeFinal: finalShade,
							shadeStump: shadeStump || null,
							translucencyLevel: translucency,
							cementGapMicrons,
							priceRub: totalLabPriceRub / selectedTeeth.length,
						}),
					},
				);
				if (!itemRes.ok) {
					itemErrors.push(tooth);
				}
			} catch {
				itemErrors.push(tooth);
			}
		}
		if (itemErrors.length > 0) {
			showToast(
				`Внимание: часть позиций не удалось привязать (зубы ${itemErrors.join(", ")})`,
				"warning",
			);
		}
	}

	showToast(
		initialOrder?.id
			? "Наряд ЗТЛ успешно обновлен"
			: "Наряд-заказ в зуботехническую лабораторию успешно оформлен!",
		"success",
	);

	const resultData: DentalLabOrderData = {
		...savedOrder,
		selectedTeeth,
		jawScope,
		constructionType,
		material,
		impressionType,
		colorVita: finalShade,
		shadeSystem,
		shadeCervical,
		shadeBody,
		shadeIncisal,
		shadeStump,
		translucency,
		mamelons,
		calcifications,
		opalescence,
		occlusalScheme,
		contactTightness,
		surfaceTexture,
		cementGapMicrons,
		currentStage,
		frameworkTrialDate,
		ceramicTrialDate,
		dueDate,
		scheduledVisitDate: scheduledVisitDate || undefined,
		fittingCollisionWarning: fittingCollision.hasCollision ? (fittingCollision.warningRu ?? undefined) : undefined,
		clinicSharePct,
		doctorSharePct,
		doctorDeductionRub: doctorAmountRub,
		attachedImageUrl: attachedImageUrl || null,
		treatmentPlanId,
		stageId,
		stageNumber,
		stageTitle,
		includeImpressionBilling,
	};

	if (onOrderSaved) {
		onOrderSaved(resultData);
	}
	if (onSaveOrder) {
		onSaveOrder(resultData);
	}

	// 1. Dispatch custom event for reactive CRM synchronization
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente-lab-order-created", { detail: resultData }),
		);
	}

	// 2. 1-Click Chairside Auto-Booking of Fitting Appointment in Doctor Schedule
	const effectiveFittingDate =
		scheduledVisitDate ||
		ceramicTrialDate ||
		(dueDate ? addWorkingDays(new Date(dueDate), 1).toISOString().slice(0, 10) : "");

	if (effectiveFittingDate && typeof window !== "undefined") {
		const toothLabel =
			resultData.toothFdi ||
			(selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "11");
		const matTitle =
			LAB_MATERIALS.find((m) => m.id === material)?.name || material;
		const appointmentDraft = {
			patientId: effectivePatientId,
			patientName: formPatientName,
			patientPhone: "",
			doctorId: formDoctorId || "doc-current",
			doctorName: formDoctorName || "Врач-ортопед",
			serviceTitle: `Примерка и фиксация: ${matTitle} (зуб ${toothLabel})`,
			serviceCode: "A16.07.004", // Номенклатура 804н
			durationMinutes: 45,
			scheduledDate: effectiveFittingDate,
			targetDate: effectiveFittingDate,
			stageKind: "stage_3_orthopedics",
			orderNumber: gostOrderNumber,
			notes: `Автобронь примерки из ЗТЛ № ${gostOrderNumber} (${matTitle}, зуб ${toothLabel}, цвет ${finalShade}). Дедлайн ЗТЛ: ${dueDate || "—"}.`,
		};

		try {
			window.localStorage.setItem(
				"dente_schedule_quick_booking_draft",
				JSON.stringify(appointmentDraft),
			);
			window.dispatchEvent(
				new CustomEvent("dente-quick-appointment-draft", {
					detail: appointmentDraft,
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-open-quick-booking", {
					detail: appointmentDraft,
				}),
			);
		} catch {
			// quota fallback
		}
	}

	onClose();
}

export function formatDisplayDate(dStr?: string | null): string {
	if (!dStr) return "";
	try {
		const parsed = new Date(dStr);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toLocaleDateString("ru-RU");
		}
	} catch (err: unknown) {
		console.warn("[DentalLabOrderModal] Failed to format date:", dStr, err);
	}
	return dStr;
}

export function copyLabOrderZtl1Protocol({
	gostOrderNumber,
	formPatientName,
	patientId,
	formDoctorName,
	doctorId,
	constructionType,
	material,
	shadeClassical,
	shade3dMaster,
	shadeBleach,
	selectedTeeth,
	impressionType,
	dueDate,
	currentStage,
	totalLabPriceRub,
	clinicalNotes,
}: {
	gostOrderNumber: string;
	formPatientName: string;
	patientId?: string | null | undefined;
	formDoctorName: string;
	doctorId?: string | null | undefined;
	constructionType: string;
	material: string;
	shadeClassical: string;
	shade3dMaster: string;
	shadeBleach: string;
	selectedTeeth: number[];
	impressionType: string;
	dueDate: string;
	currentStage: string;
	totalLabPriceRub: number;
	clinicalNotes: string;
}): void {
	try {
		const safeWorkType = (constructionType as any) || "single_crown";
		const safeMaterial = (material as any) || "zirconia_multilayer";
		const synthOrder: any = {
			id: gostOrderNumber,
			clinicId: "clinic-default",
			patientId: patientId || "pat-default",
			patientFullName: formPatientName || "Пациент",
			doctorId: doctorId || "doc-default",
			doctorFullName: formDoctorName || "Лечащий врач-ортопед",
			labId: "lab-primary",
			labName: "Зуботехническая лаборатория DENTE",
			workType: safeWorkType,
			material: safeMaterial,
			shade: (shadeClassical || shade3dMaster || shadeBleach || "A2") as any,
			toothNumbers: selectedTeeth && selectedTeeth.length > 0 ? selectedTeeth : [11],
			antagonistInfo: "В центральной окклюзии",
			impressionType: (impressionType as any) || "digital_intraoral_scan",
			sentDate: new Date().toISOString().split("T")[0]!,
			expectedDate: dueDate || new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0]!,
			status: (currentStage as any) || "sent_to_lab",
			stages: [],
			labCostKopecks: rublesToKopecks(totalLabPriceRub || 0),
			isWarrantyRework: currentStage === "correction_remake",
			warrantyMonths: 12,
			notes: clinicalNotes || undefined,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const protocolText = formatLabOrderFormZtl1A4Protocol(synthOrder, "Стоматологическая клиника DENTE");
		navigator.clipboard.writeText(protocolText);
		showToast("Протокол наряда скопирован в буфер", "success");
	} catch (_e) {
		showToast("Не удалось скопировать протокол наряда", "error");
	}
}

export async function copyLabOrderMessengerSummary({
	clinicName,
	clinicPhone,
	gostOrderNumber,
	formPatientName,
	formDoctorName,
	jawScope,
	selectedTeeth,
	constructionType,
	material,
	finalShade,
	dueDate,
	frameworkTrialDate,
	ceramicTrialDate,
	clinicalNotes,
}: {
	clinicName: string;
	clinicPhone: string;
	gostOrderNumber: string;
	formPatientName: string;
	formDoctorName: string;
	jawScope: JawScope | null;
	selectedTeeth: number[];
	constructionType: string;
	material: string;
	finalShade: string;
	dueDate: string;
	frameworkTrialDate: string;
	ceramicTrialDate: string;
	clinicalNotes: string;
}): Promise<void> {
	let teethOrJaw: string;
	if (jawScope) {
		teethOrJaw = formatJawScopeLabel(jawScope);
	} else if (selectedTeeth.length > 0) {
		teethOrJaw = selectedTeeth.join(", ");
	} else {
		teethOrJaw = "Общий наряд / Челюсть целиком";
	}

	const constructionTypeTitle =
		CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType;
	const materialTitle =
		LAB_MATERIALS.find((m) => m.id === material)?.name || material;

	const text = buildLabOrderMessengerSummary({
		clinicName: clinicName || "Денте",
		clinicPhone: clinicPhone || "",
		gostOrderNumber,
		patientName: formPatientName,
		doctorName: formDoctorName,
		teethOrJaw,
		constructionTypeTitle,
		materialTitle,
		shade: finalShade,
		dueDate: dueDate ? formatDisplayDate(dueDate) : "Не указан",
		frameworkTrialDate: frameworkTrialDate ? formatDisplayDate(frameworkTrialDate) : undefined,
		ceramicTrialDate: ceramicTrialDate ? formatDisplayDate(ceramicTrialDate) : undefined,
		clinicalNotes: clinicalNotes.trim() || undefined,
	});

	try {
		if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
			await navigator.clipboard.writeText(text);
		}
		showToast("Выжимка наряда скопирована для отправки курьеру/технику в мессенджер", "success");
	} catch {
		showToast("Не удалось скопировать выжимку наряда в буфер", "error");
	}
}
