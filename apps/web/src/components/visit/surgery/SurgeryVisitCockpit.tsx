import React, { useState } from "react";
import {
	Activity,
	CheckCircle2,
	FileText,
	Sliders,
	AlertTriangle,
	Sparkles,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	type SurgicalOperationNorm,
} from "../../surgery/surgeryProtocols";
import { SurgeryCockpitModal } from "../../surgery/SurgeryCockpitModal";
import { ImplantPassportModal } from "../../implants/ImplantPassportModal";

export interface SurgeryVisitCockpitProps {
	readonly activeTooth?: number | null;
	readonly onSelectActiveTooth?: (tooth: number) => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly onApplyDiaryText?: (text: string) => void;
	readonly className?: string;
}

export const SurgeryVisitCockpit: React.FC<SurgeryVisitCockpitProps> = ({
	activeTooth = 46,
	onSelectActiveTooth,
	patientName = "Пациент",
	patientId = "PAT-01",
	doctorName = "Хирург-имплантолог",
	onApplyDiaryText,
	className = "",
}) => {
	const [isFullCockpitOpen, setIsFullCockpitOpen] = useState<boolean>(false);
	const [isPassportModalOpen, setIsPassportModalOpen] = useState<boolean>(false);

	const effectiveTooth = activeTooth ?? 46;
	const implantNorm = SURGICAL_OPERATION_NORMS[0]!;
	const overdraftStatus = evaluateWarehouseOverdraft(implantNorm.requiredMaterials);

	const handleOneClickNorm = (norm: SurgicalOperationNorm) => {
		onApplyDiaryText?.(norm.standardProtocolTextRu);

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: norm.standardProtocolTextRu,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		showToast(`1-Клик норма «${norm.shortBadge}» внесена в карту 043/у`, "success");
	};

	return (
		<div
			className={`p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] space-y-2.5 ${className}`.trim()}
			data-testid="surgery-visit-cockpit"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Zap size={16} />
					</div>
					<div>
						<h4 className="text-xs font-black text-[var(--ink)] flex items-center gap-1.5">
							<span>Экспресс-хирургия & Имплантация</span>
							<span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[var(--paper)] border border-[var(--line)]">
								{`#${effectiveTooth}`}
							</span>
						</h4>
						<p className="text-[11px] text-[var(--muted)]">
							1-клик протокол Form 043/у • Стерильный тач-интерфейс
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsPassportModalOpen(true)}
						className="min-h-[44px] px-3 py-1 rounded-lg text-xs font-extrabold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:bg-[var(--paper-soft)]"
						data-testid="btn-cockpit-passport"
					>
						<Sliders size={14} />
						<span>Паспорт</span>
					</button>

					<button
						type="button"
						onClick={() => setIsFullCockpitOpen(true)}
						className="min-h-[44px] px-3 py-1 rounded-lg text-xs font-extrabold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:opacity-90 shadow-2xs"
						data-testid="btn-cockpit-full"
					>
						<Sparkles size={14} />
						<span>Кокпит</span>
					</button>
				</div>
			</div>

			{/* 1-Клик кнопки норм */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
				{SURGICAL_OPERATION_NORMS.map((norm) => (
					<button
						key={norm.id}
						type="button"
						onClick={() => handleOneClickNorm(norm)}
						className="min-h-[46px] p-2 rounded-xl text-xs font-black text-left bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.05))] cursor-pointer touch-manipulation transition-all"
						title={norm.title}
						data-testid={`btn-quick-surgery-${norm.id}`}
					>
						<div className="truncate">{norm.shortBadge}</div>
						<div className="text-[10px] font-mono text-[var(--muted)] truncate">
							{norm.category === "implant" ? "35 Н/см" : norm.icd10}
						</div>
					</button>
				))}
			</div>

			{/* Модальные окна */}
			{isFullCockpitOpen && (
				<SurgeryCockpitModal
					isOpen={isFullCockpitOpen}
					onClose={() => setIsFullCockpitOpen(false)}
					initialTooth={effectiveTooth}
					patientName={patientName}
					patientId={patientId}
					doctorName={doctorName}
				/>
			)}

			{isPassportModalOpen && (
				<ImplantPassportModal
					isOpen={isPassportModalOpen}
					onClose={() => setIsPassportModalOpen(false)}
					initialTooth={effectiveTooth}
					patientName={patientName}
					patientId={patientId}
					doctorName={doctorName}
				/>
			)}
		</div>
	);
};

export default SurgeryVisitCockpit;
