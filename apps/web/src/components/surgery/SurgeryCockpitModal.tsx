import React, { useState, useId } from "react";
import {
	Activity,
	CheckCircle2,
	X,
	Copy,
	FileText,
	AlertTriangle,
	ShieldCheck,
	Zap,
	Sparkles,
	Sliders,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	type SurgicalOperationNorm,
} from "./surgeryProtocols";
import { SurgerySafetyChecklist } from "./SurgerySafetyChecklist";
import "./surgery.css";

export interface SurgeryCockpitModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly initialTooth?: number;
	readonly onInsertIntoDiary?: (protocolText: string) => void;
	readonly onOpenImplantPassport?: (tooth: number) => void;
	readonly className?: string;
}

const COMMON_SURGERY_TEETH = [46, 36, 16, 26, 48, 38, 18, 28, 11, 21, 14, 24, 34, 44];

export const SurgeryCockpitModal: React.FC<SurgeryCockpitModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientId = "PAT-01",
	doctorName = "Хирург-имплантолог",
	doctorId = "DOC-01",
	initialTooth = 46,
	onInsertIntoDiary,
	onOpenImplantPassport,
	className = "",
}) => {
	const [toothFdi, setToothFdi] = useState<number>(initialTooth);
	const [selectedNormId, setSelectedNormId] = useState<string>("surgery_implant_standard");
	const [protocolText, setProtocolText] = useState<string>(DENTAL_IMPLANTATION_NORM_TEXT);
	const [isSterileGloveMode, setIsSterileGloveMode] = useState<boolean>(true);
	const [simulateOverdraft, setSimulateOverdraft] = useState<boolean>(false);
	const titleId = useId();

	const currentNorm =
		SURGICAL_OPERATION_NORMS.find((n) => n.id === selectedNormId) ??
		SURGICAL_OPERATION_NORMS[0]!;

	// Проверка мягкого овердрафта склада (никогда не блокирует операцию)
	const overdraftStatus = evaluateWarehouseOverdraft(
		currentNorm.requiredMaterials,
		simulateOverdraft,
	);

	const handleSelectNorm = (norm: SurgicalOperationNorm) => {
		setSelectedNormId(norm.id);
		setProtocolText(norm.standardProtocolTextRu);
		if (norm.defaultToothFdi && !initialTooth) {
			setToothFdi(norm.defaultToothFdi);
		}
		showToast(`Применена 1-клик норма: «${norm.title}»`, "success");
	};

	const handleCopyProtocol = () => {
		navigator.clipboard?.writeText(protocolText);
		showToast("Хирургический протокол скопирован в буфер", "success");
	};

	const handleInsertDiary = () => {
		if (onInsertIntoDiary) {
			onInsertIntoDiary(protocolText);
		}

		// Автоматическая отправка глобального события в открытый визит (Form 043/u)
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

		showToast("Протокол операции внесен в карту 043/у", "success");
		onClose();
	};

	const handleOpenPassport = () => {
		if (onOpenImplantPassport) {
			onOpenImplantPassport(toothFdi);
		}
		showToast(`Переход к паспорту имплантата #${toothFdi}`, "info");
	};

	if (!isOpen) return null;

	return (
		<div
			className="surgery-cockpit-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="surgery-cockpit-modal-backdrop"
		>
			<div
				className={`surgery-cockpit-modal ${isSterileGloveMode ? "sterile-glove-active" : ""} ${className}`.trim()}
				data-testid="surgery-cockpit-modal"
			>
				{/* Header */}
				<header className="surgery-cockpit-header">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
							<Activity size={22} />
						</div>
						<div>
							<h2 id={titleId} className="text-base font-black text-[var(--ink)] flex items-center gap-2">
								<span>Хирургический кокпит & Протокол операции</span>
								<span className="text-xs px-2.5 py-0.5 rounded-lg font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
									Зуб FDI #{toothFdi}
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)]">
								Пациент: <span className="font-bold text-[var(--ink)]">{patientName}</span> · Врач: {doctorName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Режим стерильных перчаток (крупные тач-зоны) */}
						<button
							type="button"
							onClick={() => setIsSterileGloveMode(!isSterileGloveMode)}
							className={`surgery-btn text-xs ${
								isSterileGloveMode
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
									: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
							}`}
							title="Переключить увеличенные тач-зоны для работы в перчатках"
							data-testid="btn-toggle-sterile-mode"
						>
							<Sparkles size={16} />
							<span>{isSterileGloveMode ? "Стерильный режим (ВКЛ)" : "Обычный режим"}</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="surgery-btn surgery-btn-secondary p-2.5"
							aria-label="Закрыть хирургический кокпит"
							data-testid="btn-close-surgery-cockpit"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* Body */}
				<div className="surgery-cockpit-body">
					{/* Мягкий овердрафт склада (Закон: задержка накладной никогда не блокирует операцию) */}
					{overdraftStatus.hasOverdraft && (
						<div className="surgery-overdraft-banner" data-testid="surgery-overdraft-banner">
							<AlertTriangle size={22} className="surgery-overdraft-icon" />
							<div className="space-y-1 flex-1">
								<div className="text-xs font-black uppercase text-[var(--amber-dark,#b45309)]">
									{overdraftStatus.warningRu} (Мягкий овердрафт)
								</div>
								<div className="text-xs text-[var(--ink)]">
									{overdraftStatus.detailsRu}
								</div>
							</div>
							<button
								type="button"
								onClick={() => setSimulateOverdraft(false)}
								className="surgery-btn text-xs bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
								data-testid="btn-dismiss-overdraft-notice"
							>
								Ознакомлен
							</button>
						</div>
					)}

					{/* Быстрый выбор зуба FDI */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-2">
							<span className="text-xs font-black uppercase tracking-wider text-[var(--teal,#0d9488)]">
								Зуб операции (FDI):
							</span>
							<span className="text-sm font-black font-mono px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)]">
								#{toothFdi}
							</span>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap">
							{COMMON_SURGERY_TEETH.map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setToothFdi(t)}
									className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-mono font-black transition-all cursor-pointer touch-manipulation ${
										toothFdi === t
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
							<span>1-Клик Протоколы операций:</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
							{SURGICAL_OPERATION_NORMS.map((norm) => {
								const isSelected = selectedNormId === norm.id;
								return (
									<button
										key={norm.id}
										type="button"
										onClick={() => handleSelectNorm(norm)}
										className={`surgery-norm-card ${isSelected ? "selected" : ""}`}
										data-testid={`btn-norm-${norm.id}`}
									>
										<div className="flex items-center justify-between gap-1 mb-1">
											<span className="text-xs font-extrabold text-[var(--ink)]">
												{norm.title}
											</span>
											{isSelected && <CheckCircle2 size={16} className="text-[var(--teal,#0d9488)] shrink-0" />}
										</div>
										<span className="text-[11px] font-mono text-[var(--muted)]">
											{norm.shortBadge} · {norm.icd10}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Хирургический Time-Out Checklist */}
					<SurgerySafetyChecklist toothFdi={toothFdi} patientName={patientName} />

					{/* Текст протокола операции */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<label htmlFor="surgery-protocol-text" className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
								Текст хирургического протокола (Форма 043/у):
							</label>
							<button
								type="button"
								onClick={handleCopyProtocol}
								className="min-h-[44px] px-3 py-1 rounded-lg text-xs font-bold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] flex items-center gap-1.5 cursor-pointer hover:bg-[var(--paper-soft)]"
								data-testid="btn-copy-protocol"
							>
								<Copy size={14} />
								<span>Скопировать</span>
							</button>
						</div>

						<textarea
							id="surgery-protocol-text"
							value={protocolText}
							onChange={(e) => setProtocolText(e.target.value)}
							rows={6}
							className="surgery-protocol-textarea font-mono"
							data-testid="textarea-surgery-protocol"
						/>
					</div>
				</div>

				{/* Footer */}
				<footer className="surgery-cockpit-footer">
					<div className="text-xs text-[var(--muted)]">
						<span>МКБ-10: </span>
						<span className="font-bold text-[var(--ink)]">{currentNorm.icd10}</span>
						<span> · Доступно сохранение без бюрократических барьеров</span>
					</div>

					<div className="flex items-center gap-2">
						{selectedNormId === "surgery_implant_standard" && (
							<button
								type="button"
								onClick={handleOpenPassport}
								className="surgery-btn surgery-btn-secondary"
								data-testid="btn-open-implant-passport"
							>
								<Sliders size={16} />
								<span>Паспорт имплантата</span>
							</button>
						)}

						<button
							type="button"
							onClick={handleInsertDiary}
							className="surgery-btn surgery-btn-primary"
							data-testid="btn-insert-surgery-diary"
						>
							<FileText size={16} />
							<span>Внести в карту 043/у</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default SurgeryCockpitModal;
