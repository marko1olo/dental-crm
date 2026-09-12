import React, { useState } from "react";
import {
	Sliders,
	Sparkles,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	buildStandardImplantationProtocolText,
	type SurgicalOperationNorm,
} from "./surgeryProtocols";
import { SurgeryCockpitModal } from "./SurgeryCockpitModal";
import { ImplantPassportModal } from "../implants/ImplantPassportModal";
import { useVisitStore } from "../../store/visitStore";
import "./surgery.css";

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

	const handleOneClickStandardImplantation = () => {
		const text = buildStandardImplantationProtocolText({
			toothFdi: effectiveTooth,
			brand: "Dentium",
			model: "SuperLine",
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			isq: 72,
			capType: "fdm",
			sutureMaterial: "Prolene 4-0",
			postOpXray: true,
		});

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing ? `${existing}\n\n${text}` : text,
				};
			});
		} catch {
			// fallback
		}

		onApplyDiaryText?.(text);

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: text,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		showToast(`1-Клик норма: Имплантация 35 Н/см, ISQ 72, ФДМ внесена в карту 043/у`, "success");
	};

	const handleOneClickNorm = (norm: SurgicalOperationNorm) => {
		const textToApply =
			norm.id === "surgery_implant_standard"
				? buildStandardImplantationProtocolText({
						toothFdi: effectiveTooth,
						brand: "Dentium",
						model: "SuperLine",
						diameterMm: 4.0,
						lengthMm: 10.0,
						torqueNcm: 35,
						isq: 72,
						capType: "fdm",
						sutureMaterial: "Prolene 4-0",
						postOpXray: true,
					})
				: norm.standardProtocolTextRu;

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing ? `${existing}\n\n${textToApply}` : textToApply,
				};
			});
		} catch {
			// fallback
		}

		onApplyDiaryText?.(textToApply);

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: textToApply,
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
						className="min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:bg-[var(--paper-soft)]"
						data-testid="btn-cockpit-passport"
					>
						<Sliders size={14} />
						<span>Паспорт</span>
					</button>

					<button
						type="button"
						onClick={() => setIsFullCockpitOpen(true)}
						className="min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:opacity-90 shadow-2xs"
						data-testid="btn-cockpit-full"
					>
						<Sparkles size={14} />
						<span>Кокпит</span>
					</button>
				</div>
			</div>

			{/* 1-Клик Пресет: Экспресс-имплантация */}
			<button
				type="button"
				onClick={handleOneClickStandardImplantation}
				className="w-full min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center justify-between gap-2 cursor-pointer touch-manipulation hover:opacity-95 shadow-2xs transition-all active:scale-98"
				data-testid="btn-quick-standard-implantation"
				title="1-клик вставка в 043/у: Dentium SuperLine Ø4.0×10 мм, торк 35 Н/см, ISQ 72, ФДМ, швы Prolene 4-0, снимок"
			>
				<span className="flex items-center gap-2 truncate">
					<Zap size={15} className="text-amber-300 shrink-0" />
					<span className="truncate">Стандартная имплантация (35 Н/см, ISQ 72, ФДМ, Prolene 4-0)</span>
				</span>
				<span className="text-[11px] font-mono opacity-90 shrink-0">#{effectiveTooth}</span>
			</button>

			{/* 1-Клик кнопки норм */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
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
							{norm.code804n ? `${norm.code804n}` : (norm.category === "implant" ? "35 Н/см" : norm.icd10)}
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
