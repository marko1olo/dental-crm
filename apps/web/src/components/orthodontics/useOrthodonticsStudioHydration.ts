/**
 * @dental/web/components/orthodontics/useOrthodonticsStudioHydration.ts
 *
 * Честная гидратация данных пациента ортодонтической студии из PostgreSQL 18 и ТРГ-синхронизация.
 */

import { useEffect, useState } from "react";
import { createDefaultOrthoProtocolState, type AngleClass, type OrthoProtocolState, type VerticalBite } from "./orthodonticsCatalogData";
import { subscribeCephSyncChannel, getActiveCephStudy } from "./cephStudioSyncChannel";
import type { CephalometricSavedStudy } from "./cephalometricPersistence";

export interface OrthodonticsHydrationResult {
	cephStudy: CephalometricSavedStudy | null;
	setCephStudy: React.Dispatch<React.SetStateAction<CephalometricSavedStudy | null>>;
}

export interface RawCephMeasurement {
	id?: string;
	parameterKey?: string;
	parameter?: string;
	value?: number | null;
}

export function parseCephMeasurementsArray(
	measurements: RawCephMeasurement[],
): Record<string, number> {
	const vals: Record<string, number> = {};
	for (const m of measurements) {
		if (typeof m.value !== "number") continue;
		const rawId = m.id || m.parameterKey || m.parameter || "";
		if (!rawId) continue;
		if (rawId === "SNA") vals.sna = m.value;
		else if (rawId === "SNB") vals.snb = m.value;
		else if (rawId === "ANB") vals.anb = m.value;
		else if (rawId === "1-NA-Angle") vals.u1_na = m.value;
		else if (rawId === "1-NB-Angle") vals.l1_nb = m.value;
		else if (rawId === "FMA") vals.fma = m.value;
		else {
			const k = rawId.toLowerCase().replace(/[^a-z0-9]/g, "_");
			if (k) vals[k] = m.value;
		}
	}
	return vals;
}

