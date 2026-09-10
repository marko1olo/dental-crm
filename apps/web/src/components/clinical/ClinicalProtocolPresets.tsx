/**
 * ClinicalProtocolPresets.tsx — Пакетные экспресс-пресеты «Диагноз МКБ-10 + Услуга 804н» в 1 клик.
 *
 * СООТВЕТСТВИЕ КОНСТИТУЦИИ И МАНДАТАМ:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Friction-Killer Law (Мандат 8k): CRM — не симулятор реальности, а инструмент снижения трения.
 *   Врач-стоматолог не должен отдельно искать диагноз по МКБ-10, а затем отдельно подбирать код услуги по 804н.
 * - Суверенитет амбулаторного стоматологического контекста (Мандат 8i):
 *   Устранение академического блоата. 5 базовых клинических пакетов покрывают >85% амбулаторного приёма.
 * - Автономия врача (Мандат 8e):
 *   0 заблокированных (disabled) кнопок без причины. Все пресеты доступны всегда в 1 клик.
 * - Святость официальных документов (Мандат 8d п. 7):
 *   Ноль мультяшных эмодзи в медицинских записях и протоколах (строго векторные иконки Lucide).
 */

import {
	Check,
	Layers,
	Scissors,
	ShieldCheck,
	Sparkles,
	Syringe,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";

export type ClinicalBundleCategory = "therapy" | "endo" | "hygiene" | "surgery" | "inspection";

export interface FastClinicalBundle {
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly order804nCode: string;
	readonly order804nName: string;
	readonly category: ClinicalBundleCategory;
	readonly defaultPriceKopecks: number; // Целочисленные копейки (Мандат 8b)
	readonly diarySnippet: string;
	readonly recommendations: string;
}

/**
 * 5 канонических экспресс-связок «Диагноз МКБ-10 + Услуга 804н» (Мандаты 8e, 8i, 8k):
 * 1. «Кариес дентина» -> МКБ-10 К02.1 + Номенклатура 804н A16.07.002.010 (Пломбирование зуба фотокомпозитом);
 * 2. «Пульпит острый» -> МКБ-10 К04.0 + Номенклатура 804н A16.07.010 (Эндодонтическое лечение);
 * 3. «Периодонтит» -> МКБ-10 К04.4 + Номенклатура 804н A16.07.030 (Инструментальная обработка каналов);
 * 4. «Профгигиена / УЗ-чистка» -> МКБ-10 К05.0 + Номенклатура 804н A16.07.051 (Профессиональная гигиена);
 * 5. «Удаление зуба простое» -> МКБ-10 К08.8 + Номенклатура 804н A16.07.001 (Удаление постоянного зуба).
 */
export const FAST_CLINICAL_BUNDLES: readonly FastClinicalBundle[] = [
	{
		id: "caries_dentin",
		title: "Кариес дентина",
		subtitle: "Пломбирование зуба фотокомпозитом",
		icd10Code: "K02.1",
		icd10Title: "Кариес дентина (Caries of dentine)",
		order804nCode: "A16.07.002.010",
		order804nName:
			"Восстановление зуба пломбой с использованием материалов из фотополимеров (пломбирование зуба фотокомпозитом)",
		category: "therapy",
		defaultPriceKopecks: 450000, // 4 500 ₽
		diarySnippet:
			"Жалобы на кратковременные боли от температурных и химических раздражителей. Под местной анестезией проведено препарирование кариозной полости, некрэктомия, адгезивный протокол, послойное пломбирование зуба светоотверждаемым нанокомпозитом. Шлифовка, полировка по окклюзии до сухого блеска.",
		recommendations:
			"Не принимать пищу до окончания действия анестезии (1.5-2 часа во избежание прикусывания щеки/губы). Избегать употребления красящих продуктов 24 часа. Контрольный осмотр через 6 месяцев.",
	},
	{
		id: "pulpitis_acute",
		title: "Пульпит острый",
		subtitle: "Эндодонтическое лечение",
		icd10Code: "K04.0",
		icd10Title: "Пульпит (Pulpitis)",
		order804nCode: "A16.07.010",
		order804nName: "Эндодонтическое лечение (пульпотомия, экстирпация пульпы)",
		category: "endo",
		defaultPriceKopecks: 780000, // 7 800 ₽
		diarySnippet:
			"Жалобы на острые приступообразные самопроизвольные боли с иррадиацией, усиливающиеся в ночное время. Под местной проводниковой/инфильтрационной анестезией проведено раскрытие полости зуба, ампутация и экстирпация коронковой и корневой пульпы, медикаментозная обработка каналов, временная обтурация лечебным препаратом.",
		recommendations:
			"При сохранении болевого синдрома — прием НПВС (Ибупрофен 400 мг / Нимесулид 100 мг). Повторный визит для окончательной обтурации каналов гуттаперчей через 7-10 дней.",
	},
	{
		id: "periodontitis",
		title: "Периодонтит",
		subtitle: "Инструментальная обработка каналов",
		icd10Code: "K04.4",
		icd10Title: "Острый апикальный периодонтит пульпарного происхождения",
		order804nCode: "A16.07.030",
		order804nName: "Инструментальная и медикаментозная обработка корневого канала",
		category: "endo",
		defaultPriceKopecks: 650000, // 6 500 ₽
		diarySnippet:
			"Жалобы на постоянную ноющую боль, ощущение «выросшего зуба», резкую болезненность при накусывании. Перкуссия резко положительная. Проведена инструментальная механическая и медикаментозная обработка корневых каналов 3% р-ром гипохлорита натрия, ультразвуковая активация, внесение пасты гидроксида кальция под герметичную повязку.",
		recommendations:
			"Щадящая диета, механическая разгрузка зуба (не жевать на причинную сторону). Контрольный визит через 10-14 дней.",
	},
	{
		id: "hygiene_ultrasound",
		title: "Профгигиена / УЗ-чистка",
		subtitle: "Профессиональная гигиена",
		icd10Code: "K05.0",
		icd10Title: "Острый гингивит",
		order804nCode: "A16.07.051",
		order804nName: "Профессиональная гигиена полости рта и зубов",
		category: "hygiene",
		defaultPriceKopecks: 500000, // 5 000 ₽
		diarySnippet:
			"Жалобы на кровоточивость десен при чистке зубов, наличие твердого пигментированного налета. Проведено ультразвуковое удаление над- и поддесневых зубных отложений во всех квадрантах, воздушно-абразивная полировка Air-Flow, полировка пастой без фтора, аппликация реминерализующего геля.",
		recommendations:
			"Замена зубной щетки на новую мягкую. Полоскания антисептиком (Хлоргексидин 0.05%) 5-7 дней после еды. Повторная гигиена через 6 месяцев.",
	},
	{
		id: "extraction_simple",
		title: "Удаление зуба простое",
		subtitle: "Удаление постоянного зуба",
		icd10Code: "K08.8",
		icd10Title: "Другие уточненные изменения зубов и их опорного аппарата",
		order804nCode: "A16.07.001",
		order804nName: "Удаление постоянного зуба",
		category: "surgery",
		defaultPriceKopecks: 350000, // 3 500 ₽
		diarySnippet:
			"Показания к удалению: полное разрушение коронковой части зуба ниже уровня десны, невозможность ортопедического восстановления. Под проводниковой/инфильтрационной анестезией проведена отслойка круговой связки, люксация элеватором, атравматичная экстракция щипцами. Ревизия лунки, гемостаз гемостатической губкой, прижатие марлевым тампоном.",
		recommendations:
			"Марлевый тампон сплюнуть через 20 минут. Не принимать пищу 2 часа. Не полоскать полость рта 3 дня (сохранение кровяного сгустка). Исключить бани, сауны, горячий душ и физические нагрузки 3 дня. При болях — Нимесулид 100 мг.",
	},
	{
		id: "norm_checkup",
		title: "Осмотр / Здоров (Норма)",
		subtitle: "Полость рта санирована (СтАР)",
		icd10Code: "Z01.2",
		icd10Title: "Стоматологическое обследование (Здоров / Санирован)",
		order804nCode: "A01.07.001",
		order804nName: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "inspection",
		defaultPriceKopecks: 100000, // 1 000 ₽
		diarySnippet:
			"Жалоб нет. Профилактический осмотр. Зубные ряды интактны, прикус физиологический. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических элементов. Патологии твердых тканей зубов и пародонта не выявлено. Полость рта санирована.",
		recommendations:
			"Соблюдение индивидуальной гигиены полости рта (чистка зубов 2 раза в день, зубная нить/ершики). Плановый профилактический осмотр через 6 месяцев.",
	},
];

export function getFastClinicalBundle(id: string): FastClinicalBundle | undefined {
	return FAST_CLINICAL_BUNDLES.find((b) => b.id === id);
}

export function findBundleByIcd10(icd10: string): FastClinicalBundle | undefined {
	return FAST_CLINICAL_BUNDLES.find((b) => b.icd10Code === icd10);
}

export function findBundleBy804n(code: string): FastClinicalBundle | undefined {
	return FAST_CLINICAL_BUNDLES.find((b) => b.order804nCode === code);
}

export interface ClinicalProtocolPresetsProps {
	readonly onSelectBundle?: ((bundle: FastClinicalBundle) => void) | undefined;
	readonly selectedBundleId?: string | null | undefined;
	readonly selectedIcd10?: string | null | undefined;
	readonly toothNumber?: number | string | null | undefined;
	readonly isCompact?: boolean | undefined;
	readonly className?: string | undefined;
}

const CATEGORY_BADGES: Record<
	ClinicalBundleCategory,
	{ label: string; bgClass: string; textClass: string; icon: React.FC<{ className?: string }> }
> = {
	therapy: {
		label: "Терапия",
		bgClass: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800",
		textClass: "text-teal-700 dark:text-teal-300",
		icon: Sparkles,
	},
	endo: {
		label: "Эндодонтия",
		bgClass: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
		textClass: "text-indigo-700 dark:text-indigo-300",
		icon: Syringe,
	},
	hygiene: {
		label: "Гигиена",
		bgClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
		textClass: "text-emerald-700 dark:text-emerald-300",
		icon: ShieldCheck,
	},
	surgery: {
		label: "Хирургия",
		bgClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
		textClass: "text-amber-700 dark:text-amber-300",
		icon: Scissors,
	},
	inspection: {
		label: "Осмотр / Норма",
		bgClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
		textClass: "text-emerald-700 dark:text-emerald-300",
		icon: ShieldCheck,
	},
};

export const ClinicalProtocolPresets: React.FC<ClinicalProtocolPresetsProps> = ({
	onSelectBundle,
	selectedBundleId,
	selectedIcd10,
	toothNumber,
	isCompact = false,
	className = "",
}) => {
	const activeBundleId = useMemo(() => {
		if (selectedBundleId) return selectedBundleId;
		if (selectedIcd10) {
			const matched = findBundleByIcd10(selectedIcd10);
			return matched?.id ?? null;
		}
		return null;
	}, [selectedBundleId, selectedIcd10]);

	return (
		<div
			className={`clinical-protocol-presets flex flex-col gap-3 w-full ${className}`}
			data-testid="clinical-protocol-presets-container"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--teal-surface,#e6fffa)] text-[var(--teal,#0d9488)] border border-[var(--line,#e2e8f0)] dark:border-slate-700">
						<Layers className="w-4 h-4" />
					</div>
					<div>
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white uppercase tracking-wider">
							Экспресс-пресеты 1-клик: МКБ-10 + 804н
						</span>
						{toothNumber ? (
							<span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
								{`Зуб #${toothNumber}`}
							</span>
						) : null}
					</div>
				</div>
				<span className="text-[11px] text-[var(--muted,#64748b)]">
					Снижение трения: связка диагноза и услуги без ручного поиска
				</span>
			</div>

			<div
				className={`grid gap-2.5 ${
					isCompact
						? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6"
						: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
				}`}
			>
				{FAST_CLINICAL_BUNDLES.map((bundle) => {
					const isSelected = activeBundleId === bundle.id;
					const cat = CATEGORY_BADGES[bundle.category];
					const CatIcon = cat.icon;
					const priceRub = Math.round(bundle.defaultPriceKopecks / 100);

					return (
						<button
							key={bundle.id}
							type="button"
							data-testid={`bundle-btn-${bundle.id}`}
							onClick={() => onSelectBundle?.(bundle)}
							aria-pressed={isSelected}
							className={`relative flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer min-h-[44px] select-none ${
								isSelected
									? "bg-[var(--teal-surface,#f0fdfa)] border-[var(--teal,#0d9488)] shadow-sm ring-1 ring-[var(--teal,#0d9488)]"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-[var(--line,#e2e8f0)] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-800/60"
							}`}
						>
							<div className="flex items-center justify-between gap-1.5 w-full mb-1.5">
								<span
									className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.bgClass} ${cat.textClass}`}
								>
									<CatIcon className="w-3 h-3 shrink-0" />
									<span>{cat.label}</span>
								</span>
								{isSelected ? (
									<span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--teal,#0d9488)] text-white">
										<Check className="w-3 h-3" />
									</span>
								) : (
									<span className="text-[11px] font-semibold text-[var(--muted,#64748b)]">
										{priceRub.toLocaleString("ru-RU")} ₽
									</span>
								)}
							</div>

							<div className="font-bold text-xs text-[var(--ink,#0f172a)] dark:text-white leading-tight mb-1 line-clamp-1">
								{bundle.title}
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)] leading-snug line-clamp-1 mb-2">
								{bundle.subtitle}
							</div>

							<div className="mt-auto pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between text-[10px] font-mono text-[var(--muted,#64748b)]">
								<span className="font-bold text-slate-800 dark:text-slate-200">
									{bundle.icd10Code}
								</span>
								<span className="truncate max-w-[110px]" title={bundle.order804nCode}>
									{bundle.order804nCode}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
