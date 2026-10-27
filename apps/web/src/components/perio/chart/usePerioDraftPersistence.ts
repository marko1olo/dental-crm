/**
 * apps/web/src/components/perio/chart/usePerioDraftPersistence.ts
 *
 * Хук синхронизации и автосохранения перио-карты (Мандат 8b, <= 120 строк).
 */

import { createDefaultPerioTeeth, PERIO_SITE_KEYS, type PerioSiteKey, type PerioToothRecord } from "@dental/shared";
import { useCallback, useEffect, useState } from "react";
import { isDemoPatientId } from "../../../lib/demoMode";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import { closeRemoteDraftSnapshot, createRemoteDraft, fetchRemoteDraft, patchRemoteDraftTeethAndSites } from "./perioDraftApi";
import { getPerioStorageKey, loadLocalPerioDraft, saveLocalPerioDraft } from "./perioDraftStorage";
import { buildPeriodontalTreatmentPlanJustification } from "./perioSideEffectsEngine";

export { getPerioStorageKey };

export interface UsePerioDraftPersistenceOptions {
	readonly patientId?: string | undefined; readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly readOnly: boolean; readonly teeth: PerioToothRecord[];
	readonly setTeeth: React.Dispatch<React.SetStateAction<PerioToothRecord[]>>;
	readonly setSelectedToothNumber: (num: number) => void;
	readonly setFocusedSite: (site: { toothNumber: number; siteKey: PerioSiteKey } | null) => void;
	readonly generateProtocolText: () => string;
	readonly refetchSnapshots: () => Promise<void>;
}

export function usePerioDraftPersistence({
	patientId, visitId, initialTeeth, readOnly, teeth, setTeeth,
	setSelectedToothNumber, setFocusedSite, generateProtocolText, refetchSnapshots,
}: UsePerioDraftPersistenceOptions) {
	const [draftSnapshotId, setDraftSnapshotId] = useState<string | null>(null);
	const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "saving" | "synced" | "closed" | "error">("idle");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

	useEffect(() => {
		setSelectedToothNumber(16); setFocusedSite(null); setDraftSnapshotId(null);
		if (initialTeeth?.length) {
			const map = new Map<number, PerioToothRecord>();
			for (const t of initialTeeth) map.set(t.toothNumber, t);
			setTeeth(createDefaultPerioTeeth(2).map((def) => map.get(def.toothNumber) ?? def));
			return;
		}
		const local = loadLocalPerioDraft(patientId, visitId);
		if (local) setTeeth(local);
		if (!patientId || isDemoPatientId(patientId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) return;

		let mounted = true;
		void (async () => {
			setSyncStatus("loading");
			const existing = await fetchRemoteDraft(patientId);
			if (!mounted) return;
			if (existing) { setDraftSnapshotId(existing.id); setSyncStatus("synced"); if (existing.teeth.length) setTeeth(existing.teeth); return; }
			const created = await createRemoteDraft(patientId);
			if (!mounted || !created) { setSyncStatus("idle"); return; }
			setDraftSnapshotId(created.id); setSyncStatus("synced"); if (created.teeth.length) setTeeth(created.teeth);
		})();
		return () => { mounted = false; };
	}, [patientId, visitId, initialTeeth, setTeeth, setSelectedToothNumber, setFocusedSite]);

	const handleSaveDraft = useCallback(async (options?: { closeAfter?: boolean; notes?: string }) => {
		if (readOnly) return false;
		saveLocalPerioDraft(teeth, patientId, visitId);
		setLastSavedAt(new Date());

		// Автоматическое предложение профгигиены и кюретажа в план лечения при патологии >= 4 мм с BOP или >= 5 мм
		const affected = teeth.filter((t) => !t.isMissing && PERIO_SITE_KEYS.some((k) => (t[k]?.probingDepthMm ?? 0) >= 4 && (t[k]?.bleedingOnProbing || (t[k]?.probingDepthMm ?? 0) >= 5)));
		if (affected.length > 0) {
			const { planText, prophyService, curettageServices } = buildPeriodontalTreatmentPlanJustification(affected);
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev, treatmentPlan: prev.treatmentPlan && !prev.treatmentPlan.includes("План пародонтологического лечения") ? `${prev.treatmentPlan}\n\n${planText}` : prev.treatmentPlan || planText,
			}));
			useVisitStore.getState().addCompletedService(prophyService);
			for (const cur of curettageServices) useVisitStore.getState().addCompletedService(cur);
		}

		if (!draftSnapshotId) {
			setSyncStatus("synced"); showToast("Данные перио-карты сохранены", "info", 2500); return true;
		}
		setSyncStatus("saving");
		const ok = await patchRemoteDraftTeethAndSites(draftSnapshotId, teeth);
		if (!ok) {
			setSyncStatus("error"); showToast("Сбой сети: данные сохранены локально", "warning", 3500); return false;
		}
		if (options?.closeAfter) {
			const closed = await closeRemoteDraftSnapshot(draftSnapshotId, options.notes ?? generateProtocolText());
			if (closed) {
				setSyncStatus("closed"); setDraftSnapshotId(null); void refetchSnapshots();
				showToast("Перио-карта успешно зафиксирована в ЭМК и закрыта", "success", 4000); return true;
			}
		}
		setSyncStatus("synced"); showToast("Перио-карта сохранена на сервере", "success", 2500); return true;
	}, [readOnly, draftSnapshotId, patientId, visitId, teeth, generateProtocolText, refetchSnapshots]);

	useEffect(() => {
		if (readOnly || !teeth?.length) return;
		const timer = setTimeout(() => saveLocalPerioDraft(teeth, patientId, visitId), 300);
		return () => clearTimeout(timer);
	}, [teeth, patientId, visitId, readOnly]);

	useEffect(() => {
		if (readOnly || !draftSnapshotId || syncStatus === "closed") return;
		const timer = setTimeout(() => { void handleSaveDraft({ closeAfter: false }); }, 3000);
		return () => clearTimeout(timer);
	}, [teeth, draftSnapshotId, syncStatus, readOnly, handleSaveDraft]);

	return { draftSnapshotId, syncStatus, lastSavedAt, handleSaveDraft };
}