export function useOrthodonticsStudioHydration(
	patientId: string | undefined,
	setProtocol: React.Dispatch<React.SetStateAction<OrthoProtocolState>>,
	onCephStudyLoaded?: ((study: CephalometricSavedStudy | null) => void) | undefined,
): OrthodonticsHydrationResult {
	const [cephStudy, setCephStudy] = useState<CephalometricSavedStudy | null>(null);

	// 1. Честная гидратация данных пациента из базы PostgreSQL 18 (Zero-Leak Draft: Mandates 8d/8zq, 8bn)
	useEffect(() => {
		if (!patientId) {
			setProtocol(createDefaultOrthoProtocolState());
			setCephStudy(null);
			onCephStudyLoaded?.(null);
			return;
		}

		// Немедленный сброс черновика при смене patientId во избежание утечки чужих клинических данных
		setProtocol(createDefaultOrthoProtocolState());
		setCephStudy(null);
		onCephStudyLoaded?.(null);
		let isCancelled = false;

		const fetchProgress = async () => {
			try {
				const res = await fetch(`/api/orthodontics/${patientId}/progress`, {
					headers: { Accept: "application/json" },
				});
				if (res.ok) {
					const data = (await res.json()) as {
						hasActiveTreatment?: boolean;
						currentAligner?: number;
						totalAligners?: number;
						currentStage?: number;
						archwire?: string;
						lastActionSummary?: string;
						applianceId?: string;
						applianceName?: string;
						applianceCategory?: "brackets" | "aligners" | "plate";
						selectedElasticId?: string | null;
						selectedActionIds?: string[];
						angleClass?: AngleClass;
						verticalBite?: VerticalBite;
						overjetMm?: number;
						overbitePercent?: number;
						anbAngle?: number;
						skeletalClass?: string;
						treatmentPlanId?: string;
					};
					if (!isCancelled) {
						if (!data || data.hasActiveTreatment === false) {
							// Пациент без активного лечения — гарантированный сброс на дефолтный чистый стейт
							setProtocol(createDefaultOrthoProtocolState());
						} else {
							setProtocol((prev) => ({
								...prev,
								...(data.applianceId ? { applianceId: data.applianceId } : {}),
								...(data.applianceName ? { applianceName: data.applianceName } : {}),
								...(data.applianceCategory ? { applianceCategory: data.applianceCategory } : {}),
								...(data.selectedElasticId !== undefined ? { selectedElasticId: data.selectedElasticId } : {}),
								...(Array.isArray(data.selectedActionIds) ? { selectedActionIds: data.selectedActionIds } : {}),
								...(data.angleClass ? { angleClass: data.angleClass } : {}),
								...(data.verticalBite ? { verticalBite: data.verticalBite } : {}),
								...(typeof data.overjetMm === "number" ? { overjetMm: data.overjetMm } : {}),
								...(typeof data.overbitePercent === "number" ? { overbitePercent: data.overbitePercent } : {}),
								...(data.treatmentPlanId ? { treatmentPlanId: data.treatmentPlanId } : {}),
								...(typeof data.anbAngle === "number"
									? {
											trgValues: {
												...(prev.trgValues || {}),
												anb: data.anbAngle,
											},
									  }
									: {}),
								...(data.currentAligner
									? {
											alignerTracking: {
												...prev.alignerTracking,
												currentStep: data.currentAligner,
												totalSteps: data.totalAligners ?? prev.alignerTracking.totalSteps,
											},
									  }
									: {}),
								...(data.currentStage ? { currentMonth: data.currentStage } : {}),
							}));
						}
					}
				} else if (res.status === 404 && !isCancelled) {
					setProtocol(createDefaultOrthoProtocolState());
				}
			} catch (err) {
				if (!isCancelled) {
					console.warn("[useOrthodonticsStudioHydration] Failed to fetch ortho progress:", err);
				}
			}
		};

		fetchProgress();
		return () => {
			isCancelled = true;
		};
	}, [patientId, setProtocol]);

	// 2. Честная гидратация ТРГ-анализа пациента из базы PostgreSQL 18 (DEF-ORTHO-03, DEF-ORTHO-FE-01)
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;

		const fetchCephAnalysis = async () => {
			try {
				const res = await fetch(`/api/orthodontics/${patientId}/ceph-analysis`, {
					headers: { Accept: "application/json" },
				});
				if (res.ok) {
					const data = (await res.json()) as {
						study?: CephalometricSavedStudy;
					};
					if (!isCancelled) {
						if (data?.study) {
							setCephStudy(data.study);
							onCephStudyLoaded?.(data.study);
						}
						if (data?.study?.analysis) {
							const ca = data.study.analysis;
							const extracted: Record<string, number> = {};

							if (Array.isArray(ca.measurements)) {
								Object.assign(extracted, parseCephMeasurementsArray(ca.measurements));
							}

							// Сохранение обратной совместимости на случай плоских свойств
							if (typeof ca.sna === "number") extracted.sna = ca.sna;
							if (typeof ca.snb === "number") extracted.snb = ca.snb;
							if (typeof ca.anb === "number") extracted.anb = ca.anb;
							if (typeof ca.u1NaDeg === "number") extracted.u1_na = ca.u1NaDeg;
							if (typeof ca.l1NbDeg === "number") extracted.l1_nb = ca.l1NbDeg;
							if (typeof ca.fmaDeg === "number") extracted.fma = ca.fmaDeg;

							if (Object.keys(extracted).length > 0) {
								setProtocol((prev) => ({
									...prev,
									trgValues: {
										...(prev.trgValues || {}),
										...extracted,
									},
								}));
							}
						}
					}
				}
			} catch (err) {
				if (!isCancelled) {
					console.warn("[useOrthodonticsStudioHydration] Failed to fetch ceph analysis:", err);
				}
			}
		};

		fetchCephAnalysis();
		return () => {
			isCancelled = true;
		};
	}, [patientId, setProtocol]);

	// 3. Реактивная синхронизация ТРГ через BroadcastChannel (DEF-ORTHO-SEV1-04: изоляция по patientId, DEF-ORTHO-FE-01)
	useEffect(() => {
		if (!patientId) return;

		const cachedStudy = getActiveCephStudy<{
			patientId?: string;
			analysis?: {
				sna?: number;
				snb?: number;
				anb?: number;
				u1NaDeg?: number;
				l1NbDeg?: number;
				fmaDeg?: number;
				measurements?: RawCephMeasurement[];
			};
			measurements?: RawCephMeasurement[];
		}>(patientId);

		if (cachedStudy) {
			setCephStudy(cachedStudy as unknown as CephalometricSavedStudy);
			onCephStudyLoaded?.(cachedStudy as unknown as CephalometricSavedStudy);
			const mList = cachedStudy.measurements || cachedStudy.analysis?.measurements;
			if (Array.isArray(mList) && mList.length > 0) {
				const vals = parseCephMeasurementsArray(mList);
				if (Object.keys(vals).length > 0) {
					setProtocol((prev) => ({
						...prev,
						trgValues: { ...(prev.trgValues || {}), ...vals },
					}));
				}
			}
		}

		const unsubscribe = subscribeCephSyncChannel((msg) => {
			// DEF-ORTHO-SEV1-04: Игнорируем широковещательные сообщения от других пациентов
			if (msg.patientId && msg.patientId !== patientId) {
				return;
			}

			if (msg.type === "CEPH_STUDY_CACHED" || msg.type === "CEPH_ANALYSIS_UPDATED") {
				const study = msg.payload as CephalometricSavedStudy | undefined;
				if (study?.patientId && study.patientId !== patientId) {
					return;
				}
				if (study) {
					setCephStudy(study);
					onCephStudyLoaded?.(study);
				}
				const mList = study?.measurements || (study?.analysis && "measurements" in study.analysis ? study.analysis.measurements : undefined);
				if (Array.isArray(mList) && mList.length > 0) {
					const vals = parseCephMeasurementsArray(mList);
					if (Object.keys(vals).length > 0) {
						setProtocol((prev) => ({
							...prev,
							trgValues: { ...(prev.trgValues || {}), ...vals },
						}));
					}
				} else if (study?.analysis) {
					const ca = study.analysis;
					setProtocol((prev) => ({
						...prev,
						trgValues: {
							...(prev.trgValues || {}),
							...(typeof ca.sna === "number" ? { sna: ca.sna } : {}),
							...(typeof ca.snb === "number" ? { snb: ca.snb } : {}),
							...(typeof ca.anb === "number" ? { anb: ca.anb } : {}),
							...(typeof ca.u1NaDeg === "number" ? { u1_na: ca.u1NaDeg } : {}),
							...(typeof ca.l1NbDeg === "number" ? { l1_nb: ca.l1NbDeg } : {}),
							...(typeof ca.fmaDeg === "number" ? { fma: ca.fmaDeg } : {}),
						},
					}));
				}
			} else if (msg.type === "CEPH_STUDY_CLEARED") {
				if (!msg.patientId || msg.patientId === patientId) {
					setCephStudy(null);
					onCephStudyLoaded?.(null);
				}
			}
		});

		return () => {
			unsubscribe();
		};
	}, [patientId, setProtocol, onCephStudyLoaded]);

	return { cephStudy, setCephStudy };
}
