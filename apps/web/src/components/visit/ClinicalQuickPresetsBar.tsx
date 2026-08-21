import React from "react";
import {
	Activity,
	Bone,
	Check,
	Crown,
	Flame,
	HeartPulse,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	Zap,
} from "lucide-react";
import type { DiaryState } from "../useVisitDiaryLogic";
import { showToast } from "../GlobalToast";

export interface ClinicalQuickPreset {
	id: string;
	title: string;
	shortBadge: string;
	category: "therapy" | "surgery" | "orthopedics" | "hygiene";
	icd10: string;
	icd10Label: string;
	anamnesis: string;
	statusLocalis: string;
	treatmentDescription: string;
}

export const CLINICAL_PRESETS: ClinicalQuickPreset[] = [
	// ── ТЕРАПИЯ
	{
		id: "caries_medium",
		title: "Средний кариес дентина",
		shortBadge: "Кариес (средн.)",
		category: "therapy",
		icd10: "K02.1",
		icd10Label: "Кариес дентина (средний)",
		anamnesis:
			"Жалобы на кратковременные боли от температурных (холодное, горячее) и химических (сладкое, кислое) раздражителей, быстро проходящие после прекращения действия фактора, застревание пищи в межзубном промежутке.",
		statusLocalis:
			"Кариозная полость средней глубины в пределах плащевого дентина. Дно и стенки плотные, пигментированные. Зондирование слабоболезненно по эмалево-дентинной границе. Перкуссия безболезненна. Холодовая проба слабоположительная, быстропроходящая. ЭОД 6–8 мкА.",
		treatmentDescription:
			"Инфильтрационная/проводниковая анестезия (Артикаин 4% 1.7 мл). Препарирование кариозной полости, полная некрэктомия, формирование эмалевого фальца. Изоляция коффердамом. Антисептическая медикаментозная обработка 2% раствором хлоргексидина. Кислотное травление эмали и дентина 37% ортофосфорной кислотой (etching: эмаль 20 сек, дентин 10 сек), смывание водой, деликатное подсушивание воздухом. Нанесение адгезивной системы (adhesive: праймер + бонд), экспозиция 20 сек, фотополимеризация 20 сек. Послойное моделирование наногибридным светоотверждаемым композитом (composite layer) с восстановлением окклюзионных бугров, фиссур и контактного пункта. Шлифовка, полировка (polishing: диски, полиры, паста) до сухого зеркального блеска, контроль окклюзии по копирке.",
	},
	{
		id: "caries_deep",
		title: "Глубокий кариес дентина",
		shortBadge: "Кариес (глуб.)",
		category: "therapy",
		icd10: "K02.1",
		icd10Label: "Кариес дентина (глубокий)",
		anamnesis:
			"Жалобы на боли от температурных и химических раздражителей (холодное, сладкое), длительно не проходящие после устранения причины. Застревание пищи.",
		statusLocalis:
			"Глубокая кариозная полость в пределах околопульпарного дентина. Дно плотное, пигментированное, зондирование дна болезненно. Перкуссия безболезненна. ЭОД — 18-20 мкА.",
		treatmentDescription:
			"Анестезия (Артикаин 4% 1:200 000 1.7 мл). Препарирование кариозной полости, щадящая некрэктомия. Изоляция коффердамом. Антисептическая обработка 2% хлоргексидином. Лечебная прокладка Ca(OH)2 точечно на дно, изолирующая прокладка СИЦ. Адгезивный протокол (etching + primer/bond), послойная реставрация нанокомпозитом светового отверждения (composite layer) с восстановлением окклюзионной анатомии. Шлифовка, полировка (polishing) до сухого блеска.",
	},
	{
		id: "pulpitis_acute",
		title: "Острый пульпит (экстирпация)",
		shortBadge: "Пульпит (экстирпация)",
		category: "therapy",
		icd10: "K04.0",
		icd10Label: "Пульпит",
		anamnesis:
			"Жалобы на самопроизвольные острые приступообразные боли, нарастающие в ночное время, с иррадиацией по ветвям тройничного нерва. Болевой приступ длится > 30 минут.",
		statusLocalis:
			"Глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытой точки рога пульпы резко болезненно, с кровоточивостью. Перкуссия безболезненна. Термопроба резко положительна. ЭОД — 35-45 мкА.",
		treatmentDescription:
			"Проводниковая/инфильтрационная анестезия (Артикаин 4% 1.7 мл). Препарирование, раскрытие полости зуба, создание прямого эндодонтического доступа. Коффердам. Витальная экстирпация пульпы / девитализация. Определение рабочей длины (апекслокатор + визиография). Инструментальная механическая обработка каналов NiTi ротационными файлами (canal instrumentation) с обильной ирригацией NaOCl 3% и ЭДТА 17% с УЗ-активацией. Высушивание бумажными штифтами. Временная лечебная паста Calcept (гидроксид кальция) / трехмерная обтурация каналов гуттаперчей с эпоксидным силером (gutta-percha obturation) методом латеральной/вертикальной конденсации. Рентген-контроль. Восстановление коронки композитом.",
	},
	{
		id: "periodontitis_chronic",
		title: "Хронический апикальный периодонтит",
		shortBadge: "Периодонтит (деструктивный)",
		category: "therapy",
		icd10: "K04.5",
		icd10Label: "Хронический апикальный периодонтит",
		anamnesis:
			"Жалобы на чувство тяжести и дискомфорта при накусывании, изменение цвета зуба. Ранее лечен по поводу кариеса/пульпита.",
		statusLocalis:
			"Зуб изменен в цвете, девитализирован / дефект пломбы. Зондирование устьев безболезненно. Перкуссия слабочувствительна. ЭОД > 100 мкА. Рентгенография: очаг деструкции костной ткани у верхушки корня (периапикальный очаг).",
		treatmentDescription:
			"Анестезия (Артикаин 4% 1.7 мл). Распломбирование корневых каналов, ревизия (canal desobturation), прохождение до физиологического апекса под контролем апекслокатора. Обильная медикаментозная дезинфекция (antiseptic irrigation: NaOCl 3%, 2% хлоргексидин, ЭДТА, ультразвук). Временная обтурация каналов гидроксидом кальция Calcept (calcium hydroxide) для стимуляции остеогенеза и подавления инфекции. Герметичная временная пломба (Cavit / СИЦ). Контрольный осмотр через 10-14 дней.",
	},

	// ── ХИРУРГИЯ
	{
		id: "surgery_extraction_simple",
		title: "Простое удаление зуба",
		shortBadge: "Удаление (простое)",
		category: "surgery",
		icd10: "K08.1",
		icd10Label: "Потеря зубов вследствие удаления",
		anamnesis:
			"Жалобы на разрушение коронковой части зуба, невозможность терапевтического восстановления, дискомфорт или подвижность.",
		statusLocalis:
			"Разрушение коронковой части зуба, подвижность III степени. Слизистая оболочка вокруг зуба гиперемирована, отечна.",
		treatmentDescription:
			"Инфильтрационная и проводниковая анестезия (Артикаин 4% 1.7 мл) (infiltration anesthesia). Синдесмотомия распатором на глубину 3-5 мм. Наложение анатомических щипцов / элеватора, люксация, элевация, аккуратная тракция зуба из альвеолы (elevator/forceps). Тщательный кюретаж лунки острой ложкой, удаление грануляций (socket curettage). Гемостаз: формирование устойчивого сгустка, гемостатическая губка с антисептиком / Альвостаз (hemostasis). Сближение краев лунки, наложение швов (suture: Викрил 4-0). Давящий тампон на 20 минут.",
	},
	{
		id: "surgery_extraction_atypical",
		title: "Атипичное удаление ретинированного зуба",
		shortBadge: "Атипичное удаление",
		category: "surgery",
		icd10: "K01.1",
		icd10Label: "Ретинированные зубы",
		anamnesis:
			"Жалобы на периодические боли, отек и чувство распирания в области ретинированного зуба мудрости, травматизацию слизистой щеки.",
		statusLocalis:
			"Зуб полуретинирован / дистопирован, покрыт слизисто-надкостничным капюшоном. Слизистая гиперемирована, отечна, пальпация болезненна. По данным КЛКТ: дистальный наклон, близость корней к нижнечелюстному каналу.",
		treatmentDescription:
			"Проводниковая мандибулярная/торусальная анестезия (Артикаин 4% 1:100 000 1.7 мл). Выкраивание углового слизисто-надкостничного лоскута. Создание костного доступа с охлаждением физраствором. Секционирование коронки и корней бором. Атравматичное извлечение фрагментов элеватором. Кюретаж лунки (socket curettage), ревизия нижнечелюстного канала. Гемостаз (Альвостаз / гемостатическая губка). Ушивание раны узловыми швами (suture: Викрил 4-0). Рекомендации: лед, щадящая диета, НПВС, осмотр через 48 часов.",
	},
	{
		id: "surgery_implant_placement",
		title: "Дентальная имплантация",
		shortBadge: "Имплантация (1 этап)",
		category: "surgery",
		icd10: "K08.1",
		icd10Label: "Потеря зубов вследствие удаления",
		anamnesis:
			"Плановое обращение на хирургический этап дентальной имплантации в области дефекта зубного ряда.",
		statusLocalis:
			"В области отсутствующего зуба альвеолярный гребень плотный, слизистая розовая, без признаков воспаления. По данным 3D КЛКТ: достаточная толщина кости (D2/D3), высота гребня сохранена.",
		treatmentDescription:
			"Инфильтрационная/проводниковая анестезия (Артикаин 4% 1:100 000 1.7 мл). Разрез по гребню, отслаивание лоскута. Формирование ложа имплантата хирургическими фрезами под обильным охлаждением физраствором с соблюдением протокола сверления. Установка дентального имплантата с торком 35-40 Нсм. Установка винта-заглушки / формирователя десны. Сближение краев раны, наложение узловых швов. Контрольная визиография — имплантат стабилен в кости.",
	},

	// ── ОРТОПЕДИЯ
	{
		id: "ortho_crown_prep",
		title: "Препарирование под циркониевую коронку",
		shortBadge: "Коронка (препарирование)",
		category: "orthopedics",
		icd10: "Z51.8",
		icd10Label: "Ортопедическое лечение (коронка)",
		anamnesis:
			"Обращение на этап ортопедического восстановления зуба. Разрушение коронковой части зуба более 50% (ИРОПЗ > 0.6).",
		statusLocalis:
			"Коронковая часть зуба культевая/пломбированная, зуб девитализирован, корневые каналы запломбированы до верхушки. Десна без воспаления.",
		treatmentDescription:
			"Анестезия (Артикаин 4% 1.7 мл). Препарирование зуба под искусственную коронку из диоксида циркония с созданием циркулярного уступа типа Chamfer (0.8 мм). Ретракция десны ретракционной нитью 00. Получение прецизионного двухслойного силиконового оттиска (А-силикон) и оттиска антагонистов. Изготовление и фиксация провизорной пластмассовой коронки на временный цемент TempBond.",
	},

	// ── ПРОФГИГИЕНА
	{
		id: "hygiene_complex",
		title: "Комплексная профгигиена (УЗ + Air-Flow + Clinpro)",
		shortBadge: "Профгигиена (Air-Flow)",
		category: "hygiene",
		icd10: "Z01.2",
		icd10Label: "Стоматологическое обследование и гигиена",
		anamnesis:
			"Жалобы на наличие пигментированного зубного налета, кровоточивость десен при чистке зубов, зубной камень, неприятный запах изо рта.",
		statusLocalis:
			"Обильный мягкий зубной налет и минерализованные над- и поддесневые зубные отложения во всех секстантах. Десна отечна, гиперемирована, кровоточит при зондировании.",
		treatmentDescription:
			"Индикация зубного налета. Аппликационная анестезия десны. Ультразвуковое удаление над- и поддесневого зубного камня скейлером с водяным охлаждением (ultrasonic scaling). Снятие плотного пигментированного налета порошкоструйным аппаратом Air-Flow (порошок глицина/эритритола) (Air-Flow polishing). Полировка поверхностей зубов абразивной пастой Cleanic и резиновыми головками, межзубные контакты обработаны флоссом и штрипсами. Глубокое фторирование эмали препаратом Clinpro White Varnish / фторлаком (Clinpro fluoridation). Обучение индивидуальной гигиене.",
	},
];

