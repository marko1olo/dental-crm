/**
 * apps/web/src/components/treatment-plans/useTreatmentPlanTeeth.ts
 *
 * Real end-to-end tooth data sync for Treatment Plan module:
 * - Hydrates teeth from local odontogram cache when props.teethData is empty.
 * - Listens for 'dente-odontogram-update' CustomEvent for real-time reactivity.
 * - Strict parity with Mandates 8e, 8k, 8n (Zero Mocks, Real Patient Teeth).
 */

import { useState, useEffect } from "react";
import type { ToothData } from "./types";
import { loadStoredTeethData } from "../odontogram/odontogramStorage";

export function useTreatmentPlanTeeth(
	patientId: string,
	teethData: readonly ToothData[],
): readonly ToothData[] {
	const [liveTeethData, setLiveTeethData] = useState<readonly ToothData[]>(() => {
		if (teethData && teethData.length > 0) return teethData;
		if (patientId) {
			const stored = loadStoredTeethData(patientId);
			if (stored && stored.length > 0) return stored;
		}
		return teethData || [];
	});

	useEffect(() => {
		if (teethData && teethData.length > 0) {
			setLiveTeethData(teethData);
		} else if (patientId) {
			const stored = loadStoredTeethData(patientId);
			if (stored && stored.length > 0) {
				setLiveTeethData(stored);
			}
		}
	}, [teethData, patientId]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleOdontogramUpdate = (e: Event) => {
			const customEvt = e as CustomEvent<{
				patientId?: string;
				teethData?: ToothData[];
				teeth?: ToothData[];
			}>;
			if (!customEvt.detail) return;
			if (customEvt.detail.patientId && customEvt.detail.patientId !== patientId) return;
			const incoming = customEvt.detail.teethData || customEvt.detail.teeth;
			if (incoming && Array.isArray(incoming) && incoming.length > 0) {
				setLiveTeethData(incoming);
			} else if (patientId) {
				const stored = loadStoredTeethData(patientId);
				if (stored && stored.length > 0) {
					setLiveTeethData(stored);
				}
			}
		};
		window.addEventListener("dente-odontogram-update", handleOdontogramUpdate);
		return () => {
			window.removeEventListener("dente-odontogram-update", handleOdontogramUpdate);
		};
	}, [patientId]);

	return liveTeethData;
}
