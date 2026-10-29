import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
	Sparkles,
	FileText,
	Check,
	X,
	ShieldCheck,
	Zap,
	Stethoscope,
} from "lucide-react";
import {
	type ClinicalProtocolCategory,
	type SynthesizedDiaryResult,
	type Order804nServiceItem,
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
	CLINICAL_CATEGORY_LABELS,
	getCore1ClickTemplates,
	synthesize1ClickSoapDiary,
	getToothAnatomicalDescription,
	PHYSIOLOGICAL_NORM_PRESET,
} from "./clinicalDiaryTemplatesEngine";
import { ClinicalDiaryTemplatesSidebar } from "./ClinicalDiaryTemplatesSidebar";
import { ClinicalDiaryTemplatesEditor } from "./ClinicalDiaryTemplatesEditor";
import "./clinicalDiaryTemplates.css";

export { PHYSIOLOGICAL_NORM_PRESET };

export interface ClinicalDiaryTemplatesModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothNumber?: number | string | null;
	readonly doctorFullName?: string | null;
	readonly doctorSpecialty?: string | null;
	readonly patientFullName?: string | null;
	readonly onApplyDiary?: (result: SynthesizedDiaryResult) => void;
	readonly onApplySoapText?: (text: string, icd10Code: string) => void;
	readonly onApplyServices?: (services: readonly Order804nServiceItem[]) => void;
}

const COMMON_TEETH_PRESETS = [16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44] as const;

function renderTemplateIcon(iconName: string, className = "w-4 h-4 shrink-0") {
	switch (iconName) {
		case "tooth":
			return <FileText className={className} aria-hidden="true" />;
		case "zap":
			return <Zap className={className} aria-hidden="true" />;
		case "shield":
			return <ShieldCheck className={className} aria-hidden="true" />;
		case "sparkles":
			return <Sparkles className={className} aria-hidden="true" />;
		case "scissors":
		case "surgery":
			return <Stethoscope className={className} aria-hidden="true" />;
		default:
			return <FileText className={className} aria-hidden="true" />;
	}
}

