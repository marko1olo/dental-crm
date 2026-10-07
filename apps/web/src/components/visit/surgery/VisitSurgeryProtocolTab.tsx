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
	Printer,
	FileCheck,
	PackageMinus,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	SURGICAL_OPERATION_NORMS,
	DENTAL_IMPLANTATION_NORM_TEXT,
	evaluateWarehouseOverdraft,
	quickDeductSurgicalMaterials,
	buildStandardImplantationProtocolText,
	buildStandardExtractionProtocolText,
	type SurgicalOperationNorm,
	type StandardImplantationParams,
} from "../../surgery/surgeryProtocols";
import { ImplantPassportModal } from "../../implants/ImplantPassportModal";
import {
	printSurgicalOperationProtocol,
	printSurgicalPackage,
} from "../../documents/surgicalPackagePrintEngine";
import { useVisitStore } from "../../../store/visitStore";
import { VisitSurgeryExtractionBar } from "./VisitSurgeryExtractionBar";
import { VisitSurgerySinusGbrBar } from "./VisitSurgerySinusGbrBar";
import { VisitSurgeryImplantBar } from "./VisitSurgeryImplantBar";
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
	const [hasWarehouseDelay, setHasWarehouseDelay] = useState<boolean>(false);
	const [isMaterialsDeducted, setIsMaterialsDeducted] = useState<boolean>(false);

	// Параметры имплантации
	const [implantBrand, setImplantBrand] = useState<string>("Dentium");
	const [implantDiameter, setImplantDiameter] = useState<number>(4.0);
	const [implantLength, setImplantLength] = useState<number>(10.0);
	const [implantTorque, setImplantTorque] = useState<number>(35);
	const [implantIsq, setImplantIsq] = useState<number>(72);
	const [implantCap, setImplantCap] = useState<"fdm" | "plug">("fdm");
	const [implantSuture, setImplantSuture] = useState<string>("Prolene 4-0");

	const effectiveTooth = activeTooth ?? selectedTooth;

	// Debounced autosave to useVisitStore (Mandate 8e: protection against data loss)
	const lastSyncedProtocolRef = React.useRef<string>("");
	React.useEffect(() => {
		if (!protocolText || protocolText === lastSyncedProtocolRef.current) return;
		const timer = setTimeout(() => {
			try {
				const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
				if (setVisitNoteForm) {
					setVisitNoteForm((prev) => {
						const prevObj = prev.objectiveStatus || "";
						const lastSnippet = lastSyncedProtocolRef.current;
						let newObj = prevObj;
						if (lastSnippet && newObj.includes(lastSnippet)) {
							newObj = newObj.replace(lastSnippet, protocolText);
						} else {
							newObj = newObj ? `${newObj}\n\n${protocolText}` : protocolText;
						}
						lastSyncedProtocolRef.current = protocolText;
						return { ...prev, objectiveStatus: newObj };
					});
				}
			} catch {
				// fallback
			}
		}, 800);
		return () => clearTimeout(timer);
	}, [protocolText]);

	const handleToothSelect = (t: number) => {
		setSelectedTooth(t);
		onSelectActiveTooth?.(t);
	};

	const currentNorm =
		SURGICAL_OPERATION_NORMS.find((n) => n.id === selectedNormId) ??
		SURGICAL_OPERATION_NORMS[0]!;

	const overdraftStatus = evaluateWarehouseOverdraft(
		currentNorm.requiredMaterials,
		hasWarehouseDelay,
	);

	const handleNormClick = (norm: SurgicalOperationNorm) => {
		setSelectedNormId(norm.id);
		if (norm.id === "surgery_implant_standard") {
			const text = buildStandardImplantationProtocolText({
				toothFdi: effectiveTooth,
				brand: implantBrand,
				diameterMm: implantDiameter,
				lengthMm: implantLength,
				torqueNcm: implantTorque,
				isq: implantIsq,
				capType: implantCap,
				sutureMaterial: implantSuture,
				postOpXray: true,
			});
			setProtocolText(text);
		} else if (norm.category === "extraction") {
			const complexity =
				norm.id === "surgery_extraction_complex"
					? "complex"
					: norm.id === "surgery_extraction_atypical"
						? "impacted_dystopic"
						: "simple";
			const text = buildStandardExtractionProtocolText({
				toothFdi: effectiveTooth,
				complexity,
				hemostasis: ["alvogyl", "hemostatic_sponge", "vicryl_suture", "tampon"],
				sutureMaterial: "Викрил 4-0",
				postOpXray: true,
			});
			setProtocolText(text);
		} else {
			setProtocolText(norm.standardProtocolTextRu);
		}
		if (norm.defaultToothFdi && !activeTooth) {
			handleToothSelect(norm.defaultToothFdi);
		}
		showToast(`Норма операции: «${norm.title}»`, "success");
	};

	// Пресет: Стандартная имплантация (торк 35 Н*см, ISQ 72, ФДМ, швы Prolene 4-0, снимок)
	const handleApplyStandardImplantationPreset = (
		overrides?: Partial<StandardImplantationParams>,
	) => {
		setSelectedNormId("surgery_implant_standard");
		const brand = overrides?.brand ?? implantBrand;
		const dia = overrides?.diameterMm ?? implantDiameter;
		const len = overrides?.lengthMm ?? implantLength;
		const torque = overrides?.torqueNcm ?? implantTorque;
		const isq = overrides?.isq ?? implantIsq;
		const cap = overrides?.capType ?? implantCap;
		const suture = overrides?.sutureMaterial ?? implantSuture;

		if (overrides?.brand) setImplantBrand(overrides.brand);
		if (overrides?.diameterMm) setImplantDiameter(overrides.diameterMm);
		if (overrides?.lengthMm) setImplantLength(overrides.lengthMm);
		if (overrides?.torqueNcm) setImplantTorque(overrides.torqueNcm);
		if (overrides?.isq) setImplantIsq(overrides.isq);
		if (overrides?.capType) setImplantCap(overrides.capType);
		if (overrides?.sutureMaterial) setImplantSuture(overrides.sutureMaterial);

		const generated = buildStandardImplantationProtocolText({
			toothFdi: effectiveTooth,
			brand,
			diameterMm: dia,
			lengthMm: len,
			torqueNcm: torque,
			isq,
			capType: cap,
			sutureMaterial: suture,
			postOpXray: true,
		});

		setProtocolText(generated);
		showToast(
			`✓ Физиологическая норма: ${brand} Ø${dia}×${len} мм, 35 Н/см, ISQ ${isq}, ${cap === "fdm" ? "ФДМ" : "Заглушка"}, ${suture}`,
			"success",
		);
	};

	const handleApplyToVisitDiary = () => {
		// 1. Direct injection into useVisitStore
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existingObj = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existingObj
						? `${existingObj}\n\n${protocolText}`
						: protocolText,
				};
			});
		} catch {
			// fallback
		}

		// 2. Props callback
		onApplyToDiary?.(protocolText);

		// 3. Global custom event for visit diary listeners
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

		showToast("Хирургический протокол внесён в медицинскую карту", "success");
	};

	const handlePrintProtocol = () => {
		printSurgicalOperationProtocol({
			patient: { fullName: patientName },
			doctorFullName: doctorName,
			operationType: currentNorm.title,
			toothNumber: effectiveTooth,
			protocolText,
			diagnosis: currentNorm.title,
			mkb10: currentNorm.icd10,
			surgeryDetails: selectedNormId === "surgery_implant_standard" ? {
				implantBrand,
				diameterMm: implantDiameter,
				lengthMm: implantLength,
				torqueNcm: implantTorque,
				isq: implantIsq,
				capType: implantCap,
				sutureMaterial: implantSuture,
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
				toothNumber: effectiveTooth,
			},
		});
		showToast("Хирургический комплект ИДС отправлен на печать", "info");
	};

	const handleQuickDeductWarehouseMaterials = () => {
		const result = quickDeductSurgicalMaterials({
			materials: currentNorm.requiredMaterials,
			hasWarehouseDelay,
			operationTitle: currentNorm.title,
		});
		setIsMaterialsDeducted(true);
		showToast(result.messageRu, result.isOverdraft ? "info" : "success");
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
							Клинические протоколы операций • Безбарьерный софт для хирурга
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
						onClick={() => setHasWarehouseDelay(false)}
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

			{/* Хирургические нормы операций */}
			<div className="space-y-2">
				<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
					<Zap size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Хирургические нормы (СтАР / Минздрав):</span>
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
									{norm.code804n ? `${norm.code804n} · ` : ""}{norm.icd10}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Динамический кокпит по категории операции (Мандаты 8e, 8k, 8z) */}
			{currentNorm.category === "extraction" ? (
				<VisitSurgeryExtractionBar
					effectiveTooth={effectiveTooth}
					patientName={patientName}
					doctorName={doctorName}
					onApplyProtocolText={(text) => setProtocolText(text)}
				/>
			) : currentNorm.category === "sinus_gbr" ? (
				<VisitSurgerySinusGbrBar
					effectiveTooth={effectiveTooth}
					isClosedSinus={selectedNormId === "surgery_sinus_lift_closed"}
					onApplyProtocolText={(text) => setProtocolText(text)}
				/>
			) : (
				<VisitSurgeryImplantBar
					implantBrand={implantBrand}
					setImplantBrand={setImplantBrand}
					implantDiameter={implantDiameter}
					setImplantDiameter={setImplantDiameter}
					implantLength={implantLength}
					setImplantLength={setImplantLength}
					implantTorque={implantTorque}
					setImplantTorque={setImplantTorque}
					implantIsq={implantIsq}
					setImplantIsq={setImplantIsq}
					implantCap={implantCap}
					setImplantCap={setImplantCap}
					implantSuture={implantSuture}
					setImplantSuture={setImplantSuture}
					onApplyPreset={handleApplyStandardImplantationPreset}
				/>
			)}

			{/* Текст протокола операции */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label htmlFor="visit-surgery-text" className="text-xs font-black uppercase text-[var(--muted)] tracking-wider">
						Текст протокола операции:
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

			{/* Footer Actions */}
			<footer className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--line)] flex-wrap">
				<div className="text-xs text-[var(--muted)]">
					{currentNorm.code804n && (
						<>
							<span>Услуга: </span>
							<strong className="text-[var(--ink)]">{currentNorm.code804n}</strong>
							<span> · </span>
						</>
					)}
					<span>Диагноз: </span>
					<strong className="text-[var(--ink)]">{currentNorm.icd10}</strong>
					{currentNorm.category === "implant" ? " · Торк 35 Н/см" : ""}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Печать комплекта ИДС (Мандат 8e) */}
					<button
						type="button"
						onClick={handlePrintSurgicalIds}
						className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer min-h-[48px] touch-manipulation"
						data-testid="btn-tab-print-ids"
						title="Печать комплекта ИДС и памятки пациента (3 бланка)"
					>
						<FileCheck size={16} />
						<span>Печать ИДС</span>
					</button>

					{/* Печать протокола операции (Мандат 8e) */}
					<button
						type="button"
						onClick={handlePrintProtocol}
						className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer min-h-[48px] touch-manipulation"
						data-testid="btn-tab-print-protocol"
						title="Печать протокола операции"
					>
						<Printer size={16} />
						<span>Печать протокола</span>
					</button>

					{/* Списание материалов со склада с мягким овердрафтом (Мандат 8e) */}
					<button
						type="button"
						onClick={handleQuickDeductWarehouseMaterials}
						className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer min-h-[48px] touch-manipulation ${
							isMaterialsDeducted
								? "border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)]"
								: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
						}`}
						data-testid="btn-tab-deduct-materials"
						title="Списание материалов операции (имплантат, графт, мембрана, расходники) со склада"
					>
						<PackageMinus size={16} />
						<span>{isMaterialsDeducted ? "Материалы списаны" : "Списать со склада"}</span>
					</button>

					<button
						type="button"
						onClick={handleApplyToVisitDiary}
						className="visit-surgery-btn-action bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs min-h-[48px] touch-manipulation"
						data-testid="btn-apply-to-visit-diary"
					>
						<FileText size={16} />
						<span>Внести в карту</span>
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
