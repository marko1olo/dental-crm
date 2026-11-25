/**
 * useImagingMeasurementsPersistence.ts — Хук сохранения и гидратации замеров линейки
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useEffect, useRef, useState } from "react";
import { clientLogger } from "../../services/logging/clientLogger.js";
import type { ImagingStudy, ImagingViewerState, ViewerRulerMeasurement } from "./types.js";
import {
	fetchStudyMeasurementsAndSession,
	saveStudyMeasurements,
} from "./persistence/imagingMeasurementsApi.js";

export interface UseImagingMeasurementsPersistenceOptions {
	selectedImagingStudy?: ImagingStudy | null | undefined;
	auth?: {
		denteClinicalReadHeaders?: () => Record<string, string>;
		denteClinicalMutationHeaders?: (headers?: Record<string, string>) => Record<string, string>;
		[key: string]: unknown;
	} | null | undefined;
	setImagingViewerState?: React.Dispatch<React.SetStateAction<ImagingViewerState>> | undefined;
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
						setImagingViewerState((prev) => ({
							...prev,
							brightness: Number(sessionState.brightness ?? prev?.brightness ?? 1),
							contrast: Number(sessionState.contrast ?? prev?.contrast ?? 1),
							inverted: Boolean(sessionState.inverted ?? prev?.inverted ?? false),
							rotationDeg: Number(sessionState.rotationDeg ?? prev?.rotationDeg ?? 0),
							flipHorizontal: Boolean(sessionState.flipHorizontal ?? prev?.flipHorizontal ?? false),
							zoom: Number(sessionState.zoom ?? prev?.zoom ?? 1),
							pan: {
								x: Number(sessionState.panX ?? prev?.pan?.x ?? 0),
								y: Number(sessionState.panY ?? prev?.pan?.y ?? 0),
							},
						}));
					}
				}
			} catch (err) {
				clientLogger.warn("Failed to hydrate imaging measurements / viewer session", err, {
					module: "useImagingMeasurementsPersistence",
				});
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
				clientLogger.warn("Failed to auto-save imaging measurements", err, {
					module: "useImagingMeasurementsPersistence",
				});
			}
		}, 600);

		return () => clearTimeout(timeoutId);
	}, [rulerMeasurements, selectedImagingStudy?.id, selectedImagingStudy?.toothCode, isHydratingMeasurements, auth]);

	return { rulerMeasurements, setRulerMeasurements, isHydratingMeasurements };
}
