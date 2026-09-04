import React, { useState } from "react";
import {
	Activity,
	CheckCircle2,
	FileText,
	Sliders,
	ShieldCheck,
	AlertTriangle,
	Sparkles,
	Copy,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	type SurgicalOperationNorm,
} from "../../surgery/surgeryProtocols";
import { SurgerySafetyChecklist } from "../../surgery/SurgerySafetyChecklist";
import { ImplantPassportModal } from "../../implants/ImplantPassportModal";
import "./visitSurgery.css";

export interface VisitSurgeryProtocolTabProps {
	readonly activeTooth?: number | null;
	readonly onSelectActiveTooth?: (tooth: number) => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly onApplyToDiary?: (protocolText: string) => void;
	readonly className?: string;
}

const COMMON_SURGERY_TEETH = [46, 36, 16, 26, 48, 38, 18, 28, 11, 21, 14, 24];

export const VisitSurgeryProtocolTab: React.FC<VisitSurgeryProtocolTabProps> = ({
	activeTooth = 46,
	onSelectActiveTooth,
	patientName = "Пациент",
	patientId = "PAT-01",
	doctorName = "Хирург-имплантолог",
	doctorId = "DOC-01",
	onApplyToDiary,
	className = "",
}) => {
	const [selectedTooth, setSelectedTooth] = useState<number>(activeTooth ?? 46);
	const [selectedNormId, setSelectedNormId] = useState<string>("surgery_implant_standard");
	const [protocolText, setProtocolText] = useState<string>(DENTAL_IMPLANTATION_NORM_TEXT);
	const [isSterileGloveMode, setIsSterileGloveMode] = useState<boolean>(true);
	const [isImplantModalOpen, setIsImplantModalOpen] = useState<boolean>(false);
	const [simulateOverdraft, setSimulateOverdraft] = useState<boolean>(false);

	const effectiveTooth = activeTooth ?? selectedTooth;

	const handleToothSelect = (t: number) => {
		setSelectedTooth(t);
		onSelectActiveTooth?.(t);
	};

	const currentNorm =
		SURGICAL_OPERATION_NORMS.find((n) => n.id === selectedNormId) ??
		SURGICAL_OPERATION_NORMS[0]!;

	const overdraftStatus = evaluateWarehouseOverdraft(
		currentNorm.requiredMaterials,
		simulateOverdraft,
	);

	const handleNormClick = (norm: SurgicalOperationNorm) => {
		setSelectedNormId(norm.id);
		setProtocolText(norm.standardProtocolTextRu);
		if (norm.defaultToothFdi && !activeTooth) {
			handleToothSelect(norm.defaultToothFdi);
		}
		showToast(`Норма операции: «${norm.title}»`, "success");
	};

	const handleApplyToVisitDiary = () => {
		onApplyToDiary?.(protocolText);

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: protocolText,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		showToast("Хирургический протокол внесён в карту 043/у", "success");
	};

	const handleCopy = () => {
		navigator.clipboard?.writeText(protocolText);
		showToast("Протокол операции скопирован", "success");
	};

	return (
		<section
			className={`visit-surgery-container ${isSterileGloveMode ? "sterile-glove-active" : ""} ${className}`.trim()}
			data-testid="visit-surgery-protocol-tab"
			aria-label="Хирургический протокол и кокпит имплантолога"
		>
			{/* Header */}
			<header className="visit-surgery-header">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal-soft,rgba(13,148,136,0.3))] shrink-0">
						<Activity size={22} />
					</div>
					<div>
						<h3 className="text-base font-black text-[var(--ink)] flex items-center gap-2">
							<span>Хирургический протокол & Имплантологический кокпит</span>
							<span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
								{`Зуб FDI #${effectiveTooth}`}
							</span>
						</h3>
						<p className="text-xs text-[var(--muted)]">
							1-клик нормы операций • Безбарьерный софт для хирурга
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsSterileGloveMode(!isSterileGloveMode)}
						className={`visit-surgery-btn-action text-xs ${
							isSterileGloveMode
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
								: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"
						}`}
						title="Переключить увеличенные тач-таргеты для работы в стерильных перчатках"
						data-testid="btn-toggle-visit-sterile-mode"
					>
						<Sparkles size={16} />
						<span>{isSterileGloveMode ? "Стерильный режим" : "Обычный режим"}</span>
					</button>

					<button
						type="button"
						onClick={() => setIsImplantModalOpen(true)}
						className="visit-surgery-btn-action text-xs bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
						data-testid="btn-open-implant-passport-modal"
					>
						<Sliders size={16} />
						<span>Паспорт имплантата</span>
					</button>
				</div>
			</header>

			{/* Мягкий овердрафт склада */}
			{overdraftStatus.hasOverdraft && (
				<div
					className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center justify-between gap-3 flex-wrap"
					data-testid="visit-surgery-overdraft-banner"
				>
					<div className="flex items-center gap-2.5">
						<AlertTriangle size={20} className="text-[var(--amber,#f59e0b)] shrink-0" />
						<div>
							<strong className="text-[var(--amber-dark,#b45309)]">
								{overdraftStatus.warningRu}:{" "}
							</strong>
							<span>{overdraftStatus.detailsRu}</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setSimulateOverdraft(false)}
						className="px-3 py-1 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
					>
						Ознакомлен
					</button>
				</div>
			)}

			{/* Активный зуб FDI */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--teal,#0d9488)]">
						Зуб операции (FDI):
					</span>
					<span className="text-sm font-black font-mono px-2.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)]">
						{`#${effectiveTooth}`}
					</span>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{COMMON_SURGERY_TEETH.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => handleToothSelect(t)}
							className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-mono font-black cursor-pointer touch-manipulation transition-all ${
								effectiveTooth === t
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
							}`}
							data-testid={`btn-select-tooth-${t}`}
						>
							{t}
						</button>
					))}
				</div>
			</div>

			{/* 1-Клик Нормы операций */}
			<div className="space-y-2">
				<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
					<Zap size={14} className="text-[var(--teal,#0d9488)]" />
					<span>1-Клик Хирургические нормы (СтАР / Минздрав):</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
					{SURGICAL_OPERATION_NORMS.map((norm) => {
						const isSel = selectedNormId === norm.id;
						return (
							<button
								key={norm.id}
								type="button"
								onClick={() => handleNormClick(norm)}
								className={`visit-surgery-touch-card ${isSel ? "active" : ""}`}
								data-testid={`btn-surgery-norm-${norm.id}`}
							>
								<div className="flex items-center justify-between gap-1 mb-1">
									<strong className="text-xs font-extrabold truncate text-[var(--ink)]">
										{norm.shortBadge}
									</strong>
									{isSel && <CheckCircle2 size={16} className="text-[var(--teal,#0d9488)] shrink-0" />}
								</div>
								<span className="text-[10px] font-mono text-[var(--muted)] truncate">
									{norm.icd10}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Текст протокола операции */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label htmlFor="visit-surgery-text" className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
						Текст протокола (Форма 043/у):
					</label>
					<button
						type="button"
						onClick={handleCopy}
						className="px-3 py-1 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1 cursor-pointer"
						data-testid="btn-copy-protocol-text"
					>
						<Copy size={13} />
						<span>Скопировать</span>
					</button>
				</div>

				<textarea
					id="visit-surgery-text"
					value={protocolText}
					onChange={(e) => setProtocolText(e.target.value)}
					rows={4}
					className="w-full p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono text-[var(--ink)] resize-y focus:outline-none focus:border-[var(--teal,#0d9488)]"
					data-testid="textarea-visit-surgery-protocol"
				/>
			</div>

			{/* ВОЗ Time-Out Checklist */}
			<SurgerySafetyChecklist toothFdi={effectiveTooth} patientName={patientName} />

			{/* Footer Actions */}
			<footer className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--line)] flex-wrap">
				<div className="text-xs text-[var(--muted)]">
					МКБ-10: <strong className="text-[var(--ink)]">{currentNorm.icd10}</strong> · Торк 35 Н/см
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleApplyToVisitDiary}
						className="visit-surgery-btn-action bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
						data-testid="btn-apply-to-visit-diary"
					>
						<FileText size={16} />
						<span>Внести в карту 043/у</span>
					</button>
				</div>
			</footer>

			{/* Модальное окно паспорта имплантата */}
			{isImplantModalOpen && (
				<ImplantPassportModal
					isOpen={isImplantModalOpen}
					onClose={() => setIsImplantModalOpen(false)}
					initialTooth={effectiveTooth}
					patientName={patientName}
					patientId={patientId}
					doctorName={doctorName}
					doctorId={doctorId}
				/>
			)}
		</section>
	);
};

export default VisitSurgeryProtocolTab;
