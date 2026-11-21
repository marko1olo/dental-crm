/**
 * @dental/web/components/orthodontics/useOrthodonticsStudioHydration.ts
 *
 * Честная гидратация данных пациента ортодонтической студии из PostgreSQL 18 и ТРГ-синхронизация.
 */

import { useEffect } from "react";
import type { OrthoProtocolState } from "./orthodonticsCatalogData";
import { subscribeCephSyncChannel, getActiveCephStudy } from "./cephStudioSyncChannel";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export function useOrthodonticsStudioHydration(
	patientId: string | undefined,
	setProtocol: React.Dispatch<React.SetStateAction<OrthoProtocolState>>,
): void {
	// 1. Честная гидратация данных пациента из базы PostgreSQL 18
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;

		const fetchProgress = async () => {
			try {
				const res = await fetch(`/api/orthodontics/${patientId}/progress`, {
					headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
				});
				if (res.ok) {
					const data = (await res.json()) as {
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
					};
					if (!isCancelled && data) {
						setProtocol((prev) => ({
							...prev,
							...(data.applianceId ? { applianceId: data.applianceId } : {}),
							...(data.applianceName ? { applianceName: data.applianceName } : {}),
							...(data.applianceCategory ? { applianceCategory: data.applianceCategory } : {}),
							...(data.selectedElasticId !== undefined ? { selectedElasticId: data.selectedElasticId } : {}),
							...(Array.isArray(data.selectedActionIds) ? { selectedActionIds: data.selectedActionIds } : {}),
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

	// 2. Честная гидратация ТРГ-анализа пациента из базы PostgreSQL 18 (DEF-ORTHO-03)
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;

		const fetchCephAnalysis = async () => {
			try {
				const res = await fetch(`/api/orthodontics/${patientId}/ceph-analysis`, {
					headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
				});
				if (res.ok) {
					const data = (await res.json()) as {
						study?: {
							analysis?: {
								sna?: number;
								snb?: number;
								anb?: number;
								u1NaDeg?: number;
								l1NbDeg?: number;
								fmaDeg?: number;
							};
						};
					};
					if (!isCancelled && data?.study?.analysis) {
						const ca = data.study.analysis;
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

	// 3. Реактивная синхронизация ТРГ через BroadcastChannel (DEF-1)
	useEffect(() => {
		const cachedStudy = getActiveCephStudy<{
			analysis?: { sna?: number; snb?: number; anb?: number; u1NaDeg?: number; l1NbDeg?: number; fmaDeg?: number };
			measurements?: Array<{ parameterKey?: string; parameter?: string; value: number | null }>;
		}>();
		if (cachedStudy) {
			const mList = cachedStudy.measurements;
			if (Array.isArray(mList) && mList.length > 0) {
				const vals: Record<string, number> = {};
				for (const m of mList) {
					const k = (m.parameterKey || m.parameter || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
					if (typeof m.value === "number") vals[k] = m.value;
				}
				if (Object.keys(vals).length > 0) {
					setProtocol((prev) => ({
						...prev,
						trgValues: { ...(prev.trgValues || {}), ...vals },
					}));
				}
			}
		}

		const unsubscribe = subscribeCephSyncChannel((msg) => {
			if (msg.type === "CEPH_STUDY_CACHED" || msg.type === "CEPH_ANALYSIS_UPDATED") {
				const study = msg.payload as {
					measurements?: Array<{ parameterKey?: string; parameter?: string; value: number | null }>;
					analysis?: { sna?: number; snb?: number; anb?: number; u1NaDeg?: number; l1NbDeg?: number; fmaDeg?: number };
				};
				const mList = study?.measurements;
				if (Array.isArray(mList) && mList.length > 0) {
					const vals: Record<string, number> = {};
					for (const m of mList) {
						const k = (m.parameterKey || m.parameter || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
						if (typeof m.value === "number") vals[k] = m.value;
					}
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
			}
		});

		return () => {
			unsubscribe();
		};
	}, [setProtocol]);
}