export interface ClinicalQuickPresetsBarProps {
	readonly onSelectPreset: (preset: ClinicalQuickPreset) => void;
	readonly isLocked?: boolean;
	readonly className?: string;
}

export const ClinicalQuickPresetsBar: React.FC<ClinicalQuickPresetsBarProps> = ({
	onSelectPreset,
	isLocked = false,
	className = "",
}) => {
	const handlePresetClick = (preset: ClinicalQuickPreset) => {
		if (isLocked) {
			showToast("Дневник подписан — вставка шаблона заблокирована", "info");
			return;
		}
		onSelectPreset(preset);
		showToast(`Применен шаблон: «${preset.title}» (${preset.icd10})`, "success", 3000);
	};

	return (
		<div
			className={`clinical-quick-presets-bar p-3 rounded-2xl border border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] space-y-2.5 ${className}`.trim()}
			data-testid="clinical-quick-presets-bar"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
						<Zap size={15} />
					</div>
					<div>
						<h4 className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<span>Быстрые клинические протоколы (1 клик)</span>
							<span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
								SOAP + МКБ-10
							</span>
						</h4>
						<p className="text-[11px] text-[var(--muted)]">
							Мгновенное заполнение анамнеза, статуса и протокола лечения без лишних окон
						</p>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap gap-1.5 min-w-0">
				{CLINICAL_PRESETS.map((preset) => {
					const categoryBadgeColor =
						preset.category === "therapy"
							? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
							: preset.category === "surgery"
								? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
								: preset.category === "orthopedics"
									? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
									: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20";

					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => handlePresetClick(preset)}
							disabled={isLocked}
							className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-0 ${categoryBadgeColor}`}
							title={`${preset.title} · МКБ-10: ${preset.icd10}`}
							data-testid={`quick-preset-${preset.id}`}
						>
							{preset.category === "therapy" && <Stethoscope size={14} className="shrink-0" />}
							{preset.category === "surgery" && <Bone size={14} className="shrink-0" />}
							{preset.category === "orthopedics" && <Crown size={14} className="shrink-0" />}
							{preset.category === "hygiene" && <Sparkles size={14} className="shrink-0" />}

							<span className="font-bold min-w-0">{preset.shortBadge}</span>
							<span className="text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] shrink-0">
								{preset.icd10}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
