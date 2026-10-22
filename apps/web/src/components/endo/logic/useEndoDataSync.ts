import { useEffect } from "react";
import type { EndoCanalData } from "@dental/shared";
import { getDefaultCanalsForTooth } from "../endoCanalConstants";
import { loadPersistedEndoCanals } from "../../radiology/endoClinicalIntegrationBridge";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { useEndoListeners } from "./useEndoListeners";

interface UseEndoDataSyncProps {
	readonly isOpen: boolean;
	readonly activeTooth: number;
	readonly toothNumber: number;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly setCanals: React.Dispatch<React.SetStateAction<EndoCanalData[]>>;
	readonly setIrrigation: React.Dispatch<React.SetStateAction<string>>;
	readonly setRotarySystem: React.Dispatch<React.SetStateAction<string>>;
	readonly setRadiologyControl: React.Dispatch<React.SetStateAction<string>>;
	readonly setIsLoadingFromDb: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onClose: () => void;
}

export function useEndoDataSync({
	isOpen,
	activeTooth,
	toothNumber,
	patientId,
	initialCanals,
	initialIrrigation,
	initialRotarySystem,
	initialRadiologyControl,
	setCanals,
	setIrrigation,
	setRotarySystem,
	setRadiologyControl,
	setIsLoadingFromDb,
	onClose,
}: UseEndoDataSyncProps) {
	useEndoListeners({ isOpen, activeTooth, setCanals, onClose });

	useEffect(() => {
		if (!isOpen) return;
		if (initialCanals && initialCanals.length > 0 && activeTooth === toothNumber) {
			setCanals(initialCanals.map((c) => ({ ...c })));
			if (initialIrrigation) setIrrigation(initialIrrigation);
			if (initialRotarySystem) setRotarySystem(initialRotarySystem);
			if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
			return;
		}

		if (patientId) {
			let cancelled = false;
			setIsLoadingFromDb(true);
			fetch(`/api/patients/${patientId}/tooth-states/${activeTooth}/endo`, {
				headers: denteAdminSecretRequestHeaders(),
			})
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (cancelled) return;
					if (data?.success && data?.clinicalData?.canals && Array.isArray(data.clinicalData.canals) && data.clinicalData.canals.length > 0) {
						setCanals(data.clinicalData.canals.map((c: EndoCanalData) => ({ ...c })));
						if (data.clinicalData.irrigation) setIrrigation(data.clinicalData.irrigation);
						if (data.clinicalData.rotarySystem) setRotarySystem(data.clinicalData.rotarySystem);
						if (data.clinicalData.radiologyControl) setRadiologyControl(data.clinicalData.radiologyControl);
					} else {
						const cbctCanals = loadPersistedEndoCanals(patientId, activeTooth);
						setCanals(cbctCanals && cbctCanals.length > 0 ? cbctCanals.map((c) => ({ ...c })) : getDefaultCanalsForTooth(activeTooth));
					}
				})
				.catch(() => {
					if (!cancelled) {
						const cbctCanals = loadPersistedEndoCanals(patientId, activeTooth);
						setCanals(cbctCanals && cbctCanals.length > 0 ? cbctCanals.map((c) => ({ ...c })) : getDefaultCanalsForTooth(activeTooth));
					}
				})
				.finally(() => {
					if (!cancelled) setIsLoadingFromDb(false);
				});
			return () => { cancelled = true; };
		}

		const cbctCanals = loadPersistedEndoCanals(patientId, activeTooth);
		setCanals(cbctCanals && cbctCanals.length > 0 ? cbctCanals.map((c) => ({ ...c })) : getDefaultCanalsForTooth(activeTooth));
		if (initialIrrigation) setIrrigation(initialIrrigation);
		if (initialRotarySystem) setRotarySystem(initialRotarySystem);
		if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
	}, [isOpen, activeTooth, toothNumber, initialCanals, initialIrrigation, initialRotarySystem, initialRadiologyControl, patientId]);
}