export const ClinicalDiaryTemplatesModal: React.FC<ClinicalDiaryTemplatesModalProps> = React.memo(
	function ClinicalDiaryTemplatesModal({
		isOpen,
		onClose,
		initialToothNumber,
		doctorFullName = "",
		doctorSpecialty = "Врач-стоматолог-терапевт",
		patientFullName,
		onApplyDiary,
		onApplySoapText,
		onApplyServices,
	}) {
		const coreTemplates = useMemo(() => [PHYSIOLOGICAL_NORM_PRESET, ...getCore1ClickTemplates()], []);
		const allCatalogWithNorm = useMemo(() => [PHYSIOLOGICAL_NORM_PRESET, ...CLINICAL_1CLICK_TEMPLATES_CATALOG], []);

		const [selectedTemplateId, setSelectedTemplateId] = useState<string>("caries_medium_k02_1");
		const [toothNumberInput, setToothNumberInput] = useState<string>(() =>
			initialToothNumber ? String(initialToothNumber) : "16",
		);
		const [searchQuery, setSearchQuery] = useState<string>("");
		const [selectedCategory, setSelectedCategory] = useState<ClinicalProtocolCategory | "all">("all");
		const [editedSoapText, setEditedSoapText] = useState<string>("");
		const [isCustomEdited, setIsCustomEdited] = useState<boolean>(false);
		const [isCopied, setIsCopied] = useState<boolean>(false);
		const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

		// Debounced автосейв текста врача на лету (Мандат 8e: Zero Keystroke Loss)
		const handleTextChange = useCallback((newText: string) => {
			setEditedSoapText(newText);
			setIsCustomEdited(true);

			if (autosaveTimerRef.current) {
				clearTimeout(autosaveTimerRef.current);
			}
			autosaveTimerRef.current = setTimeout(() => {
				try {
					if (typeof sessionStorage !== "undefined") {
						const draftKey = `dente:template_draft:${patientFullName || "common"}`;
						sessionStorage.setItem(draftKey, newText);
					}
				} catch {
					// Ignore storage errors
				}
			}, 600);
		}, [patientFullName]);

		useEffect(() => {
			return () => {
				if (autosaveTimerRef.current) {
					clearTimeout(autosaveTimerRef.current);
				}
			};
		}, []);

		useEffect(() => {
			if (initialToothNumber) {
				setToothNumberInput(String(initialToothNumber));
			}
		}, [initialToothNumber]);

		const filteredTemplates = useMemo(() => {
			const query = searchQuery.trim().toLowerCase().replace(/ё/g, "е");
			let list = allCatalogWithNorm;

			if (selectedCategory !== "all") {
				list = list.filter((t) => t.category === selectedCategory);
			}

			if (!query) return list;

			const tokens = query.split(/\s+/).filter(Boolean);
			return list.filter((t) => {
				const targetStr = `${t.title} ${t.shortTitle} ${t.icd10Code} ${t.icd10Title} ${t.defaultProcedureProtocol} ${CLINICAL_CATEGORY_LABELS[t.category] || ""}`
					.toLowerCase()
					.replace(/ё/g, "е");
				return tokens.every((tok) => targetStr.includes(tok));
			});
		}, [allCatalogWithNorm, searchQuery, selectedCategory]);

		const activeTemplate = useMemo(() => {
			if (selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id) {
				return PHYSIOLOGICAL_NORM_PRESET;
			}
			return CLINICAL_1CLICK_TEMPLATES_CATALOG.find((t) => t.id === selectedTemplateId) || PHYSIOLOGICAL_NORM_PRESET;
		}, [selectedTemplateId]);

		const synthesized = useMemo(() => {
			return synthesize1ClickSoapDiary(selectedTemplateId, {
				toothNumber: toothNumberInput,
				doctorFullName: doctorFullName ?? null,
				doctorSpecialty: doctorSpecialty ?? null,
				patientFullName: patientFullName ?? null,
			});
		}, [selectedTemplateId, toothNumberInput, doctorFullName, doctorSpecialty, patientFullName]);

		useEffect(() => {
			if (!isCustomEdited) {
				setEditedSoapText(synthesized.unifiedSoapText);
			}
		}, [synthesized, isCustomEdited]);

		const handleSelectTemplate = useCallback((templateId: string) => {
			setSelectedTemplateId(templateId);
			setIsCustomEdited(false);
		}, []);

		const handleToothChange = useCallback((toothVal: string) => {
			setToothNumberInput(toothVal);
			setIsCustomEdited(false);
		}, []);

		const handleCopy = useCallback(() => {
			const textToCopy = editedSoapText || synthesized.unifiedSoapText;
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				navigator.clipboard
					.writeText(textToCopy)
					.then(() => {
						setIsCopied(true);
						setTimeout(() => setIsCopied(false), 2000);
					})
					.catch(() => {});
			}
		}, [editedSoapText, synthesized.unifiedSoapText]);

		const handleApply = useCallback(() => {
			const finalSoapText = editedSoapText || synthesized.unifiedSoapText;
			const finalResult: SynthesizedDiaryResult = {
				...synthesized,
				unifiedSoapText: finalSoapText,
			};

			if (onApplySoapText) {
				onApplySoapText(finalSoapText, synthesized.assessmentIcd10Code);
			}
			if (onApplyDiary) {
				onApplyDiary(finalResult);
			}
			if (onApplyServices && synthesized.order804nServices.length > 0) {
				onApplyServices(synthesized.order804nServices);
			}

			onClose();
		}, [editedSoapText, synthesized, onApplySoapText, onApplyDiary, onApplyServices, onClose]);

		if (!isOpen || typeof document === "undefined") return null;

		return createPortal(
			<div
				className="cd-templates-backdrop"
				role="dialog"
				aria-modal="true"
				aria-label="Клинические протоколы и дневники приёма"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				<div className="cd-templates-modal">
					{/* Apple HIG: тактильный Drag Handle для мобильной шторки (36×5px) */}
					<div className="cd-templates-drag-handle" aria-hidden="true" />

					{/* ── Header ── */}
					<header className="cd-templates-header">
						<div className="cd-templates-title-group min-w-0 flex-1">
							<div className="cd-templates-icon-badge shrink-0">
								<Sparkles className="w-6 h-6" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<h2 className="cd-templates-title max-sm:whitespace-normal truncate">
										Клинические протоколы и дневники приёма
									</h2>
									<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#15803d)] border border-[var(--ok-fg,#15803d)]/30 shrink-0 whitespace-nowrap">
										<ShieldCheck className="w-3.5 h-3.5" />
										Клинические стандарты СтАР
									</span>
								</div>
								<p className="cd-templates-subtitle max-sm:whitespace-normal truncate">
									{patientFullName ? `Пациент: ${patientFullName} · ` : ""}
									{toothNumberInput ? `${getToothAnatomicalDescription(toothNumberInput)} · ` : ""}
									Мгновенная вставка канонического протокола без лишних кликов
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="cd-templates-close-btn shrink-0"
							aria-label="Закрыть модальное окно"
							data-testid="cd-templates-close-btn"
						>
							<X className="w-4 h-4" />
						</button>
					</header>

					{/* ── Dominant Physiological Norm Preset (Mandate 8e) ── */}
					<div className="cd-templates-dominant-norm-bar">
						<div className="flex items-center gap-2 min-w-0">
							<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#15803d)] shrink-0" />
							<span className="text-xs font-bold text-[var(--ok-fg,#15803d)] truncate">
								Физиологическая норма · Врач правит только патологию
							</span>
						</div>
						<button
							type="button"
							onClick={() => handleSelectTemplate(PHYSIOLOGICAL_NORM_PRESET.id)}
							className={`cd-dominant-norm-btn ${selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id ? "active" : ""}`}
							data-testid="cd-dominant-norm-btn"
							aria-label="Заполнить физиологической нормой по умолчанию"
						>
							<Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
							<span>Соматически здоров / Физиологическая норма</span>
							<span className="cd-dominant-norm-badge">Норма</span>
							{selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id && <Check className="w-3.5 h-3.5 shrink-0" />}
						</button>
					</div>

					{/* ── Fast Presets Ribbon ── */}
					<div className="cd-templates-fast-ribbon" data-testid="cd-core-fast-ribbon">
						<div className="cd-fast-ribbon-label">
							<Zap className="w-3.5 h-3.5 text-amber-500" />
							<span>Быстрый доступ:</span>
						</div>
						<div className="cd-fast-buttons-grid">
							{coreTemplates.map((item) => {
								const isSelected = selectedTemplateId === item.id;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => handleSelectTemplate(item.id)}
										className={`cd-fast-preset-btn ${isSelected ? "active" : ""}`}
										data-testid={`core-preset-${item.id}`}
									>
										{renderTemplateIcon(item.icon, "w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0")}
										<span>{item.shortTitle}</span>
										<span className="cd-fast-badge">{item.badge}</span>
										{isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
									</button>
								);
							})}
						</div>
					</div>

					{/* ── Body Split Pane ── */}
					<div className="cd-templates-body">
						<ClinicalDiaryTemplatesSidebar
							searchQuery={searchQuery}
							onSearchQueryChange={setSearchQuery}
							selectedCategory={selectedCategory}
							onSelectCategory={setSelectedCategory}
							allCatalogWithNorm={allCatalogWithNorm}
							filteredTemplates={filteredTemplates}
							selectedTemplateId={selectedTemplateId}
							onSelectTemplate={handleSelectTemplate}
							renderTemplateIcon={renderTemplateIcon}
						/>

						<ClinicalDiaryTemplatesEditor
							toothNumberInput={toothNumberInput}
							onToothChange={handleToothChange}
							commonTeethPresets={COMMON_TEETH_PRESETS}
							activeTemplate={activeTemplate}
							selectedTemplateId={selectedTemplateId}
							editedSoapText={editedSoapText}
							isCustomEdited={isCustomEdited}
							onSoapTextChange={handleTextChange}
							synthesized={synthesized}
							isCopied={isCopied}
							onCopy={handleCopy}
							onClose={onClose}
							onApply={handleApply}
						/>
					</div>
				</div>
			</div>,
			document.body,
		);
	},
);
