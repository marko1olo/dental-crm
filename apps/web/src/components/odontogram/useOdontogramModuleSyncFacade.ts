import { useEffect, useMemo, useRef, useState } from "react";
import { calculateLiveInvoiceItems } from "./OdontogramLiveInvoice";
import { useOdontogramModulePatientSafety } from "./useOdontogramModulePatientSafety";
import { useOdontogramQuickActions } from "./useOdontogramQuickActions";
import { useOdontogramSync } from "./useOdontogramSync";

export interface UseOdontogramModuleSyncFacadeParams {
	readonly patientId: string;
	readonly pediatricMode?: boolean | undefined;
	readonly propDentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	readonly activePatient: any;
	readonly activeDoctor: any;
	readonly onClearMenu: () => void;
}

export function useOdontogramModuleSyncFacade({
	patientId,
	pediatricMode,
	propDentitionMode,
	activePatient,
	activeDoctor,
	onClearMenu,
}: UseOdontogramModuleSyncFacadeParams) {
	const safety = useOdontogramModulePatientSafety(
		activePatient,
		propDentitionMode,
		pediatricMode,
	);
	const sync = useOdontogramSync({
		patientId,
		pediatricMode: safety.initialSmartMode === "pediatric",
		onClearMenu,
	});

	const [dentitionMode, setDentitionMode] = useState<
		"adult" | "pediatric" | "mixed"
	>(safety.initialSmartMode);
	const isPediatricMode =
		dentitionMode === "pediatric" || dentitionMode === "mixed";

	useEffect(() => {
		if (propDentitionMode) setDentitionMode(propDentitionMode);
	}, [propDentitionMode]);

	const lastPatientIdRef = useRef(patientId);
	useEffect(() => {
		if (lastPatientIdRef.current !== patientId) {
			lastPatientIdRef.current = patientId;
			setDentitionMode(safety.initialSmartMode);
		}
	}, [patientId, safety.initialSmartMode]);

	const liveInvoiceItems = useMemo(
		() => calculateLiveInvoiceItems(sync.teethData),
		[sync.teethData],
	);
	const liveGrossTotalRub = useMemo(
		() => liveInvoiceItems.reduce((acc, it) => acc + it.price * it.quantity, 0),
		[liveInvoiceItems],
	);

	const quickActions = useOdontogramQuickActions({
		patientId,
		activeDoctor,
		isPediatricMode,
		dentitionMode,
		teethData: sync.teethData,
		teethDataRef: sync.teethDataRef,
		updateToothState: sync.updateToothState,
	});

	return {
		sync,
		safety,
		dentitionMode,
		setDentitionMode,
		isPediatricMode,
		liveGrossTotalRub,
		quickActions,
	};
}
