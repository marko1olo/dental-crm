import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	Check,
	CircleDot,
	Compass,
	Layers,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";

export type JawOrOcclusionTarget = "JU" | "JL" | "C";

export interface JawFindingPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly mkb10Code?: string;
	readonly isNorm?: boolean;
	readonly descriptionRu: string;
	readonly soapStatusLocalis: string;
	readonly recommendedPlanRu?: string;
}

export const UPPER_JAW_PRESETS: readonly JawFindingPreset[] = [
	{
		id: "ju_norm",
		titleRu: "Физиологическая норма (Интактная)",
		isNorm: true,
		descriptionRu: "Альвеолярный отросток сохранен, достаточный объем костной ткани. Слизистая бледно-розовая, влажная, патологических изменений нет.",
		soapStatusLocalis: "Верхняя челюсть: альвеолярный отросток правильной формы, достаточного объема. Слизистая оболочка бледно-розового цвета, умеренно увлажнена, без патологических элементов. Пальпация безболезненна.",
	},
	{
		id: "ju_edentulism",
		titleRu: "Полная адентия верхней челюсти",
		mkb10Code: "K08.1",
		descriptionRu: "Полное отсутствие зубов на верхней челюсти. Требуется ортопедическая реабилитация (ПСПП или All-on-4/6).",
		soapStatusLocalis: "Верхняя челюсть: полное вторичное отсутствие зубов (K08.1). Альвеолярный отросток выражен умеренно. Небный торус сглажен. Показана тотальная ортопедическая или имплантологическая реабилитация.",
		recommendedPlanRu: "Изготовление полного съемного пластиночного протеза или тотальная имплантация All-on-4 / All-on-6.",
	},
	{
		id: "ju_atrophy",
		titleRu: "Атрофия альвеолярного отростка ВЧ",
		mkb10Code: "K08.2",
		descriptionRu: "Выраженная резорбция костной ткани альвеолярного отростка верхней челюсти, пневматизация гайморовых пазух.",
		soapStatusLocalis: "Верхняя челюсть: атрофия альвеолярного отростка (K08.2) по Шредеру II-III тип. Высота кости в дистальных отделах < 5 мм. Для дентальной имплантации требуется предварительная остеопластика / синус-лифтинг.",
		recommendedPlanRu: "КЛКТ верхнечелюстных синусов, открытый/закрытый синус-лифтинг с костной пластикой.",
	},
	{
		id: "ju_sinus_lift",
		titleRu: "Состояние после / Планирование синус-лифтинга",
		mkb10Code: "Z98.8",
		descriptionRu: "Субантральная аугментация (синус-лифтинг) в проекции гайморовых пазух.",
		soapStatusLocalis: "Верхняя челюсть: субантральное пространство подготовлено к установке дентальных имплантатов. Проведен/планируется субантральный синус-лифтинг с внесением костнопластического материала.",
		recommendedPlanRu: "Дентальная имплантация через 4–6 месяцев после приживления остеопластического графта.",
	},
	{
		id: "ju_all_on_x",
		titleRu: "Реабилитация All-on-4 / All-on-6 ВЧ",
		descriptionRu: "Несъемное протезирование верхней челюсти на мультиюнит-абатментах с винтовой фиксацией.",
		soapStatusLocalis: "Верхняя челюсть: реабилитация зубного ряда по протоколу All-on-4/6. Окклюзионные взаимоотношения восстановлены несъемной балочной/металлоакриловой или циркониевой конструкцией.",
	},
	{
		id: "ju_periodontitis",
		titleRu: "Генерализованный пародонтит ВЧ",
		mkb10Code: "K05.3",
		descriptionRu: "Хронический генерализованный пародонтит с горизонтальной и вертикальной резорбцией кости.",
		soapStatusLocalis: "Верхняя челюсть: генерализованный пародонтит (K05.3). Межзубные сосочки пастозны, гиперемированы, кровоточивость при зондировании II-III ст. Пародонтальные карманы глубиной 4-6 мм.",
		recommendedPlanRu: "Комплексная пародонтологическая чистка, вектор-терапия, шинирование подвижных зубов.",
	},
];

