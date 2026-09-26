import React from "react";
import { Activity, AlertTriangle, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import type { EmkSectionProps } from "./EmkTypes";

export interface EmkSomaticCardProps extends Partial<EmkSectionProps> {
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onFillNormQuick?: (() => void) | undefined;
	patient?: any;
	allergies?: string[];
	somaticAlerts?: string[];
	isCardioRisk?: boolean;
	cardioRiskMessage?: string;
}

export function EmkSomaticCard({
	visitNoteForm,
	updateVisitNoteField,
	isLocked = false,
	onApplyPhysiologicalNorm,
	onFillNormQuick,
	patient,
	allergies = [],
	somaticAlerts = [],
	isCardioRisk = false,
	cardioRiskMessage,
}: EmkSomaticCardProps) {
	const handleNorm = onApplyPhysiologicalNorm || onFillNormQuick;
	const anamnesis = visitNoteForm?.anamnesis || "";
	const isSomaticHealthy = anamnesis.includes("Соматически здоров") || anamnesis.includes("здоров");

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 flex flex-col gap-2.5 transition-all">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-[var(--teal-subtle,rgba(20,184,166,0.1))] flex items-center justify-center text-[var(--teal,var(--brand-primary))]">
						<Activity size={15} />
					</div>
					<div>
						<h4 className="text-xs font-bold text-[var(--ink)] m-0">Соматический статус и анамнез</h4>
						<span className="text-[11px] text-[var(--muted)]">Форма 043/у • 1-клик заполнение физиологической нормой</span>
					</div>
				</div>

				<button
					type="button"
					onClick={handleNorm}
					data-testid="btn-fill-norm-quick"
					title="Заполнить поля ЭМК стандартной физиологической нормой (соматически здоров)"
					className="min-h-[32px] h-8 px-3 py-1 rounded-lg text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
				>
					<Sparkles size={13} />
					<span>Заполнить нормой в 1 клик</span>
				</button>
			</div>

			{/* Аллергии и соматические риски */}
			{allergies.length > 0 && (
				<div className="flex items-center gap-1.5 flex-wrap p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-900 dark:text-red-200">
					<AlertTriangle size={14} className="text-red-600 dark:text-red-400 shrink-0" />
					<strong className="font-bold">Аллергоанамнез:</strong>
					{allergies.map((allergy, idx) => (
						<span key={idx} className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 font-medium">
							{allergy}
						</span>
					))}
				</div>
			)}

			{isCardioRisk && (
				<div
					className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-200"
					role="alert"
				>
					<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div className="space-y-0.5">
						<strong className="font-bold block">Группа кардиоваскулярного риска</strong>
						<p className="m-0 leading-normal font-medium">{cardioRiskMessage || "Рекомендована анестезия без вазоконстриктора (Скандонест 3%)."}</p>
					</div>
				</div>
			)}

			{isSomaticHealthy && (
				<div className="flex items-center gap-1.5 text-xs text-[var(--teal,#0d9488)] font-semibold">
					<ShieldCheck size={14} />
					<span>Соматически здоров. Аллергоанамнез не отягощен.</span>
				</div>
			)}
		</div>
	);
}
