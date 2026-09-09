/**
 * ToothStatusPalette.tsx — 1-клик палитра состояний зуба и клинических пресетов.
 *
 * МАНДАТ 8k: ЦРМ — не симулятор реальности, а инструмент снижения трения.
 * Врач не должен кликать каждый камешек или нажимать 50 кнопок.
 * Мгновенные клинические пресеты в 1 клик:
 * 1. «Зубная формула: Интактный зубной ряд (Все зубы здоровы / норма)» в 1 клик.
 * 2. «Профгигиена выполнена (Ультразвук + Air-Flow + полировка)» в 1 клик с формированием протокола 043/у.
 * 3. «Быстрая пломба/кариес (K02.1)» для выбранного зуба в 1 клик.
 * 4. «Адентия 8-ок (18, 28, 38, 48)» в 1 клик.
 *
 * МАНДАТ 8e: Автономия врача у кресла, touch-target >= 44px, никаких disabled кнопок.
 */

import React from "react";
import {
	Activity,
	Check,
	CheckCircle2,
	Crown,
	Flame,
	Hammer,
	Paintbrush,
	Sparkles,
	Trash2,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import { type ToothState, TOOTH_STATE_LABELS } from "./ToothChart";
import { showToast } from "../GlobalToast";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";

export interface FastToothPreset {
	id: string;
	title: string;
	shortTitle: string;
	description: string;
	badge: string;
	icd10?: string;
	code804n?: string;
}

export const FAST_TOOTH_PRESETS: readonly FastToothPreset[] = [
	{
		id: "intact_dentition",
		title: "Интактный зубной ряд (Все зубы здоровы / норма)",
		shortTitle: "Интактный (Норма)",
		description: "Все 32 зуба отмечаются здоровыми (медосмотр, военкомат, бассейн, санация)",
		badge: "Норма",
		icd10: "Z01.2",
	},
	{
		id: "pro_hygiene_done",
		title: "Профгигиена выполнена (Ультразвук + Air-Flow + полировка)",
		shortTitle: "Профгигиена (УЗ + Air-Flow)",
		description: "Снятие зубных отложений УЗ + Air-Flow + полировка Detartrine + фторирование Bifluorid",
		badge: "043/у",
		icd10: "Z01.2",
		code804n: "A16.07.051",
	},
	{
		id: "fast_caries_k021",
		title: "Быстрая пломба / кариес дентина (K02.1)",
		shortTitle: "Пломба/Кариес (K02.1)",
		description: "Препарирование кариозной полости, медобработка, адгезивный протокол, пломба светового отверждения",
		badge: "K02.1",
		icd10: "K02.1",
		code804n: "A16.07.002.001",
	},
	{
		id: "wisdom_missing",
		title: "Адентия 8-ок (18, 28, 38, 48)",
		shortTitle: "Без 8-ок",
		description: "Зубы мудрости 18, 28, 38, 48 помечаются отсутствующими / удаленными",
		badge: "1 клик",
		icd10: "K08.1",
	},
	{
		id: "fast_pulpitis_turnkey",
		title: "Пульпит под ключ (K04.0: анестезия + каналы + обтурация + пломба)",
		shortTitle: "Пульпит под ключ (K04.0)",
		description: "Эндодонтическое лечение: анестезия, коффердам, обработка и пломбирование каналов, световая пломба",
		badge: "K04.0",
		icd10: "K04.0",
		code804n: "A16.07.030",
	},
	{
		id: "fast_extraction_turnkey",
		title: "Удаление зуба под ключ (K08.1: анестезия + удаление + гемостаз + шов)",
		shortTitle: "Удаление зуба (K08.1)",
		description: "Хирургический протокол: анестезия, периотомия, атравматичное удаление, ревизия, кюретаж, шов",
		badge: "K08.1",
		icd10: "K08.1",
		code804n: "A16.07.001",
	},
] as const;

/**
 * Протокол быстрой пломбы / кариеса дентина K02.1 для Формы 043/у
 */
export function applyFastCariesK021Protocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): на окклюзионной поверхности глубокая кариозная полость в пределах околопульпарного дентина. Дентин пигментирован, размягчен на дне. Зондирование дна безболезненно, по эмалево-дентинной границе чувствительно. Перкуссия безболезненна. Реакция на холод кратковременная, проходит сразу после устранения раздражителя.`;
	const diagnosis = `K02.1 Кариес дентина (средний/глубокий) зуба ${toothNumber}`;
	const treatment = `Анестезия инфильтрационная Артикаин 1:200000 1.7 мл. Препарирование кариозной полости зуба ${toothNumber}, некрэктомия. Медикаментозная обработка 2% р-ром хлоргексидина. Изоляция операционного поля коффердамом. Адгезивный протокол: протравливание эмали 37% ортофосфорной кислотой 15 сек., нанесение адгезива V поколения, полимеризация 20 сек. Восстановление анатомической формы светоотверждаемым наногибридным композитом послойно. Шлифовка, полировка пастой, финишный блеск.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.002.001",
		serviceName: `Восстановление зуба ${toothNumber} пломбой из фотополимерного композита при среднем/глубоком кариесе (K02.1)`,
		price: 4500,
	};
}

