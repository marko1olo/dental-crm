import React from "react";
import { useVisitStore } from "../../../store/visitStore";
import {
	CLINICAL_SPECIALTY_SECTIONS,
	type ClinicalSpecialtySection,
} from "../clinicalSpecialtySections";
import {
	CLINICAL_SOAP_PRESETS,
	type ClinicalSoapPreset,
} from "../clinicalSoapPresets";

export interface ClinicalSpecialtySectionPanelProps {
	readonly activeSpecialtyCategory?: string;
	readonly setActiveSpecialtyCategory?: (id: string) => void;
	readonly currentSpecialtySection: ClinicalSpecialtySection | undefined;
	readonly currentTooth: number | null;
	readonly onSelectPreset: (preset: ClinicalSoapPreset) => void;
	readonly showCategoryChips?: boolean;
}

export const ClinicalSpecialtySectionPanel: React.FC<
	ClinicalSpecialtySectionPanelProps
> = ({
	activeSpecialtyCategory,
	setActiveSpecialtyCategory,
	currentSpecialtySection,
	currentTooth,
	onSelectPreset,
	showCategoryChips = false,
}) => {
	const visitToothRecordsByCode = useVisitStore(
		(s) => s.visitToothRecordsByCode,
	);
	const activeToothRecord = currentTooth
		? visitToothRecordsByCode[String(currentTooth)]
		: undefined;

	return (
		<div
			className="min-w-0 space-y-2"
			data-testid="clinical-express-specialty-panel"
		>
			{showCategoryChips && setActiveSpecialtyCategory && (
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div
						className="dente-segmented-bar overflow-x-auto no-scrollbar scrollbar-none flex-nowrap py-0.5 touch-pan-x"
						data-testid="clinical-category-chips-bar"
					>
						{CLINICAL_SPECIALTY_SECTIONS.map((sec) => {
							const IconComponent = sec.icon;
							const isActive = activeSpecialtyCategory === sec.id;
							return (
								<button
									key={sec.id}
									type="button"
									onClick={() => setActiveSpecialtyCategory(sec.id)}
									data-testid={`btn-specialty-category-${sec.id}`}
									data-active={isActive}
									className={`dente-segmented-item ${isActive ? "active" : ""}`}
								>
									<IconComponent size={13} className="shrink-0" />
									<span>{sec.label}</span>
								</button>
							);
						})}
					</div>
					<span className="text-[11px] font-mono text-[var(--muted)] hidden md:inline">
						Протоколы по стандартам СтАР
					</span>
				</div>
			)}

			{/* Сетка нозологий под активной категорией: 2 компактные строки, высота ~34-36px */}
			<div
				className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 min-w-0"
				data-testid="clinical-category-presets-grid"
			>
				{currentSpecialtySection?.items?.map((item) => {
					const preset = CLINICAL_SOAP_PRESETS.find(
						(p) => p.id === item.presetId,
					);
					if (!preset) return null;

					// Проверка, зафиксирован ли уже этот протокол в ЭМК активного зуба
					const isApplied = Boolean(
						activeToothRecord?.appliedPresetId
							? activeToothRecord.appliedPresetId === preset.id
							: activeToothRecord?.diagnosisIcd10 === preset.icd10 && preset.id === "caries_medium"
					);

					// Динамический расчёт цены по Номенклатуре 804н (Мандат 8ah — ноль строкового хардкода!)
					const service = preset.service804n;
					const priceRub = service?.basePriceRub;
					const priceLabel =
						typeof priceRub === "number" && priceRub > 0
							? `${priceRub.toLocaleString("ru-RU")} ₽`
							: null;

					const serviceShortName =
						item.subtext || service?.title || preset.title;

					return (
						<button
							key={`spec-${item.presetId}`}
							type="button"
							onClick={() => onSelectPreset(preset)}
							data-testid={`btn-nosology-preset-${item.presetId}`}
							className={`clinical-protocol-card min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex flex-col justify-between gap-0.5 cursor-pointer shadow-2xs active:scale-98 touch-manipulation text-left overflow-visible ${
								isApplied ? "applied" : ""
							}`}
							title={`${preset.title} · МКБ-10: ${preset.icd10}${priceLabel ? ` · ${priceLabel}` : ""}`}
						>
							{/* Верхняя строка: Название (не обрезается!) + бейдж МКБ-10 */}
							<div className="flex items-center justify-between w-full gap-1 min-w-0">
								<span className="font-bold text-xs text-[var(--ink)] truncate">
									{item.label}
								</span>
								<span
									className={`clinical-protocol-icd-badge shrink-0 flex items-center gap-0.5 ${
										isApplied ? "applied-icd" : ""
									}`}
									title={isApplied ? "Протокол применён к активному зубу" : `МКБ-10: ${preset.icd10}`}
								>
									{isApplied && (
										<span className="text-[var(--teal)] font-bold text-[10px]">
											✓
										</span>
									)}
									<span>{preset.icd10}</span>
								</span>
							</div>

							{/* Нижняя микро-строка: Название ключевой услуги и динамический бейдж цены */}
							<div className="flex items-center justify-between w-full gap-1.5 min-w-0 text-[11px] font-normal text-[var(--muted)]">
								<span className="truncate shrink min-w-0" title={serviceShortName}>
									{serviceShortName}
								</span>
								{priceLabel && (
									<span
										className={`clinical-protocol-price-badge shrink-0 flex items-center gap-1 font-semibold ${
											isApplied ? "text-[var(--teal)]" : "text-[var(--muted)]"
										}`}
									>
										<span>{priceLabel}</span>
										{isApplied && (
											<span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
												✓ В чек
											</span>
										)}
									</span>
								)}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};

