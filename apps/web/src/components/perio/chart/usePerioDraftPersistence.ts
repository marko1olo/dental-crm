/**
 * apps/web/src/components/perio/chart/usePerioDraftPersistence.ts
 *
 * Backend draft lifecycle, synchronization, and autosave management for Periodontogram.
 * Decomposed from usePerioChartLogic.ts per Mandate 8b (file size <= 800 lines).
 */

import {
	convertPerioDentitionToSepa,
	convertSepaDentitionToPerio,
	createDefaultPerioTeeth,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { applyPeriodontitisModeratePreset } from "../perioMath";

export interface UsePerioDraftPersistenceOptions {
	readonly patientId?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly readOnly: boolean;
	readonly teeth: PerioToothRecord[];
	readonly setTeeth: React.Dispatch<React.SetStateAction<PerioToothRecord[]>>;
	readonly setSelectedToothNumber: (num: number) => void;
	readonly setFocusedSite: (
		site: { toothNumber: number; siteKey: PerioSiteKey } | null,
	) => void;
	readonly generateProtocolText: () => string;
	readonly refetchSnapshots: () => Promise<void>;
}

export function usePerioDraftPersistence({
	patientId,
	initialTeeth,
	readOnly,
	teeth,
	setTeeth,
	setSelectedToothNumber,
	setFocusedSite,
	generateProtocolText,
	refetchSnapshots,
}: UsePerioDraftPersistenceOptions) {
	const [draftSnapshotId, setDraftSnapshotId] = useState<string | null>(null);
	const [syncStatus, setSyncStatus] = useState<
		"idle" | "loading" | "saving" | "synced" | "closed" | "error"
	>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

	// Reset dentition when patient changes or load draft from backend (Mandates 8e, 8y)
	const currentPatientIdRef = useRef<string | undefined>(patientId);
	useEffect(() => {
		if (currentPatientIdRef.current !== patientId) {
			currentPatientIdRef.current = patientId;
			setDraftSnapshotId(null);
			setSelectedToothNumber(16);
			setFocusedSite(null);
		}

		if (!patientId || isDemoPatientId(patientId)) {
			if (initialTeeth && Array.isArray(initialTeeth) && initialTeeth.length > 0) {
				const map = new Map<number, PerioToothRecord>();
				for (const t of initialTeeth) {
					map.set(t.toothNumber, t);
				}
				const defaults = createDefaultPerioTeeth(2);
				setTeeth(defaults.map((def) => map.get(def.toothNumber) ?? def));
			} else {
				setTeeth(createDefaultPerioTeeth(2));
			}
			return;
		}

		const UUID_REGEX =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!UUID_REGEX.test(patientId)) return;

		let isMounted = true;
		async function initDraft() {
			setSyncStatus("loading");
			try {
				// 1. Try to fetch existing draft from backend
				const res = await fetch(`/api/periodontogram/patients/${patientId}/draft`);
				if (!res.ok) {
					if (isMounted) setSyncStatus("idle");
					return;
				}
				const json = (await res.json()) as {
					success: boolean;
					data?: {
						id: string;
						status: string;
						teeth?: any[];
					} | null;
				};

				if (json.success && json.data) {
					if (!isMounted) return;
					setDraftSnapshotId(json.data.id);
					setSyncStatus("synced");
					if (Array.isArray(json.data.teeth) && json.data.teeth.length > 0) {
						const converted = convertSepaDentitionToPerio(json.data.teeth);
						const tMap = new Map<number, PerioToothRecord>();
						for (const t of converted) tMap.set(t.toothNumber, t);
						const defaults = createDefaultPerioTeeth(2);
						setTeeth(defaults.map((def) => tMap.get(def.toothNumber) ?? def));
					}
					return;
				}

				// 2. No draft exists — create new draft on backend with tooth_states
				const createRes = await fetch(
					`/api/periodontogram/patients/${patientId}/draft`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({}),
					},
				);
				if (!createRes.ok) {
					if (isMounted) setSyncStatus("idle");
					return;
				}
				const createJson = (await createRes.json()) as {
					success: boolean;
					data?: {
						id: string;
						status: string;
						teeth?: any[];
					};
				};
				if (createJson.success && createJson.data && isMounted) {
					setDraftSnapshotId(createJson.data.id);
					setSyncStatus("synced");
					if (Array.isArray(createJson.data.teeth) && createJson.data.teeth.length > 0) {
						const converted = convertSepaDentitionToPerio(createJson.data.teeth);
						const tMap = new Map<number, PerioToothRecord>();
						for (const t of converted) tMap.set(t.toothNumber, t);
						const defaults = createDefaultPerioTeeth(2);
						setTeeth(defaults.map((def) => tMap.get(def.toothNumber) ?? def));
					}
				}
			} catch {
				if (isMounted) setSyncStatus("idle");
			}
		}

		void initDraft();

		return () => {
			isMounted = false;
		};
	}, [
		patientId,
		initialTeeth,
		setTeeth,
		setSelectedToothNumber,
		setFocusedSite,
	]);

	// ─── Backend Draft Persistence & Autocommit (Mandate 8e, 8aj) ─────────────
	const handleSaveDraft = useCallback(
		async (options?: { closeAfter?: boolean; notes?: string }) => {
			if (readOnly) return false;
			let snapshotId = draftSnapshotId;

			// If no draft ID yet but valid patient ID, try to create draft first
			if (!snapshotId && patientId && !isDemoPatientId(patientId)) {
				const UUID_REGEX =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
				if (UUID_REGEX.test(patientId)) {
					try {
						const res = await fetch(
							`/api/periodontogram/patients/${patientId}/draft`,
							{
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({}),
							},
						);
						if (res.ok) {
							const json = (await res.json()) as {
								success: boolean;
								data?: { id: string };
							};
							if (json.success && json.data?.id) {
								snapshotId = json.data.id;
								setDraftSnapshotId(snapshotId);
							}
						}
					} catch {
						// Offline graceful fallback
					}
				}
			}

			if (!snapshotId) {
				showToast("Данные перио-карты сохранены локально", "info", 2500);
				return true;
			}

			setSyncStatus("saving");

			try {
				const sepaTeeth = convertPerioDentitionToSepa(teeth);

				// Prepare batch teeth payload
				const teethPayload = sepaTeeth.map((t) => ({
					toothNumber: t.toothNumber,
					isPresent: t.isPresent,
					isImplant: t.isImplant,
					mobility: t.mobility,
					furcationBuccal: t.furcationBuccal,
					furcationLingual: t.furcationLingual,
				}));

				// Prepare batch sites payload
				const sitesPayload = sepaTeeth.flatMap((t) =>
					(t.sites ?? []).map((s) => ({
						toothNumber: t.toothNumber,
						siteCode: s.siteCode,
						probingDepthMm: s.probingDepthMm,
						gingivalMarginMm: s.gingivalMarginMm,
						bleedingOnProbing: s.bleedingOnProbing,
						plaque: s.plaque,
						suppuration: s.suppuration,
						calculus: s.calculus,
					})),
				);

				const [patchTeethRes, patchSitesRes] = await Promise.all([
					fetch(`/api/periodontogram/snapshots/${snapshotId}/teeth`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ teeth: teethPayload }),
					}),
					fetch(`/api/periodontogram/snapshots/${snapshotId}/sites`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ sites: sitesPayload }),
					}),
				]);

				if (!patchTeethRes.ok || !patchSitesRes.ok) {
					setSyncStatus("error");
					showToast("Ошибка сохранения перио-карты на сервере", "error", 3500);
					return false;
				}

				if (options?.closeAfter) {
					const closeRes = await fetch(
						`/api/periodontogram/snapshots/${snapshotId}/close`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								notes: options.notes ?? generateProtocolText(),
							}),
						},
					);

					if (closeRes.ok) {
						setSyncStatus("closed");
						setDraftSnapshotId(null);
						setLastSavedAt(new Date());
						void refetchSnapshots();
						showToast("Перио-карта успешно зафиксирована в ЭМК и закрыта", "success", 4000);
						return true;
					}
				}

				setSyncStatus("synced");
				setLastSavedAt(new Date());
				showToast("Перио-карта сохранена на сервере", "success", 2500);
				return true;
			} catch {
				setSyncStatus("error");
				showToast("Сбой сети: данные сохранены локально", "warning", 3500);
				return false;
			}
		},
		[
			readOnly,
			draftSnapshotId,
			patientId,
			teeth,
			generateProtocolText,
			refetchSnapshots,
		],
	);

	// Debounced autosave for active draft
	const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		if (readOnly || !draftSnapshotId || syncStatus === "closed") return;
		if (autosaveTimerRef.current) {
			clearTimeout(autosaveTimerRef.current);
		}
		autosaveTimerRef.current = setTimeout(() => {
			void handleSaveDraft({ closeAfter: false });
		}, 3000);
		return () => {
			if (autosaveTimerRef.current) {
				clearTimeout(autosaveTimerRef.current);
			}
		};
	}, [teeth, draftSnapshotId, syncStatus, readOnly, handleSaveDraft]);

	return {
		draftSnapshotId,
		syncStatus,
		lastSavedAt,
		handleSaveDraft,
	};
}
