import { createExpressLabOrder, exportPlanToCashier } from "../../treatmentPlanNetworkSync.js";
import type { LabOrderPrefillContext, PlanPersistenceAndSyncContext } from "../types.js";

export function createPlanLabAndCashierHandlers(ctx: PlanPersistenceAndSyncContext) {
	const {
		patientId, patientName, patientPhone, auth, stages, currentTier,
		loyaltyDeduction, orthopedicTeeth, currentPlanId, onExportToCashier,
		onPlanSaved, setSelectedLabTeeth, setLabOrderPrefill, setIsLabOrderModalOpen, setCurrentPlanId,
	} = ctx;

	const handleOpenLabOrder = (
		teethOrContext?: number[] | LabOrderPrefillContext,
		maybeContext?: LabOrderPrefillContext,
	) => {
		let context: LabOrderPrefillContext = {};
		if (Array.isArray(teethOrContext)) {
			context = { ...maybeContext, selectedTeeth: teethOrContext };
		} else if (teethOrContext && typeof teethOrContext === "object") {
			context = teethOrContext;
		} else if (maybeContext) {
			context = maybeContext;
		}

		const resolvedTeeth =
			context.selectedTeeth && context.selectedTeeth.length > 0
				? [...context.selectedTeeth]
				: orthopedicTeeth;

		setSelectedLabTeeth(resolvedTeeth);
		setLabOrderPrefill({ ...context, selectedTeeth: resolvedTeeth });
		setIsLabOrderModalOpen(true);
	};

	const handleOneClickLabOrder = async (teeth?: number[]) => {
		const targetTeeth = teeth && teeth.length > 0 ? teeth : orthopedicTeeth;
		await createExpressLabOrder({
			patientId,
			doctorId: auth?.currentUser?.id || null,
			targetTeeth,
			currentTierTitle: currentTier.title,
		});
	};

	const handleExportCashier = async () => {
		await exportPlanToCashier({
			patientId,
			patientName,
			patientPhone,
			doctorName: auth?.currentUser?.name || "Лечащий врач-стоматолог",
			currentPlanId,
			stages,
			currentTier,
			loyaltyDeduction,
			onExportToCashier,
			onPlanSaved: (newId: string) => {
				setCurrentPlanId(newId);
				onPlanSaved?.(newId);
			},
		});
	};

	return { handleOpenLabOrder, handleOneClickLabOrder, handleExportCashier };
}