export const LOWER_JAW_PRESETS: readonly JawFindingPreset[] = [
	{
		id: "jl_norm",
		titleRu: "Физиологическая норма (Интактная)",
		isNorm: true,
		descriptionRu: "Альвеолярная часть нижней челюсти сохранена, плотная костная структура. Слизистая бледно-розовая, без патологии.",
		soapStatusLocalis: "Нижняя челюсть: альвеолярная часть правильной формы, достаточного объема. Слизистая оболочка бледно-розовая, умеренно влажная. Пальпация области челюстно-подъязычной линии и подбородка безболезненна.",
	},
	{
		id: "jl_edentulism",
		titleRu: "Полная адентия нижней челюсти",
		mkb10Code: "K08.1",
		descriptionRu: "Полное отсутствие зубов на нижней челюсти (K08.1). Требуется протезирование.",
		soapStatusLocalis: "Нижняя челюсть: полное вторичное отсутствие зубов (K08.1). Альвеолярная часть умеренно атрофирована по Келлеру. Требуется изготовление ПСПП или несъемного протеза на имплантатах.",
		recommendedPlanRu: "Изготовление полного съемного протеза на НЧ или имплантация с балочной/шаровидной фиксацией.",
	},
	{
		id: "jl_atrophy",
		titleRu: "Выраженная атрофия альвеолярной части НЧ",
		mkb10Code: "K08.2",
		descriptionRu: "Резкая резорбция альвеолярной части нижней челюсти, близкое прилегание сосудисто-нервного пучка.",
		soapStatusLocalis: "Нижняя челюсть: выраженная атрофия альвеолярной части (K08.2) по Келлеру III-IV тип. Высота кости над нижнечелюстным каналом ограничена. Требуется навигационный хирургический шаблон или костная аугментация.",
		recommendedPlanRu: "КЛКТ нижней челюсти с картированием нижнеальвеолярного нерва.",
	},
	{
		id: "jl_exostosis",
		titleRu: "Экзостозы / Торус нижней челюсти",
		mkb10Code: "K10.0",
		descriptionRu: "Костные выступы язычной поверхности нижней челюсти в области премоляров (Torus mandibularis).",
		soapStatusLocalis: "Нижняя челюсть: на язычной поверхности в области премоляров определяются плотные безболезненные костные выступы округлой формы, покрытые истонченной слизистой оболочкой (Торус НЧ).",
		recommendedPlanRu: "Динамическое наблюдение; при протезировании съемными конструкциями — альвеолопластика / сглаживание экзостозов.",
	},
	{
		id: "jl_all_on_x",
		titleRu: "Реабилитация All-on-4 / All-on-6 НЧ",
		descriptionRu: "Несъемное протезирование нижней челюсти на мультиюнитах с опорой на 4–6 дентальных имплантатов.",
		soapStatusLocalis: "Нижняя челюсть: реабилитация зубного ряда по протоколу All-on-4/6. Конструкция стабильна, гигиенический доступ сохранен.",
	},
	{
		id: "jl_periodontitis",
		titleRu: "Генерализованный пародонтит НЧ",
		mkb10Code: "K05.3",
		descriptionRu: "Хронический генерализованный пародонтит нижней челюсти с подвижностью фронтальной группы зубов.",
		soapStatusLocalis: "Нижняя челюсть: генерализованный пародонтит (K05.3). Кровоточивость при зондировании, над- и поддесневые зубные отложения, глубина пародонтальных карманов 3-5 мм.",
		recommendedPlanRu: "Профессиональная гигиена, закрытый кюретаж, медикаментозная обработка.",
	},
];

