import React from "react";
import {
	Check,
	Copy,
	ShieldCheck,
	Sparkles,
	Tag,
	CheckCircle2,
	Stethoscope,
} from "lucide-react";
import {
	type Clinical1ClickTemplate,
	type SynthesizedDiaryResult,
	getToothAnatomicalDescription,
	PHYSIOLOGICAL_NORM_PRESET,
} from "./clinicalDiaryTemplatesEngine";

export interface ClinicalDiaryTemplatesEditorProps {
	readonly toothNumberInput: string;
	readonly onToothChange: (tooth: string) => void;
	readonly commonTeethPresets: readonly number[];
	readonly activeTemplate: Clinical1ClickTemplate;
	readonly selectedTemplateId: string;
	readonly editedSoapText: string;
	readonly isCustomEdited: boolean;
	readonly onSoapTextChange: (text: string) => void;
	readonly synthesized: SynthesizedDiaryResult;
	readonly isCopied: boolean;
	readonly onCopy: () => void;
	readonly onClose: () => void;
	readonly onApply: () => void;
}

export const ClinicalDiaryTemplatesEditor: React.FC<ClinicalDiaryTemplatesEditorProps> = React.memo(
	function ClinicalDiaryTemplatesEditor({
		toothNumberInput,
		onToothChange,
		commonTeethPresets,
		activeTemplate,
		selectedTemplateId,
		editedSoapText,
		isCustomEdited,
		onSoapTextChange,
		synthesized,
		isCopied,
		onCopy,
		onClose,
		onApply,
	}) {
		const isNorm = selectedTemplateId === PHYSIOLOGICAL_NORM_PRESET.id;

		return (
			<main className="cd-templates-editor-pane">
				{/* Top Controls: Tooth Selector & Quick Chips */}
				<div className="cd-editor-top-toolbar">
					<div className="cd-tooth-selector-row">
						<label htmlFor="cd-tooth-input" className="cd-tooth-input-label">
							Зуб FDI (11–48):
						</label>
						<input
							id="cd-tooth-input"
							type="number"
							min={11}
							max={85}
							value={toothNumberInput}
							onChange={(e) => onToothChange(e.target.value)}
							className="cd-tooth-input"
							placeholder="16"
							data-testid="cd-tooth-input"
						/>
						<div className="cd-tooth-quick-chips">
							{commonTeethPresets.slice(0, 6).map((num) => (
								<button
									key={num}
									type="button"
									onClick={() => onToothChange(String(num))}
									className={`cd-tooth-chip ${toothNumberInput === String(num) ? "active" : ""}`}
								>
									{num}
								</button>
							))}
						</div>
					</div>

					<div className="flex items-center gap-2 min-w-0">
						<span className="text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-1 min-w-0">
							<Tag className="w-3.5 h-3.5 shrink-0" />
							<span className="truncate">{activeTemplate.icd10Code} {activeTemplate.shortTitle}</span>
						</span>
					</div>
				</div>

				{/* Scrollable Editor Body */}
				<div className="cd-editor-scroll-body">
					<div className="cd-statutory-summary-card">
						<div className="flex items-center gap-2 font-medium min-w-0 flex-1">
							<CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--ok-fg,#15803d)]" />
							<span className="truncate">
								Сформирован канонический протокол СтАР: <strong>{isNorm ? PHYSIOLOGICAL_NORM_PRESET.title : activeTemplate.title}</strong>
							</span>
						</div>
						<span className="font-mono text-xs opacity-90 shrink-0 ml-2">
							{isNorm
								? "Физиологическая норма · Врач правит только патологию"
								: toothNumberInput
									? getToothAnatomicalDescription(toothNumberInput)
									: "Общий"}
						</span>
					</div>

					<div className="cd-soap-textarea-wrap">
						<div className="cd-soap-textarea-label">
							<span>
								{isNorm
									? "Единый протокол приема (Редактируемый дневник) — Врач правит только патологию:"
									: "Единый протокол приема (Редактируемый дневник):"}
							</span>
							{isCustomEdited && (
								<span className="text-emerald-600 dark:text-emerald-400 font-medium">
									(внесены ручные правки · черновик автосохранён)
								</span>
							)}
						</div>
						<textarea
							value={editedSoapText}
							onChange={(e) => onSoapTextChange(e.target.value)}
							className="cd-soap-textarea"
							rows={14}
							data-testid="cd-soap-textarea"
							aria-label="Текст дневниковой записи"
						/>
					</div>

					{synthesized.order804nServices.length > 0 && (
						<div className="cd-services-804n-box">
							<div className="cd-services-title flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<Stethoscope className="w-4 h-4 text-[var(--teal,#0d9488)]" />
									<span>Прикрепленные услуги каталога ({synthesized.order804nServices.length}):</span>
								</div>
								{typeof synthesized.totalEstimatedKopecks === "number" && synthesized.totalEstimatedKopecks > 0 && (
									<span className="text-xs font-bold text-[var(--teal,#0d9488)]" data-testid="cd-services-total-price">
										Итого: {(synthesized.totalEstimatedKopecks / 100).toLocaleString("ru-RU")} ₽
									</span>
								)}
							</div>
							<div className="cd-service-chips-row">
								{synthesized.order804nServices.map((svc) => (
									<div key={svc.code} className="cd-service-chip">
										<span className="cd-service-code">{svc.code}</span>
										<span>{svc.nameRu}</span>
										{svc.defaultQuantity && svc.defaultQuantity > 1 && (
											<span className="text-xs opacity-75">x{svc.defaultQuantity}</span>
										)}
										{typeof svc.priceKopecks === "number" && svc.priceKopecks > 0 && (
											<span className="cd-service-price-tag">
												{(svc.priceKopecks / 100).toLocaleString("ru-RU")} ₽
											</span>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* ── Footer ── */}
				<footer className="cd-templates-footer">
					<div className="cd-footer-meta">
						<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#15803d)]" />
						<span>Готов к автоматической вставке в медицинскую карту</span>
					</div>

					<div className="cd-footer-actions">
						<button
							type="button"
							onClick={onCopy}
							className="cd-btn cd-btn-secondary"
							data-testid="cd-copy-btn"
						>
							{isCopied ? (
								<>
									<Check className="w-4 h-4 text-emerald-600" />
									<span>Скопировано!</span>
								</>
							) : (
								<>
									<Copy className="w-4 h-4" />
									<span>Скопировать</span>
								</>
							)}
						</button>

						<button
							type="button"
							onClick={onClose}
							className="cd-btn cd-btn-secondary"
							data-testid="cd-cancel-btn"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={onApply}
							className="cd-btn cd-btn-primary"
							data-testid="cd-apply-btn"
							title="Мгновенная вставка регламентного протокола в карту"
						>
							<Sparkles className="w-4 h-4" />
							<span>Вставить в дневник</span>
						</button>
					</div>
				</footer>
			</main>
		);
	},
);
