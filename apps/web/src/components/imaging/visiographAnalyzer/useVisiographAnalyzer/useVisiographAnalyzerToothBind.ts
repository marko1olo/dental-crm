import { useCallback } from "react";
import { logger } from "../../../../utils/logger.js";
import { showToast } from "../../../GlobalToast.js";
import { useVisitStore } from "../../../../store/visitStore.js";
import { updateVisiographScanMeta, type XrayScan } from "../../VisiographScanHelpers.js";

export interface UseVisiographAnalyzerToothBindProps {
	currentScan: XrayScan | null;
	currentScanRef: React.MutableRefObject<XrayScan | null>;
	setCurrentScan: React.Dispatch<React.SetStateAction<XrayScan | null>>;
	selectedStudy?: { id?: string | null } | null | undefined;
	effectivePatientId: string | null | undefined;
	denteClinicalMutationHeaders: (extra?: Record<string, string>) => Record<string, string>;
	toothCode?: string | null | undefined;
}

export function useVisiographAnalyzerToothBind({
	currentScan,
	currentScanRef,
	setCurrentScan,
	selectedStudy,
	effectivePatientId,
	denteClinicalMutationHeaders,
	toothCode,
}: UseVisiographAnalyzerToothBindProps) {
	const handleBindTooth = useCallback(
		async (newToothCode: string) => {
			const formatted = newToothCode.trim();
			setCurrentScan((prev) => (prev ? { ...prev, toothCode: formatted } : prev));
			if (currentScanRef.current) {
				currentScanRef.current.toothCode = formatted;
			}

			if (
				currentScan?.id &&
				!currentScan.id.startsWith("local-") &&
				!currentScan.id.startsWith("demo-")
			) {
				try {
					updateVisiographScanMeta(
						currentScan.id,
						{ toothCode: formatted },
						denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
					);
				} catch (err) {
					logger.warn("[VisiographAnalyzer] failed to update toothCode on xray scan:", err);
				}
			}

			if (
				selectedStudy?.id &&
				!selectedStudy.id.startsWith("local-") &&
				!selectedStudy.id.startsWith("demo-")
			) {
				try {
					await fetch(`/api/imaging/studies/${selectedStudy.id}`, {
						method: "PATCH",
						headers: denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({ toothCode: formatted }),
					});
				} catch (err) {
					logger.warn("[VisiographAnalyzer] failed to patch imaging study toothCode:", err);
				}
			}

			const toothNum = Number(formatted);
			if (!Number.isNaN(toothNum)) {
				try {
					useVisitStore.getState().setActiveToothNumber(toothNum);
				} catch {
					// Outside visit context
				}
			}

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-tooth-scan-bound", {
						detail: {
							patientId: effectivePatientId,
							toothCode: formatted,
							scanId: currentScan?.id,
						},
					}),
				);
			}

			showToast(`✓ Снимок привязан к зубу #${formatted}`, "success");
		},
		[currentScan?.id, selectedStudy?.id, effectivePatientId, denteClinicalMutationHeaders, setCurrentScan, currentScanRef],
	);

	return {
		handleBindTooth,
		boundToothCode: currentScan?.toothCode || toothCode || null,
	};
}
