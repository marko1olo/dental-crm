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
	Camera,
	Printer,
	FileCheck,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { ImplantPassportModal } from "../implants/ImplantPassportModal";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	buildStandardImplantationProtocolText,
	dispatchSurgicalServicesToInvoice,
	type SurgicalOperationNorm,
	type SurgicalService804n,
} from "./surgeryProtocols";
import { SurgerySafetyChecklist } from "./SurgerySafetyChecklist";
import {
	printSurgicalOperationProtocol,
	printSurgicalPackage,
} from "../documents/surgicalPackagePrintEngine";
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
	readonly onOpenVisiograph?: (tooth: number) => void;
	readonly onAddToInvoice?: (services: readonly SurgicalService804n[]) => void;
	readonly className?: string;
}

const COMMON_SURGERY_TEETH = [46, 36, 16, 26, 48, 38, 18, 28, 11, 21, 14, 24, 34, 44];

const TOP_IMPLANT_PRESETS = [
	{ brand: "Osstem", model: "TS III SA/CA", dia: 4.0, len: 10.0, label: "Osstem TS III" },
	{ brand: "Dentium", model: "SuperLine SLA", dia: 4.5, len: 10.0, label: "Dentium SuperLine" },
	{ brand: "Straumann", model: "BLX Roxolid", dia: 4.0, len: 10.0, label: "Straumann BLX" },
	{ brand: "Nobel Biocare", model: "Nobel Parallel CC", dia: 4.3, len: 11.5, label: "Nobel Parallel CC" },
];

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
	onOpenVisiograph,
	onAddToInvoice,
	className = "",
}) => {
	const [toothFdi, setToothFdi] = useState<number>(initialTooth);
	const [selectedNormId, setSelectedNormId] = useState<string>("surgery_implant_standard");
	const [protocolText, setProtocolText] = useState<string>(DENTAL_IMPLANTATION_NORM_TEXT);
	const [isSterileGloveMode, setIsSterileGloveMode] = useState<boolean>(true);
	const [simulateOverdraft, setSimulateOverdraft] = useState<boolean>(false);
	const [isPassportOpen, setIsPassportOpen] = useState<boolean>(false);
	const [selectedImplantBrand, setSelectedImplantBrand] = useState<string>("Dentium");
	const [selectedCapType, setSelectedCapType] = useState<"fdm" | "plug">("fdm");
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

	const applyImplantPreset = (
		brand: string,
		model: string,
		dia: number,
		len: number,
		cap: "fdm" | "plug",
	) => {
		setSelectedImplantBrand(brand);
		setSelectedCapType(cap);
		const text = buildStandardImplantationProtocolText({
			toothFdi,
			brand,
			model,
			diameterMm: dia,
			lengthMm: len,
			torqueNcm: 35,
			isq: 72,
			capType: cap,
		});
		setProtocolText(text);
		showToast(`Имплантация: ${brand} 35 Н·см, ISQ 72, ${cap === "plug" ? "Заглушка" : "ФДМ"}`, "success");
	};

	const handleCopyProtocol = () => {
		navigator.clipboard?.writeText(protocolText);
		showToast("Хирургический протокол скопирован в буфер", "success");
	};

	const handlePrintProtocol = () => {
		printSurgicalOperationProtocol({
			patient: { fullName: patientName },
			doctorFullName: doctorName,
			operationType: currentNorm.title,
			toothNumber: toothFdi,
			protocolText,
			diagnosis: currentNorm.title,
			mkb10: currentNorm.icd10,
			surgeryDetails: selectedNormId === "surgery_implant_standard" ? {
				implantBrand: selectedImplantBrand,
				diameterMm: 4.0,
				lengthMm: 10.0,
				torqueNcm: 35,
				isq: 72,
				capType: selectedCapType,
			} : undefined,
			isSignedByDoctor: false,
		});
		showToast("Протокол операции отправлен на печать", "info");
	};

	const handlePrintSurgicalIds = () => {
		printSurgicalPackage({
			patient: { fullName: patientName },
			doctorFullName: doctorName,
			operationDetails: {
				operationType: currentNorm.title,
				toothNumber: toothFdi,
			},
		});
		showToast("Хирургический комплект ИДС отправлен на печать", "info");
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

		// Автоматическое начисление хирургических услуг 804н в активный счет визита (DEFECT-SURGERY-01, Мандаты 8e, 8k)
		dispatchSurgicalServicesToInvoice({
			norm: currentNorm,
			toothFdi,
			onAddToInvoice,
		});

		showToast("Протокол операции и услуги 804н внесены в карту 043/у и счет", "success");
		onClose();
	};

	const handleOpenVisiograph = () => {
		if (onOpenVisiograph) {
			onOpenVisiograph(toothFdi);
		}
		try {
			window.dispatchEvent(
				new CustomEvent("dente-open-visiograph", {
					detail: {
						toothFdi,
						toothNumber: toothFdi,
						patientId,
						patientName,
					},
				}),
			);
		} catch {
			// fallback
		}
		showToast(`Радиовизиограф (RVG) для зуба FDI #${toothFdi}`, "info");
	};

	const handleOpenPassport = () => {
		if (onOpenImplantPassport) {
			onOpenImplantPassport(toothFdi);
		}
		setIsPassportOpen(true);
		showToast(`Переход к паспорту имплантата #${toothFdi}`, "info");
	};

	if (!isOpen) return null;

	// Anti-Matryoshka Law (Mandate 8d, Sin 6): Modal depth strictly 1.
	// Secondary cabinets (Implant Passport) render at top level rather than nested inside the cockpit dialog.
	if (isPassportOpen) {
		return (
			<ImplantPassportModal
				isOpen={isPassportOpen}
				onClose={() => setIsPassportOpen(false)}
				patientName={patientName}
				patientId={patientId}
				doctorName={doctorName}
				doctorId={doctorId}
				initialTooth={toothFdi}
				onInsertIntoDiary={(diaryText) => {
					setProtocolText((prev) => `${prev}\n\n${diaryText}`);
					if (onInsertIntoDiary) {
						onInsertIntoDiary(diaryText);
					}
				}}
			/>
		);
	}

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
						{/* Вызов радиовизиографа / RVG активного зуба */}
						<button
							type="button"
							onClick={handleOpenVisiograph}
							className="surgery-btn surgery-btn-secondary text-xs min-h-[48px] touch-manipulation flex items-center gap-1.5"
							title={`Открыть радиовизиограф (RVG) для зуба FDI #${toothFdi}`}
							data-testid="btn-cockpit-open-visiograph"
						>
							<Camera size={16} />
							<span>RVG #{toothFdi}</span>
						</button>

						{/* Режим стерильных перчаток (крупные тач-зоны) */}
						<button
							type="button"
							onClick={() => setIsSterileGloveMode(!isSterileGloveMode)}
							className={`surgery-btn text-xs min-h-[48px] touch-manipulation ${
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
							className="surgery-btn surgery-btn-secondary min-h-[48px] min-w-[48px] p-2.5 touch-manipulation"
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
								className="surgery-btn min-h-[48px] text-xs bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] touch-manipulation"
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
							<span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
								#{toothFdi}
							</span>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap">
							{COMMON_SURGERY_TEETH.map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setToothFdi(t)}
									className={`min-h-[48px] min-w-[48px] px-2.5 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
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
											{norm.code804n ? `${norm.code804n} · ` : ""}{norm.icd10}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* 1-Клик Пресеты имплантации (топовые системы, торк 35 Н/см, ISQ 72, ФДМ/заглушка) */}
					{selectedNormId === "surgery_implant_standard" && (
						<div
							className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3"
							data-testid="surgery-implant-presets-bar"
						>
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div className="flex items-center gap-2">
									<Zap size={16} className="text-[var(--teal,#0d9488)]" />
									<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)]">
										1-Клик Пресеты имплантации (Торк 35 Н·см · ISQ 72)
									</span>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<span className="px-2.5 py-1 rounded-lg font-mono font-black bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
										35 Н·см (канон)
									</span>
									<span className="px-2.5 py-1 rounded-lg font-mono font-black bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
										72 ISQ (RFA)
									</span>
								</div>
							</div>

							{/* Выбор системы: Osstem TS III, Dentium SuperLine, Straumann BLX, Nobel Parallel CC */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
								{TOP_IMPLANT_PRESETS.map((preset) => {
									const isSel = selectedImplantBrand === preset.brand;
									return (
										<button
											key={preset.brand}
											type="button"
											onClick={() => applyImplantPreset(preset.brand, preset.model, preset.dia, preset.len, selectedCapType)}
											className={`min-h-[48px] p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-center touch-manipulation ${
												isSel
													? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
											}`}
											data-testid={`btn-preset-implant-${preset.brand}`}
										>
											<div className="flex items-center justify-between">
												<span className="font-extrabold text-xs">{preset.label}</span>
												{isSel && <CheckCircle2 size={16} className="text-white shrink-0" />}
											</div>
											<div className="text-[10px] font-mono opacity-85">
												Ø {preset.dia} × {preset.len} мм
											</div>
										</button>
									);
								})}
							</div>

							{/* 1-Клик ФДМ vs Заглушка */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
								<button
									type="button"
									onClick={() => {
										const curr = TOP_IMPLANT_PRESETS.find((p) => p.brand === selectedImplantBrand) ?? TOP_IMPLANT_PRESETS[1]!;
										applyImplantPreset(curr.brand, curr.model, curr.dia, curr.len, "fdm");
									}}
									className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
										selectedCapType === "fdm"
											? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
									}`}
									data-testid="btn-cockpit-cap-fdm"
								>
									<span className="flex flex-col">
										<span className="font-extrabold">ФДМ (формирователь десны)</span>
										<span className="text-[10px] opacity-85">Одноэтапный протокол с формированием контура</span>
									</span>
									{selectedCapType === "fdm" && <CheckCircle2 size={18} className="text-white shrink-0" />}
								</button>

								<button
									type="button"
									onClick={() => {
										const curr = TOP_IMPLANT_PRESETS.find((p) => p.brand === selectedImplantBrand) ?? TOP_IMPLANT_PRESETS[1]!;
										applyImplantPreset(curr.brand, curr.model, curr.dia, curr.len, "plug");
									}}
									className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
										selectedCapType === "plug"
											? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
									}`}
									data-testid="btn-cockpit-cap-plug"
								>
									<span className="flex flex-col">
										<span className="font-extrabold">Винт-заглушка (Cover screw)</span>
										<span className="text-[10px] opacity-85">Двухэтапный протокол (ушивание наглухо)</span>
									</span>
									{selectedCapType === "plug" && <CheckCircle2 size={18} className="text-white shrink-0" />}
								</button>
							</div>
						</div>
					)}

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
								className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] flex items-center gap-1.5 cursor-pointer hover:bg-[var(--paper-soft)] touch-manipulation transition-all"
								data-testid="btn-copy-protocol"
							>
								<Copy size={16} />
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
						{currentNorm.code804n && (
							<>
								<span>804н: </span>
								<span className="font-bold text-[var(--ink)]">{currentNorm.code804n}</span>
								<span> · </span>
							</>
						)}
						<span>МКБ-10: </span>
						<span className="font-bold text-[var(--ink)]">{currentNorm.icd10}</span>
						<span> · Доступно сохранение без бюрократических барьеров</span>
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						{/* Печать ИДС и памятки пациента (Мандат 8e) */}
						<button
							type="button"
							onClick={handlePrintSurgicalIds}
							className="surgery-btn surgery-btn-secondary min-h-[48px] touch-manipulation flex items-center gap-1.5"
							title="Печать комплекта ИДС и памятки пациента (1 клик = 3 бланка)"
							data-testid="btn-print-surgery-ids"
						>
							<FileCheck size={16} />
							<span>Печать ИДС</span>
						</button>

						{/* Печать хирургического протокола операции (Мандат 8e) */}
						<button
							type="button"
							onClick={handlePrintProtocol}
							className="surgery-btn surgery-btn-secondary min-h-[48px] touch-manipulation flex items-center gap-1.5"
							title="Печать протокола операции Формы 043/у"
							data-testid="btn-print-surgery-protocol"
						>
							<Printer size={16} />
							<span>Печать протокола</span>
						</button>

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
