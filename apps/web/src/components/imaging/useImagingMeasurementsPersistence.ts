import { useEffect, useRef, useState } from "react";
import type { ViewerRulerMeasurement } from "./types";

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

	// 1. Hydrate measurements and session state on study change
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
				const res = await fetch(`/api/imaging/studies/${studyId}/measurements`, { headers });
				if (res.ok && !isCancelled) {
					const data = await res.json();
					if (Array.isArray(data) && data.length > 0) {
						const loadedMeasurements: ViewerRulerMeasurement[] = data.map((item: any) => {
							const coords = item.coordinates || {};
							const measures = item.measurements || {};
							return {
								id: item.id || `m_${Math.random().toString(36).substring(2, 9)}`,
								startX: Number(coords.startX ?? coords.start?.x ?? 0),
								startY: Number(coords.startY ?? coords.start?.y ?? 0),
								endX: Number(coords.endX ?? coords.end?.x ?? 0),
								endY: Number(coords.endY ?? coords.end?.y ?? 0),
								lengthMm: Number(measures.lengthMm ?? measures.distanceMm ?? measures.value ?? 0),
								distanceMm: Number(measures.distanceMm ?? measures.lengthMm ?? measures.value ?? 0),
								label: item.notes || (item.toothCode ? `Зуб ${item.toothCode}` : undefined),
							};
						});
						setRulerMeasurements(loadedMeasurements);
						lastSavedMeasurementsHashRef.current = JSON.stringify(loadedMeasurements);
					} else {
						setRulerMeasurements([]);
						lastSavedMeasurementsHashRef.current = "[]";
					}
				}

				const sessionRes = await fetch(`/api/imaging/studies/${studyId}/viewer-session`, { headers });
				if (sessionRes.ok && !isCancelled) {
					const sessionData = await sessionRes.json();
					const sessState = sessionData.session?.state;
					if (sessState && setImagingViewerState) {
						setImagingViewerState((prev: any) => ({
							...prev,
							brightness: sessState.brightness ?? prev?.brightness ?? 1,
							contrast: sessState.contrast ?? prev?.contrast ?? 1,
							inverted: sessState.inverted ?? prev?.inverted ?? false,
							rotation: sessState.rotationDeg ?? prev?.rotation ?? 0,
							flipHorizontal: sessState.flipHorizontal ?? prev?.flipHorizontal ?? false,
							zoom: sessState.zoom ?? prev?.zoom ?? 1,
							pan: { x: sessState.panX ?? prev?.pan?.x ?? 0, y: sessState.panY ?? prev?.pan?.y ?? 0 },
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

		return () => {
			isCancelled = true;
		};
	}, [selectedImagingStudy?.id, auth, setImagingViewerState]);

	// 2. Debounced auto-save of measurements when ruler changes
	useEffect(() => {
		const studyId = selectedImagingStudy?.id;
		if (!studyId || isHydratingMeasurements) return;

		const currentHash = JSON.stringify(rulerMeasurements);
		if (currentHash === lastSavedMeasurementsHashRef.current) return;

		const timeoutId = setTimeout(async () => {
			try {
				const headers = auth?.denteClinicalMutationHeaders ? auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}) : { "Content-Type": "application/json" };

				const payload = {
					measurements: rulerMeasurements.map((m) => ({
						id: m.id,
						toothCode: selectedImagingStudy.toothCode ?? null,
						annotationType: "distance",
						coordinates: {
							startX: m.startX,
							startY: m.startY,
							endX: m.endX,
							endY: m.endY,
						},
						measurements: {
							lengthMm: m.lengthMm,
							distanceMm: m.distanceMm ?? m.lengthMm,
						},
						notes: m.label ?? null,
					})),
				};

				const res = await fetch(`/api/imaging/studies/${studyId}/measurements`, {
					method: "PUT",
					headers,
					body: JSON.stringify(payload),
				});

				if (res.ok) {
					lastSavedMeasurementsHashRef.current = currentHash;
				}
			} catch (err) {
				console.warn("Failed to auto-save imaging measurements", err);
			}
		}, 600);

		return () => clearTimeout(timeoutId);
	}, [rulerMeasurements, selectedImagingStudy?.id, selectedImagingStudy?.toothCode, isHydratingMeasurements, auth]);

	return { rulerMeasurements, setRulerMeasurements, isHydratingMeasurements };
}
