import { useEffect, useState } from "react";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { useVisitStore } from "../../../store/visitStore";

export function useToothScanThumbnail(toothNumber: number, selectedPatientId?: string | null) {
	const [toothScanThumbnail, setToothScanThumbnail] = useState<{ id: string; url: string; title: string } | null>(null);

	useEffect(() => {
		let active = true;
		const toothStr = String(toothNumber);

		if (isDemoShowcaseMode() || isDemoPatientId(selectedPatientId)) {
			setToothScanThumbnail({
				id: `demo-scan-${toothNumber}`,
				url: `/demo/rvg/tooth_${toothNumber}.jpg`,
				title: `Снимок RVG (Зуб #${toothNumber})`,
			});
			return;
		}

		if (!selectedPatientId) {
			setToothScanThumbnail(null);
			return;
		}

		fetch(`/api/xray/scans?patientId=${encodeURIComponent(selectedPatientId)}`)
			.then(async (res) => (res.ok ? res.json() : []))
			.then((scans) => {
				if (!active) return;
				const matched = Array.isArray(scans) ? scans.find((s: { toothCode?: string }) => String(s.toothCode ?? "").trim() === toothStr) : null;
				if (matched) {
					setToothScanThumbnail({
						id: matched.id,
						url: matched.imageDataUri || matched.fileUrl || `/api/xray/scans/${matched.id}/file`,
						title: matched.originalFilename || `RVG Зуб #${toothNumber}`,
					});
				} else {
					setToothScanThumbnail(null);
				}
			})
			.catch(() => {
				if (active) setToothScanThumbnail(null);
			});

		return () => {
			active = false;
		};
	}, [toothNumber, selectedPatientId]);

	const handleOpenRvg = (onClose: () => void) => {
		if (typeof window !== "undefined") {
			try {
				useVisitStore.getState().setActiveToothNumber(toothNumber);
			} catch {
				// outside visit store
			}
			const detail = {
				toothFdiCode: String(toothNumber),
				toothNumber,
				tooth: String(toothNumber),
				patientId: selectedPatientId,
				scanId: toothScanThumbnail?.id,
			};
			window.dispatchEvent(new CustomEvent("dente-open-rvg-capture", { detail }));
			window.dispatchEvent(new CustomEvent("dente-open-rvg-capture-modal", { detail }));
			window.dispatchEvent(new CustomEvent("dente:open-direct-rvg", { detail }));
		}
		onClose();
	};

	return { toothScanThumbnail, handleOpenRvg };
}