/**
 * Протокол комплексной профессиональной гигиены для Формы 043/у
 */
export function applyFastProHygieneProtocol(): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const statusLocalis =
		"Полость рта: над- и поддесневой зубной камень преимущественно в области нижних фронтальных зубов (33-43) с оральной поверхности и верхних моляров (16, 26) с вестибулярной поверхности. Мягкий пигментированный налет курильщика/чая. Десневые сосочки умеренно гиперемированы, отечны, кровоточивость при зондировании I-II ст. Индекс гигиены OHI-S = 1.8.";
	const diagnosis = "Z01.2 Стоматологическое обследование / K05.0 Острый гингивит (зубные отложения)";
	const treatment =
		"Проведена профессиональная гигиена полости рта в полном объеме: ультразвуковой скейлинг над- и поддесневых минерализованных зубных отложений аппаратом с ирригацией 0.05% хлоргексидином. Воздушно-абразивная обработка Air-Flow мелкодисперсным порошком на основе глицина (удаление пигментированного биопленочного налета). Полировка всех поверхностей зубов абразивной пастой и щеточками. Глубокое фторирование эмали и дентина лаком Bifluorid 12. Обучение индивидуальной гигиене, подбор зубной щетки и монопучка.";

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.051",
		serviceName:
			"Профессиональная гигиена полости рта: УЗ-скейлинг + Air-Flow глицин + полировка пастой + фторирование Bifluorid 12",
		price: 5500,
	};
}

/**
 * Протокол лечения пульпита K04.0 под ключ для Формы 043/у
 */
export function applyFastPulpitisProtocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование устья корневых каналов резко болезненно, пульпа кровоточит. Термическая проба (холод) вызывает интенсивную приступообразную боль с длительным последействием. Перкуссия слабочувствительна. Слизистая оболочка в области верхушки корня без видимых воспалительных изменений.`;
	const diagnosis = `K04.0 Пульпит (острый очаговый/диффузный) зуба ${toothNumber}`;
	const treatment = `Инфильтрационная/проводниковая анестезия Артикаин 1:100000 1.7 мл. Изоляция коффердамом. Препарирование кариозной полости зуба ${toothNumber}, раскрытие полости зуба, экстирпация пульпы. Инструментальная обработка каналов Ni-Ti вращающимися файлами до апикального уступа. Ирригация 3% раствором NaOCl с ультразвуковой активацией, промывание 17% ЭДТА, дистиллированной водой. Высушивание стерильными бумажными штифтами. Обтурация корневых каналов методом латеральной конденсации гуттаперчевыми штифтами с эпоксидным силером AH-Plus. Рентген-контроль обтурации: каналы запломбированы до физиологического апекса. Герметичная изолирующая прокладка, восстановление анатомической формы зуба нанокомпозитом светового отверждения. Шлифовка, полировка.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.030",
		serviceName: `Эндодонтическое лечение пульпита зуба ${toothNumber} под ключ (анестезия + обработка каналов + обтурация + пломба)`,
		price: 12500,
	};
}

