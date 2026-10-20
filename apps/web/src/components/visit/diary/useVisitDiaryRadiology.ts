import { useState, useEffect } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import type { RadiologySnapshotItem } from "../VisitSummaryModal";

export function useVisitDiaryRadiology(patientId: string, visitId?: string) {
	const [radiologySnapshots, setRadiologySnapshots] = useState<readonly RadiologySnapshotItem[]>([]);

	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/imaging/studies?patientId=${encodeURIComponent(patientId)}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then(async (res) => {
				if (res.ok) return res.json();
				const fallback = await fetch(`/api/xray/scans?patientId=${encodeURIComponent(patientId)}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				return fallback.ok ? fallback.json() : null;
			})
			.then((data) => {
				if (cancelled || !data) return;
				const raw = Array.isArray(data?.slices)
					? data.slices
					: Array.isArray(data?.studies)
						? data.studies
						: Array.isArray(data)
							? data
							: [];
				if (Array.isArray(raw)) {
					const mapped: RadiologySnapshotItem[] = raw
						.map((s: any, index: number) => ({
							id: String(
								s.id ||
									(s.sliceId
										? `slice_${s.sliceId}`
										: `rad_${visitId || patientId}_${index}`),
							),
							label: String(
								s.title || s.name || s.label || s.notes || s.modality || "Снимок ОПТГ/КЛКТ",
							),
							imageDataUri: String(s.previewUrl || s.imageDataUri || s.url || ""),
							capturedAt: s.capturedAt || s.takenAt || s.createdAt || undefined,
						}))
						.filter((item) => Boolean(item.imageDataUri));
					setRadiologySnapshots(mapped);
				}
			})
			.catch((err) => {
				console.warn("[useVisitDiaryRadiology] Failed to fetch radiology snapshots:", err);
			});
		return () => {
			cancelled = true;
		};
	}, [patientId, visitId]);

	return { radiologySnapshots };
}
