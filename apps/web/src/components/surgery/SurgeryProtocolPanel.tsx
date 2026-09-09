import React, { useState } from "react";
import {
	Activity,
	FileText,
	CheckCircle2,
	Sliders,
	AlertTriangle,
	Sparkles,
	Copy,
	Zap,
	Receipt,
	Printer,
	FileCheck,
	MoreVertical,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { ImplantPassportModal } from "../implants/ImplantPassportModal";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	buildStandardImplantationProtocolText,
	getSurgicalServices804n,
	dispatchSurgicalServicesToInvoice,
	type SurgicalOperationNorm,
	type SurgicalService804n,
} from "./surgeryProtocols";
import { SurgerySafetyChecklist } from "./SurgerySafetyChecklist";
import {
	printSurgicalOperationProtocol,
	printSurgicalPackage,
} from "../documents/surgicalPackagePrintEngine";


export interface SurgeryProtocolPanelProps {
	readonly toothFdi?: number;
	readonly onSelectToothFdi?: (tooth: number) => void;
	readonly patientName?: string;
	readonly onApplyProtocol?: (text: string) => void;
	readonly onAddToInvoice?: (services: readonly SurgicalService804n[]) => void;
	readonly onOpenImplantPassport?: (tooth: number) => void;
	readonly onOpenFullCockpit?: () => void;
	readonly className?: string;
}

const TOP_IMPLANT_PRESETS = [
	{ brand: "Osstem", model: "TS III SA/CA", dia: 4.0, len: 10.0, label: "Osstem TS III" },
	{ brand: "Dentium", model: "SuperLine SLA", dia: 4.5, len: 10.0, label: "Dentium SuperLine" },
	{ brand: "Straumann", model: "BLX Roxolid", dia: 4.0, len: 10.0, label: "Straumann BLX" },
	{ brand: "Nobel Biocare", model: "Nobel Parallel CC", dia: 4.3, len: 11.5, label: "Nobel Parallel CC" },
];