/**
 * Протокол атравматичного удаления зуба K08.1 под ключ для Формы 043/у
 */
export function applyFastExtractionProtocol(toothNumber: number): {
	statusLocalis: string;
	diagnosis: string;
	treatment: string;
	serviceCode: string;
	serviceName: string;
	price: number;
} {
	const toothName = getToothFolkAndAnatomicalNameRu(toothNumber);
	const statusLocalis = `Зуб ${toothNumber} (${toothName}): коронковая часть зуба разрушена твердыми тканями ниже уровня десны более чем на 2/3. Корень устойчив, зондирование разрушенных тканей безболезненно. Перкуссия безболезненна. Переходная складка интактна, без отека и гиперемии. Зуб не подлежит терапевтическому, эндодонтическому или ортопедическому восстановлению.`;
	const diagnosis = `K08.1 Потеря зубов вследствие удаления / разрушение корня зуба ${toothNumber}`;
	const treatment = `Проводниковая/инфильтрационная анестезия Артикаин 1:100000 1.7 мл. Круговая связка зуба ${toothNumber} отсепарирована периотомом. Наложение хирургических щипцов/элеватора. Люксация и тракция зуба атравматично с сохранением кортикальных пластинок альвеолы. Ревизия лунки, кюретаж грануляций. Гемостаз гемостатической губкой Alveostim. Сближение краев лунки, наложение направляющего гемостатического шва шовным материалом Vicryl 4-0. Контроль гемостаза: кровотечение остановлено, стабильный сгусток. Рекомендации после удаления выданы на руки.`;

	return {
		statusLocalis,
		diagnosis,
		treatment,
		serviceCode: "A16.07.001",
		serviceName: `Атравматичное удаление зуба ${toothNumber} под ключ (анестезия + периотомия + удаление + кюретаж + гемостаз + шов)`,
		price: 4500,
	};
}

export interface ToothStatusPaletteProps {
	selectedTooth?: number | null | undefined;
	activeStamp?: ToothState | null | undefined;
	onSelectState?: ((state: ToothState, surfaces?: readonly string[]) => void) | undefined;
	onStampChange?: ((stamp: ToothState | null) => void) | undefined;
	onMarkIntact?: (() => void) | undefined;
	onMarkProHygieneDone?: (() => void) | undefined;
	onApplyFastCaries?: ((toothNumber: number) => void) | undefined;
	onApplyFastPulpitis?: ((toothNumber: number) => void) | undefined;
	onApplyFastExtraction?: ((toothNumber: number) => void) | undefined;
	onMarkWisdomMissing?: (() => void) | undefined;
	className?: string | undefined;
}