export const OCCLUSION_PRESETS: readonly JawFindingPreset[] = [
	{
		id: "c_orthognathic",
		titleRu: "Ортогнатический прикус (Норма / I класс)",
		isNorm: true,
		descriptionRu: "Физиологический прикус: смыкание моляров и клыков по I классу Энгля, резцовое перекрытие до 1/3 коронки.",
		soapStatusLocalis: "Прикус: ортогнатический. Смыкание первых постоянных моляров и клыков по I классу Энгля. Сагиттальная щель отсутствует. Резцовое перекрытие в пределах 1/3 высоты коронок резцов.",
	},
	{
		id: "c_distal",
		titleRu: "Дистальный прикус (II класс Энгля)",
		mkb10Code: "K07.2",
		descriptionRu: "Мезиально-щечный бугор верхнего 1-го моляра смыкается впереди межбугорковой фиссуры нижнего 1-го моляра.",
		soapStatusLocalis: "Прикус: дистальный (II класс Энгля, K07.2). Сагиттальное несоответствие зубных рядов, ретрузия/протрузия верхних резцов. Нарушение контактов в боковых отделах.",
		recommendedPlanRu: "Ортодонтическая консультация, расчет ТРГ в боковой проекции, элайнеры или брекет-система.",
	},
	{
		id: "c_mesial",
		titleRu: "Мезиальный прикус (III класс Энгля)",
		mkb10Code: "K07.2",
		descriptionRu: "Мезиально-щечный бугор верхнего 1-го моляра смыкается позади фиссуры нижнего 1-го моляра (прогения).",
		soapStatusLocalis: "Прикус: мезиальный (III класс Энгля, K07.2). Обратное резцовое перекрытие во фронтальном отделе. Мезиальное соотношение клыков и моляров.",
		recommendedPlanRu: "Комплексная ортодонтическо-хирургическая консультация.",
	},
	{
		id: "c_deep",
		titleRu: "Глубокий прикус (Травмирующий)",
		mkb10Code: "K07.2",
		descriptionRu: "Резцовое перекрытие превышает 1/2–2/3 высоты коронки, контакт с десневым краем нёба/нижней десны.",
		soapStatusLocalis: "Прикус: глубокий резцовый прикус (K07.2). Перекрытие верхними резцами нижних на всю высоту коронок. Травматизация десневого края при смыкании.",
		recommendedPlanRu: "Разобщение прикуса, ортодонтическое внедрение резцов / экструзия боковых зубов.",
	},
	{
		id: "c_open",
		titleRu: "Открытый прикус (Вертикальная щель)",
		mkb10Code: "K07.2",
		descriptionRu: "Отсутствие окклюзионного смыкания между верхними и нижними зубами во фронтальном или боковом отделе.",
		soapStatusLocalis: "Прикус: открытый (K07.2). Вертикальная щель во фронтальном отделе 2-4 мм. Отсутствие смыкания зубов от 13 до 23.",
		recommendedPlanRu: "Миогимнастика, логопед, ортодонтическое лечение аппаратами.",
	},
	{
		id: "c_cross",
		titleRu: "Перекрестный прикус (Кросс-байт)",
		mkb10Code: "K07.2",
		descriptionRu: "Трансверзальное несоответствие зубных дуг, обратное щечное перекрытие в боковом отделе.",
		soapStatusLocalis: "Прикус: перекрестный (K07.2) односторонний/двусторонний. Нарушение боковой окклюзии, щечные бугры нижних зубов перекрывают верхние.",
		recommendedPlanRu: "Расширение верхней челюсти, ортодонтическая коррекция.",
	},
	{
		id: "c_attrition",
		titleRu: "Снижение высоты прикуса / Стираемость",
		mkb10Code: "K03.0",
		descriptionRu: "Патологическая стираемость твердых тканей зубов, потеря межальвеолярной высоты прикуса.",
		soapStatusLocalis: "Прикус: генерализованная патологическая стираемость твердых тканей зубов (K03.0). Снижение межальвеолярной высоты лица на 3-5 мм. Снижение тонуса жевательных мышц.",
		recommendedPlanRu: "Депрограмматор (сплинт/шина), сплинт-терапия, тотальная ортопедическая реконструкция прикуса.",
	},
];

export interface JawOcclusionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTarget?: JawOrOcclusionTarget;
	readonly onApply?: (finding: {
		code: JawOrOcclusionTarget;
		nameRu: string;
		titleRu: string;
		soapText: string;
		mkb10Code?: string;
	}) => void;
}

