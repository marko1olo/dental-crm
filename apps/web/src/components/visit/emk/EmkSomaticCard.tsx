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
	const handleNorm =
		onApplyPhysiologicalNorm ||
		onFillNormQuick ||
		(() => {
			if (updateVisitNoteField) {
				updateVisitNoteField("anamnesis", "Соматически здоров. Аллергологический анамнез не отягощен.");
			}
		});

	// Resolve allergies from props or fallback to patient fields
	const resolvedAllergies: string[] = React.useMemo(() => {
		if (allergies && allergies.length > 0) return allergies;
		if (!patient) return [];
		if (Array.isArray(patient.allergies)) {
			return patient.allergies.filter((a: any) => typeof a === "string" && a.trim().length > 0);
		}
		if (typeof patient.allergies === "string" && patient.allergies.trim().length > 0) {
			const text = patient.allergies.trim();
			if (text.toLowerCase().includes("не отягощен") || text.toLowerCase().includes("нет")) {
				return [];
			}
			return text.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
		}
		if (Array.isArray(patient.medicalAlerts)) {
			return patient.medicalAlerts.filter((a: any) => typeof a === "string" && a.trim().length > 0);
		}
		return [];
	}, [allergies, patient]);

	// Resolve cardio risk from flag or anamnesis / patient somatic conditions
	const resolvedIsCardioRisk = React.useMemo(() => {
		if (isCardioRisk) return true;
		const textToSearch = [
			visitNoteForm?.anamnesis,
			patient?.anamnesis,
			patient?.somaticStatus,
			patient?.chronicDiseases,
			Array.isArray(patient?.somaticAlerts) ? patient.somaticAlerts.join(" ") : "",
			typeof patient?.somaticAlerts === "string" ? patient.somaticAlerts : "",
		].filter(Boolean).join(" ").toLowerCase();

		return (
			textToSearch.includes("гипертон") ||
			textToSearch.includes("инфаркт") ||
			textToSearch.includes("ибс") ||
			textToSearch.includes("стенокард") ||
			textToSearch.includes("аритми") ||
			textToSearch.includes("кардио") ||
			textToSearch.includes("давлен")
		);
	}, [isCardioRisk, visitNoteForm?.anamnesis, patient]);

	const anamnesis = (visitNoteForm?.anamnesis || patient?.anamnesis || patient?.somaticStatus || "").toLowerCase();
	const isSomaticHealthy =
		anamnesis.includes("соматически здоров") ||
		anamnesis.includes("здоров") ||
		patient?.somaticStatus === "healthy" ||
		patient?.somaticStatus === "norm";

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 flex flex-col gap-2.5 transition-all">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-[var(--teal-subtle,rgba(20,184,166,0.1))] flex items-center justify-center text-[var(--teal,var(--brand-primary))]">
						<Activity size={15} />
					</div>
					<div>
						<h4 className="text-xs font-bold text-[var(--ink)] m-0">Соматический статус и анамнез</h4>
						<span className="text-[11px] text-[var(--muted)]">Медицинская карта • 1-клик заполнение нормой</span>
					</div>
				</div>

				<button
					type="button"
					onClick={handleNorm}
					disabled={isLocked}
					data-testid="btn-fill-norm-quick"
					title="Заполнить поля стандартной физиологической нормой (соматически здоров)"
					className="hidden"
				>
					<Sparkles size={12} className="text-amber-500/80 shrink-0" />
					<span>Заполнить нормой</span>
				</button>
			</div>

			{/* Аллергии и соматические риски */}
			{resolvedAllergies.length > 0 && (
				<div className="flex items-center gap-1.5 flex-wrap p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-900 dark:text-red-200" data-testid="emk-somatic-allergies-alert">
					<AlertTriangle size={14} className="text-red-600 dark:text-red-400 shrink-0" />
					<strong className="font-bold">Аллергоанамнез:</strong>
					{resolvedAllergies.map((allergy, idx) => (
						<span key={idx} className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 font-medium">
							{allergy}
						</span>
					))}
				</div>
			)}

			{resolvedIsCardioRisk && (
				<div
					className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-200"
					role="alert"
					data-testid="emk-somatic-cardio-alert"
				>
					<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div className="space-y-0.5">
						<strong className="font-bold block">Группа кардиоваскулярного риска</strong>
						<p className="m-0 leading-normal font-medium">{cardioRiskMessage || "Рекомендована анестезия без вазоконстриктора (Скандонест 3%)."}</p>
					</div>
				</div>
			)}

			{isSomaticHealthy && (
				<div className="flex items-center gap-1.5 text-xs text-[var(--teal,#0d9488)] font-semibold" data-testid="emk-somatic-healthy-badge">
					<ShieldCheck size={14} />
					<span>Соматически здоров. Аллергоанамнез не отягощен.</span>
				</div>
			)}
		</div>
	);
}