export const ToothStatusPalette: React.FC<ToothStatusPaletteProps> = ({
	selectedTooth,
	activeStamp,
	onSelectState,
	onStampChange,
	onMarkIntact,
	onMarkProHygieneDone,
	onApplyFastCaries,
	onApplyFastPulpitis,
	onApplyFastExtraction,
	onMarkWisdomMissing,
	className = "",
}) => {
	const currentTooth = selectedTooth ?? 16;

	// 1. «Зубная формула: Интактный зубной ряд (Все зубы здоровы / норма)» в 1 клик
	const handleIntactClick = () => {
		if (onMarkIntact) {
			onMarkIntact();
		} else {
			window.dispatchEvent(
				new CustomEvent("dente-apply-intact-dentition", {
					detail: { immediate: true },
				}),
			);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Зубная формула: Интактный зубной ряд (Все зубы здоровы / норма)", "success");
	};

	// 2. «Профгигиена выполнена (Ультразвук + Air-Flow + полировка)» в 1 клик с формированием протокола 043/у
	const handleProHygieneClick = () => {
		if (onMarkProHygieneDone) {
			onMarkProHygieneDone();
		} else {
			const proto = applyFastProHygieneProtocol();
			// Дневник 043/у
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							statusLocalis: proto.statusLocalis,
							diagnosis: proto.diagnosis,
							treatmentPlan: proto.treatment,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
			// В смету
			window.dispatchEvent(
				new CustomEvent("dente-add-estimate-service", {
					detail: {
						code: proto.serviceCode,
						name: proto.serviceName,
						price: proto.price,
						category: "hygiene",
					},
				}),
			);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			"Профгигиена выполнена: УЗ-скейлинг + Air-Flow + полировка внесены в карту 043/у и смету",
			"success",
		);
	};

	// 3. «Быстрая пломба/кариес (K02.1)» для выбранного зуба в 1 клик
	const handleFastCariesClick = () => {
		const targetTooth = currentTooth;
		if (onApplyFastCaries) {
			onApplyFastCaries(targetTooth);
		} else {
			if (onSelectState) {
				onSelectState("Caries", ["O"]);
			}
			const proto = applyFastCariesK021Protocol(targetTooth);
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						toothNumber: targetTooth,
						soap: {
							statusLocalis: proto.statusLocalis,
							diagnosis: proto.diagnosis,
							treatmentPlan: proto.treatment,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-add-estimate-service", {
					detail: {
						toothNumber: targetTooth,
						code: proto.serviceCode,
						name: proto.serviceName,
						price: proto.price,
						category: "therapy",
					},
				}),
			);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Быстрая пломба/кариес K02.1 зуба ${targetTooth} внесены в формулу и дневник 043/у`,
			"success",
		);
	};

	// 4. «Адентия 8-ок» в 1 клик
	const handleWisdomMissingClick = () => {
		if (onMarkWisdomMissing) {
			onMarkWisdomMissing();
		} else {
			window.dispatchEvent(
				new CustomEvent("dente-mark-wisdom-missing", {
					detail: { teeth: [18, 28, 38, 48], immediate: true },
				}),
			);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Адентия 8-ок: зубы 18, 28, 38, 48 отмечены отсутствующими", "info");
	};

	// 5. «Пульпит под ключ (K04.0)» в 1 клик
	const handleFastPulpitisClick = () => {
		const targetTooth = currentTooth;
		if (onApplyFastPulpitis) {
			onApplyFastPulpitis(targetTooth);
		} else {
			if (onSelectState) {
				onSelectState("Pulpitis", ["O"]);
			}
			const proto = applyFastPulpitisProtocol(targetTooth);
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						toothNumber: targetTooth,
						soap: {
							statusLocalis: proto.statusLocalis,
							diagnosis: proto.diagnosis,
							treatmentPlan: proto.treatment,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-add-estimate-service", {
					detail: {
						toothNumber: targetTooth,
						code: proto.serviceCode,
						name: proto.serviceName,
						price: proto.price,
						category: "endo",
					},
				}),
			);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Пульпит под ключ K04.0 зуба ${targetTooth} внесен в формулу, дневник 043/у и смету`,
			"success",
		);
	};

	// 6. «Удаление зуба (K08.1)» в 1 клик
	const handleFastExtractionClick = () => {
		const targetTooth = currentTooth;
		if (onApplyFastExtraction) {
			onApplyFastExtraction(targetTooth);
		} else {
			if (onSelectState) {
				onSelectState("Missing");
			}
			const proto = applyFastExtractionProtocol(targetTooth);
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						toothNumber: targetTooth,
						soap: {
							statusLocalis: proto.statusLocalis,
							diagnosis: proto.diagnosis,
							treatmentPlan: proto.treatment,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-add-estimate-service", {
					detail: {
						toothNumber: targetTooth,
						code: proto.serviceCode,
						name: proto.serviceName,
						price: proto.price,
						category: "surgery",
					},
				}),
			);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Удаление зуба ${targetTooth} внесено в формулу, хирургический дневник 043/у и смету`,
			"success",
		);
	};

	return (
		<div
			className={`tooth-status-palette flex flex-col gap-2 p-2.5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border,#cbd5e1)] shadow-xs select-none ${className}`.trim()}
			data-testid="tooth-status-palette"
			role="region"
			aria-label="Палитра статусов и клинических пресетов"
		>
			{/* Row 1: 1-Click Zero-Friction Express Clinical Presets (Mandates 8e, 8k) */}
			<div className="flex items-center gap-1.5 flex-wrap">
				<div className="flex items-center gap-1 text-xs font-black text-[var(--odontogram-ink-muted,#64748b)] mr-1">
					<Sparkles size={14} className="text-amber-500" />
					<span>1-клик пресеты:</span>
				</div>

				<button
					type="button"
					onClick={handleIntactClick}
					disabled={false}
					className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs"
					title="Зубная формула: Интактный зубной ряд (Все зубы здоровы / норма) в 1 клик"
					data-testid="palette-intact-btn"
				>
					<CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
					<span>Интактный (Все здоровы)</span>
				</button>

				<button
					type="button"
					onClick={handleProHygieneClick}
					disabled={false}
					className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-200 border border-teal-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs"
					title="Профгигиена выполнена (Ультразвук + Air-Flow + полировка) в 1 клик с формированием протокола 043/у"
					data-testid="palette-prophy-btn"
				>
					<Zap size={14} className="text-teal-600 dark:text-teal-400" />
					<span>Профгигиена выполнена (УЗ + Air-Flow)</span>
				</button>

				<button
					type="button"
					onClick={handleFastCariesClick}
					disabled={false}
					className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs"
					title={`Быстрая пломба/кариес (K02.1) для зуба ${currentTooth} в 1 клик с заполнением дневника 043/у`}
					data-testid="palette-fast-caries-btn"
				>
					<Wrench size={14} className="text-amber-600 dark:text-amber-400" />
					<span>Быстрая пломба (K02.1 зуба {currentTooth})</span>
				</button>

				<button
					type="button"
					onClick={handleFastPulpitisClick}
					disabled={false}
					className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-200 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs"
					title={`Пульпит под ключ (K04.0) зуба ${currentTooth}: анестезия + каналы + обтурация + пломба`}
					data-testid="palette-fast-pulpitis-btn"
				>
					<Flame size={14} className="text-rose-600 dark:text-rose-400" />
					<span>Пульпит под ключ (K04.0 зуба {currentTooth})</span>
				</button>

				<button
					type="button"
					onClick={handleFastExtractionClick}
					disabled={false}
					className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black bg-purple-500/15 hover:bg-purple-500/25 text-purple-800 dark:text-purple-200 border border-purple-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs"
					title={`Атравматичное удаление зуба ${currentTooth} под ключ: анестезия + периотомия + удаление + гемостаз + шов`}
					data-testid="palette-fast-extraction-btn"
				>
					<Trash2 size={14} className="text-purple-600 dark:text-purple-400" />
					<span>Удаление под ключ (зуб {currentTooth})</span>
				</button>

				<button
					type="button"
					onClick={handleWisdomMissingClick}
					disabled={false}
					className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-800 dark:text-zinc-200 border border-zinc-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs"
					title="Адентия 8-ок: зубы 18, 28, 38, 48 моментально помечаются отсутствующими"
					data-testid="palette-wisdom-btn"
				>
					<Trash2 size={14} className="text-zinc-500" />
					<span>Без 8-ок</span>
				</button>
			</div>

			{/* Row 2: Direct Tooth Stamps (Touch Targets >= 44x44px for gloved doctors) */}
			{onStampChange && (
				<div
					className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-[var(--odontogram-border-subtle,#e2e8f0)]"
					role="group"
					aria-label="Режим штампа патологий"
				>
					<div className="flex items-center gap-1 text-xs font-black text-[var(--odontogram-ink-muted,#64748b)] mr-1">
						<Paintbrush size={14} className={activeStamp ? "text-indigo-500 animate-pulse" : ""} />
						<span>Штамп:</span>
					</div>

					<button
						type="button"
						onClick={() => onStampChange(activeStamp === "Caries" ? null : "Caries")}
						className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
							activeStamp === "Caries"
								? "bg-amber-600 text-white font-black shadow-xs ring-2 ring-amber-400"
								: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/20"
						}`}
						data-testid="palette-stamp-caries"
					>
						<span>Кариес (К)</span>
					</button>

					<button
						type="button"
						onClick={() => onStampChange(activeStamp === "Pulpitis" ? null : "Pulpitis")}
						className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
							activeStamp === "Pulpitis"
								? "bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-400"
								: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20"
						}`}
						data-testid="palette-stamp-pulpitis"
					>
						<span>Пульпит (Ф)</span>
					</button>

					<button
						type="button"
						onClick={() => onStampChange(activeStamp === "Periodontitis" ? null : "Periodontitis")}
						className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
							activeStamp === "Periodontitis"
								? "bg-orange-600 text-white font-black shadow-xs ring-2 ring-orange-400"
								: "bg-orange-500/10 text-orange-800 dark:text-orange-200 hover:bg-orange-500/20 border border-orange-500/20"
						}`}
						data-testid="palette-stamp-periodontitis"
					>
						<span>Периодонтит (Пт)</span>
					</button>

					<button
						type="button"
						onClick={() => onStampChange(activeStamp === "Filled" ? null : "Filled")}
						className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
							activeStamp === "Filled"
								? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs ring-2 ring-[var(--teal)]/60"
								: "bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] hover:opacity-90 border border-[var(--teal,#0d9488)]/30"
						}`}
						data-testid="palette-stamp-filled"
					>
						<span>Пломба (П)</span>
					</button>

					<button
						type="button"
						onClick={() => onStampChange(activeStamp === "Crown" ? null : "Crown")}
						className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
							activeStamp === "Crown"
								? "bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400"
								: "bg-blue-500/10 text-blue-800 dark:text-blue-200 hover:bg-blue-500/20 border border-blue-500/20"
						}`}
						data-testid="palette-stamp-crown"
					>
						<span>Коронка (Кр)</span>
					</button>

					<button
						type="button"
						onClick={() => onStampChange(activeStamp === "Implant" ? null : "Implant")}
						className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
							activeStamp === "Implant"
								? "bg-amber-600 text-white font-black shadow-xs ring-2 ring-amber-400"
								: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/20"
						}`}
						data-testid="palette-stamp-implant"
					>
						<span>Имплант (И)</span>
					</button>

					<button
						type="button"
						onClick={() => onStampChange(activeStamp === "Healthy" ? null : "Healthy")}
						className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
							activeStamp === "Healthy"
								? "bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400"
								: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 border border-emerald-500/20"
						}`}
						data-testid="palette-stamp-healthy"
					>
						<span>Здоров (З)</span>
					</button>

					<button
						type="button"
						onClick={() => onStampChange(activeStamp === "Missing" ? null : "Missing")}
						className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
							activeStamp === "Missing"
								? "bg-zinc-800 text-white font-black shadow-xs ring-2 ring-zinc-500"
								: "bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-500/20 border border-zinc-500/20"
						}`}
						data-testid="palette-stamp-missing"
					>
						<span>Удален (X)</span>
					</button>

					{activeStamp && (
						<button
							type="button"
							onClick={() => onStampChange(null)}
							className="min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all cursor-pointer shrink-0 border border-[var(--odontogram-border-subtle,#e2e8f0)]"
							title="Сбросить режим штампа (Esc)"
							data-testid="palette-stamp-reset"
						>
							Сброс
						</button>
					)}
				</div>
			)}
		</div>
	);
};