export const JawOcclusionModal: React.FC<JawOcclusionModalProps> = ({
	isOpen,
	onClose,
	initialTarget = "JU",
	onApply,
}) => {
	const [activeTab, setActiveTab] = useState<JawOrOcclusionTarget>(initialTarget);
	const [selectedPresetId, setSelectedPresetId] = useState<string>("");
	const [customComment, setCustomComment] = useState<string>("");

	useEffect(() => {
		if (isOpen) {
			setActiveTab(initialTarget);
			setSelectedPresetId("");
			setCustomComment("");
		}
	}, [isOpen, initialTarget]);

	// Close on Escape
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const currentPresets = activeTab === "JU"
		? UPPER_JAW_PRESETS
		: activeTab === "JL"
			? LOWER_JAW_PRESETS
			: OCCLUSION_PRESETS;

	const targetLabelRu = activeTab === "JU"
		? "Верхняя челюсть (JU / Maxilla)"
		: activeTab === "JL"
			? "Нижняя челюсть (JL / Mandibula)"
			: "Центральное соотношение / Прикус (C)";

	const targetShortTitle = activeTab === "JU" ? "Верхняя челюсть" : activeTab === "JL" ? "Нижняя челюсть" : "Прикус";

	const selectedPreset = currentPresets.find((p) => p.id === selectedPresetId);

	const handleApplyPreset = useCallback((preset: JawFindingPreset) => {
		const fullSoap = customComment.trim()
			? `${preset.soapStatusLocalis} Примечание: ${customComment.trim()}.`
			: preset.soapStatusLocalis;

		// 1. Dispatch custom event for 1-click 043/u diary update
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						targetCode: activeTab,
						targetNameRu: targetShortTitle,
						title: preset.titleRu,
						soap: {
							statusLocalis: fullSoap,
							diagnosis: preset.titleRu,
							recommendations: preset.recommendedPlanRu || undefined,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch {
			// Fallback event dispatch
		}

		onApply?.({
			code: activeTab,
			nameRu: targetShortTitle,
			titleRu: preset.titleRu,
			soapText: fullSoap,
			...(preset.mkb10Code ? { mkb10Code: preset.mkb10Code } : {}),
		});

		showToast(
			`Зафиксировано: ${targetShortTitle} — ${preset.titleRu}`,
			preset.isNorm ? "success" : "info",
		);

		onClose();
	}, [activeTab, customComment, onApply, onClose, targetShortTitle]);

	// 1-Click physiological norm (Mandate 8e)
	const handle1ClickNorm = useCallback(() => {
		const normPreset = currentPresets.find((p) => p.isNorm) ?? currentPresets[0];
		if (normPreset) {
			handleApplyPreset(normPreset);
		}
	}, [currentPresets, handleApplyPreset]);

	if (!isOpen) return null;

	const content = (
		<div
			className="fixed inset-0 z-[10000] bg-black/65 backdrop-blur-[4px] flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
			role="dialog"
			aria-modal="true"
			aria-label={`Диагностика: ${targetLabelRu}`}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			data-testid="jaw-occlusion-modal-overlay"
		>
			<div
				className="w-full max-w-2xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
				onClick={(e) => e.stopPropagation()}
				data-testid="jaw-occlusion-modal"
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
							<Compass size={20} />
						</div>
						<div className="flex flex-col min-w-0">
							<h3 className="text-base font-black text-[var(--odontogram-ink,#0f172a)] truncate">
								{targetLabelRu}
							</h3>
							<span className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
								Челюстно-окклюзионная диагностика и внесение в Форму 043/у
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* 1-Click Physiological Norm (Mandate 8e) */}
						<button
							type="button"
							onClick={handle1ClickNorm}
							className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 touch-manipulation"
							title="1 клик: Физиологическая норма"
							data-testid="jaw-1click-norm-btn"
						>
							<Zap size={14} className="text-emerald-600 dark:text-emerald-400" />
							<span>Норма (1 клик)</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-w-[44px] min-h-[44px] sm:min-h-[32px] w-10 h-10 rounded-xl bg-[var(--odontogram-surface-hover,#f1f5f9)] hover:bg-rose-500 hover:text-white text-[var(--odontogram-ink-muted,#64748b)] flex items-center justify-center transition-all cursor-pointer shrink-0"
							title="Закрыть (Esc)"
							aria-label="Закрыть"
							data-testid="jaw-modal-close-btn"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* 3 Tabs: JU / C / JL Segmented Control */}
				<div className="p-3 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface-hover,#f1f5f9)]/50">
					<div
						className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shadow-2xs"
						role="tablist"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "JU"}
							onClick={() => {
								setActiveTab("JU");
								setSelectedPresetId("");
							}}
							className={`min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
								activeTab === "JU"
									? "bg-indigo-600 text-white shadow-xs"
									: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
							}`}
							data-testid="jaw-tab-ju"
						>
							<Layers size={14} />
							<span>В/Ч (JU) Верхняя</span>
						</button>

						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "C"}
							onClick={() => {
								setActiveTab("C");
								setSelectedPresetId("");
							}}
							className={`min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
								activeTab === "C"
									? "bg-purple-600 text-white shadow-xs"
									: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
							}`}
							data-testid="jaw-tab-c"
						>
							<CircleDot size={14} />
							<span>Прикус (C) Окклюзия</span>
						</button>

						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "JL"}
							onClick={() => {
								setActiveTab("JL");
								setSelectedPresetId("");
							}}
							className={`min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 touch-manipulation ${
								activeTab === "JL"
									? "bg-indigo-600 text-white shadow-xs"
									: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
							}`}
							data-testid="jaw-tab-jl"
						>
							<Layers size={14} />
							<span>Н/Ч (JL) Нижняя</span>
						</button>
					</div>
				</div>

				{/* Presets List */}
				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
					<div className="text-xs font-black uppercase text-[var(--odontogram-ink-muted,#64748b)] tracking-wider">
						Выберите клиническое состояние или патологию:
					</div>

					<div className="flex flex-col gap-2">
						{currentPresets.map((preset) => {
							const isSelected = selectedPresetId === preset.id;
							return (
								<div
									key={preset.id}
									onClick={() => setSelectedPresetId(preset.id)}
									className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col gap-1.5 touch-manipulation ${
										isSelected
											? "bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs"
											: preset.isNorm
												? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/30"
												: "bg-[var(--odontogram-paper,#ffffff)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] border-[var(--odontogram-border-subtle,#e2e8f0)]"
									}`}
									data-testid={`jaw-preset-${preset.id}`}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-2 min-w-0">
											<div
												className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
													isSelected
														? "bg-indigo-600 border-indigo-600 text-white"
														: preset.isNorm
															? "border-emerald-500 text-emerald-600"
															: "border-[var(--odontogram-border,#cbd5e1)] text-transparent"
												}`}
											>
												<Check size={12} />
											</div>
											<span className="text-sm font-black text-[var(--odontogram-ink,#0f172a)] truncate">
												{preset.titleRu}
											</span>
										</div>

										<div className="flex items-center gap-1.5 shrink-0">
											{preset.mkb10Code && (
												<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink-muted,#64748b)]">
													{preset.mkb10Code}
												</span>
											)}
											{preset.isNorm && (
												<span className="text-[11px] font-black px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
													Норма
												</span>
											)}
										</div>
									</div>

									<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] pl-7">
										{preset.descriptionRu}
									</p>
								</div>
							);
						})}
					</div>

					{/* Custom Doctor Note */}
					<div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--odontogram-border-subtle,#e2e8f0)]">
						<label className="text-xs font-bold text-[var(--odontogram-ink,#0f172a)]">
							Дополнительное клиническое примечание к дневнику (опционально):
						</label>
						<input
							type="text"
							value={customComment}
							onChange={(e) => setCustomComment(e.target.value)}
							placeholder="Например: умеренная болезненность в ретромолярной области, плотный контакт..."
							className="w-full min-h-[44px] sm:min-h-[32px] px-3 py-2 rounded-xl border border-[var(--odontogram-border,#cbd5e1)] bg-[var(--odontogram-paper,#ffffff)] text-xs text-[var(--odontogram-ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
							data-testid="jaw-modal-custom-comment-input"
						/>
					</div>
				</div>

				{/* Modal Footer */}
				<div className="flex items-center justify-between p-4 border-t border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] sm:min-h-[32px] px-4 py-2 rounded-xl text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] transition-colors cursor-pointer"
					>
						Отмена
					</button>

					<button
						type="button"
						disabled={false}
						onClick={() => {
							const defaultNormPresetId = activeTab === "JU" ? "ju_norm" : activeTab === "JL" ? "jl_norm" : "c_orthognathic";
							const presetToApply = selectedPreset || currentPresets.find((p) => p.id === defaultNormPresetId) || currentPresets.find((p) => p.isNorm) || currentPresets[0];
							if (presetToApply) {
								handleApplyPreset(presetToApply);
							}
						}}
						className={`min-h-[44px] sm:min-h-[32px] px-5 py-2 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
							selectedPreset
								? "bg-indigo-600 hover:bg-indigo-700 text-white"
								: "bg-emerald-600 hover:bg-emerald-700 text-white"
						}`}
						data-testid="jaw-modal-apply-btn"
					>
						{selectedPreset ? <Check size={14} /> : <Zap size={14} />}
						<span>{selectedPreset ? "Внести в карту 043/у (1 клик)" : "Норма в 1 клик (043/у)"}</span>
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}
	return content;
};
