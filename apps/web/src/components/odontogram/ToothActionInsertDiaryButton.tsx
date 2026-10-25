import { Sparkles } from "lucide-react";
import type React from "react";
import {
	generateSoapFromOdontogramFinding,
	getToothAnatomicalNameRu,
} from "../../lib/clinicalProtocols";
import { showToast } from "../GlobalToast";
import { CLINICAL_SERVICE_BUNDLES } from "../visit/clinicalServiceBundles";
import type { ToothData, ToothState } from "./ToothChart";

export interface ToothActionInsertDiaryButtonProps {
	readonly toothNumber: number;
	readonly activeSurfaces: string[];
	readonly teethData: readonly ToothData[];
	readonly onClose: () => void;
}

export const ToothActionInsertDiaryButton: React.FC<
	ToothActionInsertDiaryButtonProps
> = ({ toothNumber, activeSurfaces, teethData, onClose }) => {
	const handleInsertDiary = () => {
		const currentTooth = teethData.find((t) => t.toothNumber === toothNumber);
		const st: ToothState = currentTooth?.state || "Healthy";
		const toothSurfaces =
			activeSurfaces.length > 0 ? activeSurfaces : undefined;
		const anatomicalName = getToothAnatomicalNameRu(toothNumber);
		const findingPayload =
			toothSurfaces && toothSurfaces.length > 0
				? { toothNumber, state: st, surfaces: toothSurfaces }
				: { toothNumber, state: st };
		const soap = generateSoapFromOdontogramFinding(findingPayload);
		const clipText = `Зуб ${toothNumber} (${anatomicalName}): ${soap.diagnosisIcd10Label}.\n${soap.statusLocalis}\n${soap.treatmentDescription}`;
		try {
			navigator.clipboard?.writeText?.(clipText);
		} catch {
			/* ignore */
		}
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: { finding: findingPayload, soap, mode: "smart_append" },
			}),
		);

		const bundleId =
			st === "Caries"
				? "caries"
				: st === "Pulpitis" || st === "Periodontitis"
					? "endo_1"
					: st === "Missing"
						? "surgery_extraction"
						: null;
		const bundle = bundleId
			? CLINICAL_SERVICE_BUNDLES.find((b) => b.id === bundleId)
			: null;
		if (bundle) {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						bundleId: bundle.id,
						bundleTitle: bundle.title,
						toothNumber,
						toothCode: String(toothNumber),
						source: "odontogram_bundle",
						services: bundle.services.map((s, idx) => ({
							id: `srv_tooth_${toothNumber}_${bundle.id}_${s.code804n}_${idx}`,
							code: s.code804n,
							code804n: s.code804n,
							title: s.title,
							price: s.priceRub,
							priceRub: s.priceRub,
							unitPriceRub: s.priceRub,
							quantity: 1,
							toothCode: String(toothNumber),
							toothNumber,
						})),
					},
				}),
			);
		}
		showToast(
			`Протокол для зуба #${toothNumber} внесён в дневник приёма`,
			"success",
		);
		onClose();
	};

	return (
		<button
			type="button"
			onClick={handleInsertDiary}
			aria-label="Вставить в дневник приёма"
			className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-bold text-sm bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 hover:bg-teal-500/20 cursor-pointer min-w-0 text-center leading-tight"
		>
			<Sparkles className="w-4 h-4 inline mr-2 shrink-0" />
			<span className="min-w-0 break-words">Вставить в дневник</span>
		</button>
	);
};
