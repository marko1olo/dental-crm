import type { DentalLabOrderData } from "../labMath";
import type { SaveLabOrderParams } from "./labOrderSaveTypes";

export function buildSavedOrderResult(
	savedOrder: any,
	params: SaveLabOrderParams,
): DentalLabOrderData {
	return {
		...savedOrder,
		selectedTeeth: params.selectedTeeth,
		jawScope: params.jawScope,
		constructionType: params.constructionType,
		material: params.material,
		impressionType: params.impressionType,
		colorVita: params.finalShade,
		shadeSystem: params.shadeSystem,
		shadeCervical: params.shadeCervical,
		shadeBody: params.shadeBody,
		shadeIncisal: params.shadeIncisal,
		shadeStump: params.shadeStump,
		translucency: params.translucency,
		mamelons: params.mamelons,
		calcifications: params.calcifications,
		opalescence: params.opalescence,
		occlusalScheme: params.occlusalScheme,
		contactTightness: params.contactTightness,
		surfaceTexture: params.surfaceTexture,
		cementGapMicrons: params.cementGapMicrons,
		currentStage: params.currentStage,
		frameworkTrialDate: params.frameworkTrialDate,
		ceramicTrialDate: params.ceramicTrialDate,
		dueDate: params.dueDate,
		scheduledVisitDate: params.scheduledVisitDate || undefined,
		fittingCollisionWarning: params.fittingCollision.hasCollision
			? (params.fittingCollision.warningRu ?? undefined)
			: undefined,
		clinicSharePct: params.clinicSharePct,
		doctorSharePct: params.doctorSharePct,
		doctorDeductionRub: params.doctorAmountRub,
		attachedImageUrl: params.attachedImageUrl || null,
		treatmentPlanId: params.treatmentPlanId,
		stageId: params.stageId,
		stageNumber: params.stageNumber,
		stageTitle: params.stageTitle,
		includeImpressionBilling: params.includeImpressionBilling,
	};
}
