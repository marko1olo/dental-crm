import React, { useState } from "react";
import {
	Activity,
	FileText,
	CheckCircle2,
	Sliders,
	AlertTriangle,
	Sparkles,
	Copy,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	type SurgicalOperationNorm,
} from "./surgeryProtocols";
import { SurgerySafetyChecklist } from "./SurgerySafetyChecklist";

export interface SurgeryProtocolPanelProps {
	readonly toothFdi?: number;
	readonly onSelectToothFdi?: (tooth: number) => void;
	readonly patientName?: string;
	readonly onApplyProtocol?: (text: string) => void;
	readonly onOpenImplantPassport?: (tooth: number) => void;
	readonly onOpenFullCockpit?: () => void;
	readonly className?: string;
}

export const SurgeryProtocolPanel: React.FC<SurgeryProtocolPanelProps> = ({
	toothFdi = 46,
	onSelectToothFdi,
	patientName = "Пациент",
	onApplyProtocol,
	onOpenImplantPassport,
	onOpenFullCockpit,
	className = "",
}) => {
	const [activeNormId, setActiveNormId] = useState<string>("surgery_implant_standard");
	const [customProtocolText, setCustomProtocolText] = useState<string>(DENTAL_IMPLANTATION_NORM_TEXT);
	const [showChecklist, setShowChecklist] = useState<boolean>(false);

	const activeNorm =
		SURGICAL_OPERATION_NORMS.find((n) => n.id === activeNormId) ??
		SURGICAL_OPERATION_NORMS[0]!;

	const overdraftStatus = evaluateWarehouseOverdraft(activeNorm.requiredMaterials);

	const handleNormSelect = (norm: SurgicalOperationNorm) => {
		setActiveNormId(norm.id);
		setCustomProtocolText(norm.standardProtocolTextRu);
		if (norm.defaultToothFdi && onSelectToothFdi) {
			onSelectToothFdi(norm.defaultToothFdi);
		}
		showToast(`Норма: «${norm.title}»`, "success");
	};

	const handleApply = () => {
		if (onApplyProtocol) {
			onApplyProtocol(customProtocolText);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: customProtocolText,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		showToast("Протокол операции внесён в карту 043/у", "success");
	};

	return (
		<section
			className={`p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] space-y-3.5 ${className}`.trim()}
			data-testid="surgery-protocol-panel"
			aria-label="Хирургический протокол и нормы операций"
		>
			{/* Header */}
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal-soft,rgba(13,148,136,0.3))] shrink-0">
						<Activity size={18} />
					</div>
					<div>
						<h3 className="text-sm font-black text-[var(--ink)] flex items-center gap-2">
							<span>Хирургический протокол & Имплантология</span>
							<span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
								Зуб FDI #{toothFdi}
							</span>
						</h3>
						<p className="text-xs text-[var(--muted)]">
							1-клик нормы операций • Без блокировки приема при задержке накладной
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{onOpenImplantPassport && (
						<button
							type="button"
							onClick={() => onOpenImplantPassport(toothFdi)}
							className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-black bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
							data-testid="btn-panel-implant-passport"
						>
							<Sliders size={15} />
							<span>Паспорт имплантата</span>
						</button>
					)}

					{onOpenFullCockpit && (
						<button
							type="button"
							onClick={onOpenFullCockpit}
							className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:opacity-90 transition-all shadow-xs"
							data-testid="btn-panel-full-cockpit"
						>
							<Sparkles size={15} />
							<span>Открыть кокпит</span>
						</button>
					)}
				</div>
			</div>

			{/* Мягкий овердрафт склада */}
			{overdraftStatus.hasOverdraft && (
				<div className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5">
					<AlertTriangle size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
					<div className="flex-1">
						<strong className="text-[var(--amber-dark,#b45309)]">Мягкий овердрафт склада: </strong>
						<span>{overdraftStatus.detailsRu}</span>
					</div>
				</div>
			)}

			{/* 1-Клик кнопки норм */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
				{SURGICAL_OPERATION_NORMS.map((norm) => {
					const isSel = activeNormId === norm.id;
					return (
						<button
							key={norm.id}
							type="button"
							onClick={() => handleNormSelect(norm)}
							className={`min-h-[48px] p-2 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer touch-manipulation ${
								isSel
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-2xs"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
							}`}
							data-testid={`btn-panel-norm-${norm.id}`}
						>
							<div className="truncate font-black">{norm.shortBadge}</div>
							<div className="text-[10px] opacity-80 truncate">{norm.icd10}</div>
						</button>
					);
				})}
			</div>

			{/* Текст и быстрое действие */}
			<div className="space-y-2">
				<textarea
					value={customProtocolText}
					onChange={(e) => setCustomProtocolText(e.target.value)}
					rows={3}
					className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono text-[var(--ink)] resize-y focus:outline-none focus:border-[var(--teal,#0d9488)]"
					data-testid="panel-textarea-protocol"
				/>

				<div className="flex items-center justify-between gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => setShowChecklist(!showChecklist)}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-0 cursor-pointer"
					>
						{showChecklist ? "Скрыть Time-Out ВОЗ" : "Показать Time-Out ВОЗ"}
					</button>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								navigator.clipboard?.writeText(customProtocolText);
								showToast("Протокол скопирован", "success");
							}}
							className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1 cursor-pointer"
							data-testid="btn-panel-copy"
						>
							<Copy size={14} />
							<span>Скопировать</span>
						</button>

						<button
							type="button"
							onClick={handleApply}
							className="min-h-[44px] px-4 py-1.5 rounded-lg text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:opacity-90 active:scale-95 shadow-xs"
							data-testid="btn-panel-apply-diary"
						>
							<FileText size={15} />
							<span>Внести в карту 043/у</span>
						</button>
					</div>
				</div>
			</div>

			{showChecklist && (
				<SurgerySafetyChecklist toothFdi={toothFdi} patientName={patientName} />
			)}
		</section>
	);
};

export default SurgeryProtocolPanel;