export const SurgeryProtocolPanel: React.FC<SurgeryProtocolPanelProps> = ({
	toothFdi = 46,
	onSelectToothFdi,
	patientName = "Пациент",
	onApplyProtocol,
	onAddToInvoice,
	onOpenImplantPassport,
	onOpenFullCockpit,
	className = "",
}) => {
	const [activeNormId, setActiveNormId] = useState<string>("surgery_implant_standard");
	const [customProtocolText, setCustomProtocolText] = useState<string>(DENTAL_IMPLANTATION_NORM_TEXT);
	const [showChecklist, setShowChecklist] = useState<boolean>(false);
	const [isPassportOpen, setIsPassportOpen] = useState<boolean>(false);
	const [selectedImplantBrand, setSelectedImplantBrand] = useState<string>("Dentium");
	const [selectedCapType, setSelectedCapType] = useState<"fdm" | "plug">("fdm");
	const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);
	const moreMenuRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (!isMoreOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
				setIsMoreOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMoreOpen]);

	const activeNorm =
		SURGICAL_OPERATION_NORMS.find((n) => n.id === activeNormId) ??
		SURGICAL_OPERATION_NORMS[0]!;

	const overdraftStatus = evaluateWarehouseOverdraft(activeNorm.requiredMaterials);

	const currentServices = getSurgicalServices804n(activeNorm, toothFdi);
	const totalServicesPrice = currentServices.reduce((sum, s) => sum + s.priceRub * s.quantity, 0);

	const handleNormSelect = (norm: SurgicalOperationNorm) => {
		setActiveNormId(norm.id);
		setCustomProtocolText(norm.standardProtocolTextRu);
		if (norm.defaultToothFdi && onSelectToothFdi) {
			onSelectToothFdi(norm.defaultToothFdi);
		}
		showToast(`Норма: «${norm.title}»`, "success");
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
		setCustomProtocolText(text);
		showToast(`Имплантация: ${brand} 35 Н·см, ISQ 72, ${cap === "plug" ? "Заглушка" : "ФДМ"}`, "success");
	};

	const handleAddToInvoice = () => {
		dispatchSurgicalServicesToInvoice({
			norm: activeNorm,
			toothFdi,
			customServices: currentServices,
			onAddToInvoice,
		});
		const codes = currentServices.map((s) => s.code).join(", ");
		showToast(
			`Услуги 804н (${codes}) на ${totalServicesPrice.toLocaleString("ru-RU")} ₽ начислены в чек визита`,
			"success",
		);
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

		// Автоматическое начисление услуг 804н в активный чек визита при сохранении протокола (Мандаты 8e, 8k)
		dispatchSurgicalServicesToInvoice({
			norm: activeNorm,
			toothFdi,
			customServices: currentServices,
			onAddToInvoice,
		});

		showToast("Протокол операции и услуги 804н внесены в карту 043/у и чек", "success");
	};

	const handlePrintProtocol = () => {
		printSurgicalOperationProtocol({
			patient: { fullName: patientName },
			operationType: activeNorm.title,
			toothNumber: toothFdi,
			protocolText: customProtocolText,
			diagnosis: activeNorm.title,
			mkb10: activeNorm.icd10,
			surgeryDetails: activeNormId === "surgery_implant_standard" ? {
				implantBrand: selectedImplantBrand,
				diameterMm: 4.5,
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
			operationDetails: {
				operationType: activeNorm.title,
				toothNumber: toothFdi,
			},
		});
		showToast("Хирургический комплект ИДС отправлен на печать", "info");
	};

	const handlePassportClick = () => {

		if (onOpenImplantPassport) {
			onOpenImplantPassport(toothFdi);
		} else {
			setIsPassportOpen(true);
		}
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
					<button
						type="button"
						onClick={handlePassportClick}
						className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-black bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						data-testid="btn-panel-implant-passport"
					>
						<Sliders size={16} />
						<span>Паспорт имплантата</span>
					</button>

					{onOpenFullCockpit && (
						<button
							type="button"
							onClick={onOpenFullCockpit}
							className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:opacity-90 transition-all shadow-xs"
							data-testid="btn-panel-full-cockpit"
						>
							<Sparkles size={16} />
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
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
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
							<div className="truncate font-black" title={norm.shortBadge}>{norm.shortBadge}</div>
							<div
								className="text-[10px] opacity-80 truncate"
								title={norm.code804n ? `${norm.code804n} · ${norm.icd10}` : norm.icd10}
							>
								{norm.code804n ? `${norm.code804n} · ` : ""}{norm.icd10}
							</div>
						</button>
					);
				})}
			</div>

			{/* 1-Клик Пресеты имплантации (топовые системы, торк 35 Н·см, ISQ 72, ФДМ/заглушка) */}
			{activeNormId === "surgery_implant_standard" && (
				<div
					className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3"
					data-testid="panel-implant-presets-bar"
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
								35 Н·см
							</span>
							<span className="px-2.5 py-1 rounded-lg font-mono font-black bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
								72 ISQ
							</span>
						</div>
					</div>

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
									data-testid={`btn-panel-preset-implant-${preset.brand}`}
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
							data-testid="btn-panel-cap-fdm"
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
							data-testid="btn-panel-cap-plug"
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

			{/* Текст и быстрое действие */}
			<div className="space-y-2">
				<textarea
					value={customProtocolText}
					onChange={(e) => setCustomProtocolText(e.target.value)}
					rows={3}
					className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono text-[var(--ink)] resize-y focus:outline-none focus:border-[var(--teal,#0d9488)]"
					data-testid="panel-textarea-protocol"
				/>

				<div className="flex items-center justify-between gap-2 flex-wrap min-h-[48px]">
					<button
						type="button"
						onClick={() => setShowChecklist(!showChecklist)}
						className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer touch-manipulation"
					>
						{showChecklist ? "Скрыть Time-Out ВОЗ" : "Показать Time-Out ВОЗ"}
					</button>

					<div className="flex items-center gap-2 flex-wrap">
						{/* 1. Кнопка прямого действия: Начисление в чек */}
						<button
							type="button"
							onClick={handleAddToInvoice}
							className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-black bg-[var(--paper-soft)] text-[var(--teal,#0d9488)] border border-[var(--teal-soft,rgba(13,148,136,0.3))] hover:bg-[var(--teal-surface,rgba(13,148,136,0.1))] flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
							data-testid="btn-panel-add-invoice"
							title="1-Клик начисление хирургических услуг Номенклатуры 804н в активный чек визита"
						>
							<Receipt size={16} />
							<span>В чек: {totalServicesPrice.toLocaleString("ru-RU")} ₽ ({currentServices.length})</span>
						</button>

						{/* 2. Кнопка прямого действия: Внести в карту 043/у */}
						<button
							type="button"
							onClick={handleApply}
							className="min-h-[48px] px-4 py-2 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer touch-manipulation hover:opacity-90 active:scale-95 shadow-xs"
							data-testid="btn-panel-apply-diary"
						>
							<FileText size={16} />
							<span>Внести в карту 043/у</span>
						</button>

						{/* Вторичные действия: выпадающее меню (Закон Хика / Закон Миллера <= 2 кнопок прямого действия) */}
						<div className="relative" ref={moreMenuRef}>
							<button
								type="button"
								onClick={() => setIsMoreOpen(!isMoreOpen)}
								className="min-h-[48px] min-w-[48px] p-2.5 rounded-xl text-xs font-bold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)] flex items-center justify-center cursor-pointer touch-manipulation transition-all"
								data-testid="btn-panel-more-actions"
								title="Дополнительные действия (ИДС, печать, копирование)"
								aria-label="Дополнительные действия"
								aria-expanded={isMoreOpen}
							>
								<MoreVertical size={18} />
							</button>

							<div
								className={`absolute right-0 bottom-full mb-1.5 w-52 p-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-strong,#ffffff)] shadow-xl z-30 flex flex-col gap-1 ${
									isMoreOpen ? "block" : "hidden"
								}`}
								role="menu"
								aria-label="Вторичные хирургические действия"
							>
								{/* Печать комплекта ИДС (Мандат 8e) */}
								<button
									type="button"
									onClick={() => {
										setIsMoreOpen(false);
										handlePrintSurgicalIds();
									}}
									className="min-h-[48px] w-full px-3 py-2 rounded-lg text-xs font-bold text-left bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 cursor-pointer touch-manipulation transition-colors"
									data-testid="btn-panel-print-ids"
									title="Печать комплекта ИДС и памятки пациента (1 клик = 3 бланка)"
									role="menuitem"
								>
									<FileCheck size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span>Комплект ИДС</span>
								</button>

								{/* Печать протокола операции (Мандат 8e) */}
								<button
									type="button"
									onClick={() => {
										setIsMoreOpen(false);
										handlePrintProtocol();
									}}
									className="min-h-[48px] w-full px-3 py-2 rounded-lg text-xs font-bold text-left bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 cursor-pointer touch-manipulation transition-colors"
									data-testid="btn-panel-print-protocol"
									title="Печать протокола операции Формы 043/у"
									role="menuitem"
								>
									<Printer size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span>Печать протокола</span>
								</button>

								{/* Скопировать текст протокола */}
								<button
									type="button"
									onClick={() => {
										setIsMoreOpen(false);
										navigator.clipboard?.writeText(customProtocolText);
										showToast("Протокол скопирован", "success");
									}}
									className="min-h-[48px] w-full px-3 py-2 rounded-lg text-xs font-bold text-left bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 cursor-pointer touch-manipulation transition-colors"
									data-testid="btn-panel-copy"
									title="Скопировать текст протокола в буфер обмена"
									role="menuitem"
								>
									<Copy size={16} className="text-[var(--muted)] shrink-0" />
									<span>Скопировать протокол</span>
								</button>
							</div>
						</div>
					</div>

				</div>
			</div>

			{showChecklist && (
				<SurgerySafetyChecklist toothFdi={toothFdi} patientName={patientName} />
			)}

			{/* Модальное окно паспорта имплантата при вызове из панели (глубина модалки строго 1) */}
			{isPassportOpen && (
				<ImplantPassportModal
					isOpen={isPassportOpen}
					onClose={() => setIsPassportOpen(false)}
					initialTooth={toothFdi}
					patientName={patientName}
					onInsertIntoDiary={(text) => setCustomProtocolText((prev) => `${prev}\n\n${text}`)}
				/>
			)}
		</section>
	);
};

export default SurgeryProtocolPanel;
