/**
 * useImagingMeasurementsPersistence.ts — Хук сохранения и гидратации замеров линейки
 * Mandate 8b: строго <= 120 строк.
 */

import { useEffect, useRef, useState } from "react";
import type { ViewerRulerMeasurement } from "./types.js";
import {
	fetchStudyMeasurementsAndSession,
	saveStudyMeasurements,
} from "./persistence/imagingMeasurementsApi.js";

export interface UseImagingMeasurementsPersistenceOptions {
	selectedImagingStudy: any;
	auth: any;
	setImagingViewerState?: any;
}

export function useImagingMeasurementsPersistence({
	selectedImagingStudy,
	auth,
	setImagingViewerState,
}: UseImagingMeasurementsPersistenceOptions) {
	const [rulerMeasurements, setRulerMeasurements] = useState<ViewerRulerMeasurement[]>([]);
	const [isHydratingMeasurements, setIsHydratingMeasurements] = useState(false);
	const lastSavedMeasurementsHashRef = useRef<string>("");

	useEffect(() => {
		const studyId = selectedImagingStudy?.id;
		if (!studyId) {
			setRulerMeasurements([]);
			lastSavedMeasurementsHashRef.current = "";
			return;
		}

		let isCancelled = false;
		setIsHydratingMeasurements(true);

		const hydrate = async () => {
			try {
				const headers = auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {};
				const { measurements, sessionState } = await fetchStudyMeasurementsAndSession(studyId, headers);
				if (!isCancelled) {
					setRulerMeasurements(measurements);
					lastSavedMeasurementsHashRef.current = JSON.stringify(measurements);
					if (sessionState && setImagingViewerState) {
						setImagingViewerState((prev: any) => ({
							...prev,
							brightness: sessionState.brightness ?? prev?.brightness ?? 1,
							contrast: sessionState.contrast ?? prev?.contrast ?? 1,
							inverted: sessionState.inverted ?? prev?.inverted ?? false,
							rotation: sessionState.rotationDeg ?? prev?.rotation ?? 0,
							flipHorizontal: sessionState.flipHorizontal ?? prev?.flipHorizontal ?? false,
							zoom: sessionState.zoom ?? prev?.zoom ?? 1,
							pan: { x: sessionState.panX ?? prev?.pan?.x ?? 0, y: sessionState.panY ?? prev?.pan?.y ?? 0 },
						}));
					}
				}
			} catch (err) {
				console.warn("Failed to hydrate imaging measurements / viewer session", err);
			} finally {
				if (!isCancelled) setIsHydratingMeasurements(false);
			}
		};

		void hydrate();
		return () => { isCancelled = true; };
	}, [selectedImagingStudy?.id, auth, setImagingViewerState]);

	useEffect(() => {
		const studyId = selectedImagingStudy?.id;
		if (!studyId || isHydratingMeasurements) return;

		const currentHash = JSON.stringify(rulerMeasurements);
		if (currentHash === lastSavedMeasurementsHashRef.current) return;

		const timeoutId = setTimeout(async () => {
			try {
				const headers = auth?.denteClinicalMutationHeaders
					? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" })
					: { "Content-Type": "application/json" };
				const ok = await saveStudyMeasurements(studyId, selectedImagingStudy.toothCode, rulerMeasurements, headers);
				if (ok) lastSavedMeasurementsHashRef.current = currentHash;
			} catch (err) {
				console.warn("Failed to auto-save imaging measurements", err);
			}
		}, 600);

		return () => clearTimeout(timeoutId);
	}, [rulerMeasurements, selectedImagingStudy?.id, selectedImagingStudy?.toothCode, isHydratingMeasurements, auth]);

	return { rulerMeasurements, setRulerMeasurements, isHydratingMeasurements };
}
