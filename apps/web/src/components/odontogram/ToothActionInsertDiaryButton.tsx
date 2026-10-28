import { ChevronRight, Sparkles } from "lucide-react";
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
	readonly variant?: "grid" | "grouped-list" | undefined;
}

export const ToothActionInsertDiaryButton: React.FC<
	ToothActionInsertDiaryButtonProps
> = ({ toothNumber, activeSurfaces, teethData, onClose, variant = "grid" }) => {
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

	if (variant === "grouped-list") {
		return (
			<button
				type="button"
				onClick={handleInsertDiary}
				aria-label="Вставить в дневник приёма"
				className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:bg-[var(--paper-soft,#f8fafc)] dark:active:bg-zinc-800/60 select-none bg-transparent"
			>
				<div className="flex items-center gap-3 min-w-0 flex-1">
					<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
						<Sparkles className="w-4 h-4" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[15px] font-bold text-[var(--ink,#0f172a)] truncate">
							Вставить протокол в дневник
						</div>
						<div className="text-[12px] text-[var(--muted,#64748b)] truncate">
							Синтез записи SOAP и услуг 804н
						</div>
					</div>
				</div>
				<ChevronRight size={18} className="text-[var(--muted,#64748b)] shrink-0" />
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={handleInsertDiary}
			aria-label="Вставить в дневник приёма"
			className="col-span-2 flex items-center justify-center min-h-[40px] sm:min-h-[34px] p-2.5 sm:p-2 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-white/15 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 transition-all duration-150 font-bold text-sm cursor-pointer min-w-0 text-center leading-tight active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
		>
			<Sparkles className="w-4 h-4 inline mr-2 text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="min-w-0 break-words">Вставить в дневник</span>
		</button>
	);
};
