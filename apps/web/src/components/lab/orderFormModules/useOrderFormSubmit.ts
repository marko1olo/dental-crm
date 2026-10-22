import type React from "react";
import { useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { createDoctorClinicalOverride } from "../dentalLabFinancialGateEngine";
import {
	executeSaveLabOrder,
	copyLabOrderZtl1Protocol,
	copyLabOrderMessengerSummary,
} from "../dentalLabOrderSaveHelper";
import type { OrderFormSubmitContext } from "./orderFormSubmitTypes";

export type { OrderFormSubmitContext };

export function useOrderFormSubmit(ctx: OrderFormSubmitContext) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const inFlightRef = useRef(false);

	const handleSaveOrder = async (e?: React.FormEvent, forceSaveWithOverride = false) => {
		if (e) e.preventDefault();
		if (inFlightRef.current) return;
		inFlightRef.current = true;

		const effectivePatientId = ctx.formPatientId.trim() || (ctx.patientId ? ctx.patientId.trim() : `pat-solo-${Date.now()}`);
		const isWarrantyOrder = Boolean(ctx.initialOrder?.isWarrantyRework || ctx.totalLabPriceRub === 0 || Number(ctx.priceRubInput) === 0);
		let effectiveOverride = ctx.gateOverride;
		if (!ctx.skipFinancialGate && !forceSaveWithOverride && !ctx.financialGateResult.isGatePassed && !isWarrantyOrder && !effectiveOverride) {
			effectiveOverride = createDoctorClinicalOverride(
				ctx.formDoctorName || ctx.chiefDoctorName || "Лечащий врач",
				"Отправка наряда в ЗТЛ — клиническое решение лечащего врача (Автономия врача)",
			);
			ctx.setGateOverride(effectiveOverride);
		}

		setIsSubmitting(true);
		try {
			const finalShade = ctx.shadeSystem === "3d_master" ? ctx.shade3dMaster : ctx.shadeSystem === "bleach" ? ctx.shadeBleach : ctx.shadeClassical;
			await executeSaveLabOrder({ ...ctx, effectivePatientId, effectiveOverride, finalShade });
		} catch (err: any) {
			showToast(err.message || "Ошибка сохранения наряда ЗТЛ", "error");
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	const handlePrint = () => window.print();

	const handleCopyZtl1Protocol = () => {
		copyLabOrderZtl1Protocol({
			gostOrderNumber: ctx.gostOrderNumber, formPatientName: ctx.formPatientName, patientId: ctx.patientId,
			formDoctorName: ctx.formDoctorName, doctorId: ctx.formDoctorId, constructionType: ctx.constructionType,
			material: ctx.material, shadeClassical: ctx.shadeClassical, shade3dMaster: ctx.shade3dMaster,
			shadeBleach: ctx.shadeBleach, selectedTeeth: ctx.selectedTeeth, impressionType: ctx.impressionType,
			dueDate: ctx.dueDate, currentStage: ctx.currentStage, totalLabPriceRub: ctx.totalLabPriceRub,
			clinicalNotes: ctx.clinicalNotes,
		});
	};

	const handleCopyMessengerSummary = async () => {
		const finalShade = ctx.shadeSystem === "3d_master" ? ctx.shade3dMaster : ctx.shadeSystem === "bleach" ? ctx.shadeBleach : ctx.shadeClassical;
		await copyLabOrderMessengerSummary({
			clinicName: ctx.clinicName || "Денте", clinicPhone: ctx.clinicPhone || "",
			gostOrderNumber: ctx.gostOrderNumber, formPatientName: ctx.formPatientName,
			formDoctorName: ctx.formDoctorName, jawScope: ctx.jawScope, selectedTeeth: ctx.selectedTeeth,
			constructionType: ctx.constructionType, material: ctx.material, finalShade,
			dueDate: ctx.dueDate, frameworkTrialDate: ctx.frameworkTrialDate, ceramicTrialDate: ctx.ceramicTrialDate,
			clinicalNotes: ctx.clinicalNotes,
		});
	};

	return { isSubmitting, handleSaveOrder, handlePrint, handleCopyZtl1Protocol, handleCopyMessengerSummary };
}
