import React from "react";
import { Zap } from "lucide-react";
import { money } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";
import {
	planLineQuantity,
	planLineTotalRub,
	roundToKopecks,
	visitOwnedPlanItems,
} from "./completedServicesPlan";
import { realVisitFieldId } from "./visitIdentity";

export interface ClinicalServiceBundle {
	id: string;
	title: string;
	shortLabel: string;
	badge: string;
	totalPriceRub: number;
	services: Array<{
		code804n: string;
		title: string;
		priceRub: number;
	}>;
}

export const CLINICAL_SERVICE_BUNDLES: readonly ClinicalServiceBundle[] = [
	{
		id: "caries",
		title: "Лечение кариеса",
		shortLabel: "⚡ Пакет: Лечение кариеса",
		badge: "Анестезия + Коффердам + Пломба",
		totalPriceRub: 7500,
		services: [
			{ code804n: "А25.07.001", title: "Местная анестезия (инфильтрационная/проводниковая)", priceRub: 1200 },
			{ code804n: "А16.07.051", title: "Изоляция рабочего поля (Коффердам/Раббердам)", priceRub: 800 },
			{ code804n: "А16.07.002.010", title: "Препарирование и медикаментозная обработка кариозной полости", priceRub: 1000 },
			{ code804n: "А16.07.002.011", title: "Восстановление зуба пломбой светового отверждения (композит)", priceRub: 4000 },
			{ code804n: "А16.07.002.012", title: "Шлифовка и полировка пломбы", priceRub: 500 },
		],
	},
	{
		id: "endo_1",
		title: "Эндодонтия (1-й этап)",
		shortLabel: "⚡ Пакет: Эндодонтия (1-й этап)",
		badge: "Анестезия + Коффердам + Экстирпация + Каналы + Временная пломба",
		totalPriceRub: 8800,
		services: [
			{ code804n: "А25.07.001", title: "Местная анестезия", priceRub: 1200 },
			{ code804n: "А16.07.051", title: "Изоляция рабочего поля (Коффердам)", priceRub: 800 },
			{ code804n: "А16.07.030.001", title: "Экстирпация пульпы (депульпирование)", priceRub: 2000 },
			{ code804n: "А16.07.030.002", title: "Механическая и медикаментозная обработка корневых каналов", priceRub: 3300 },
			{ code804n: "А16.07.030.004", title: "Временная обтурация каналов лечебной пастой / Временная пломба", priceRub: 1500 },
		],
	},
	{
		id: "hygiene",
		title: "Профгигиена",
		shortLabel: "⚡ Пакет: Профгигиена",
		badge: "УЗ-скейлинг + AirFlow + Полировка + Фторирование",
		totalPriceRub: 6500,
		services: [
			{ code804n: "А16.07.050.001", title: "Ультразвуковое удаление зубных отложений (скейлинг)", priceRub: 2500 },
			{ code804n: "А16.07.050.002", title: "Удаление пигментированного налета аппаратом Air-Flow", priceRub: 2200 },
			{ code804n: "А16.07.050.003", title: "Полировка всех зубов профессиональными абразивными пастами", priceRub: 800 },
			{ code804n: "А11.07.012", title: "Глубокое фторирование эмали (реминерализация)", priceRub: 1000 },
		],
	},
	{
		id: "surgery_extraction",
		title: "Удаление зуба",
		shortLabel: "⚡ Пакет: Удаление зуба",
		badge: "Анестезия + Удаление + Гемостаз",
		totalPriceRub: 5500,
		services: [
			{ code804n: "А25.07.001", title: "Местная анестезия", priceRub: 1200 },
			{ code804n: "А16.07.001.001", title: "Удаление постоянного зуба", priceRub: 3500 },
			{ code804n: "А16.07.001.002", title: "Остановка луночного кровотечения / местный гемостаз", priceRub: 800 },
		],
	},
];

/*
  ОТМЕТКА ВЫПОЛНЕННЫХ УСЛУГ. ЧТО ЗДЕСЬ БЫЛО СЛОМАНО — ВСЁ СРАЗУ.

  1. Читались поля, которых у позиции плана лечения не существует. Позиция —
     это TreatmentPlanItem (packages/shared/src/index.ts): serviceId,
     snapshotServiceName, toothCode, quantity, unitPriceRub, discountRub. Код
     же спрашивал item.priceId, item.title, item.toothNumber и item.price.
     На экране это выглядело так: список галочек БЕЗ НАЗВАНИЙ — подпись
     `{item.title || item.priceId}` разворачивалась в пустоту. Врач видел
     столбик пустых квадратиков и не мог знать, что отмечает. Ключ React у всех
     строк тоже был один и тот же — «undefined-undefined».
  2. Отметка никуда не сохранялась. Она писалась в visitNoteForm.completedServices,
     а VisitNoteForm — это ровно пять текстовых полей (AppHelpers.tsx), и
     visitNoteDraftFromForm отправляет на сервер только их. Любая пересборка
     черновика (visitNoteFormFromDraft / visitNoteFormFromVisit) заменяет форму
     целиком и молча стирала отметки. Читателя у поля тоже не было: единственное
     место, откуда выполненные услуги уходят в разбор, — это
     dashboard.activeVisit.completedServices, а в visitSchema такого поля нет
     вовсе. То есть врач отмечал услуги, а касса не видела ничего.
  3. Цены не было. Шаг рабочего дня «назначить лечение, увидеть сумму, отдать
     пациента в кассу» на этом экране выполнить было нечем.
  4. Подсказка на заголовке обещала «автоматический расчет начислений врачу и
     списывание материалов». Ни того, ни другого отсюда не происходит.

  КАК СДЕЛАНО ТЕПЕРЬ. Отметка пишется туда, что действительно доезжает до карты
  приёма, — в поле «План» (treatmentPlan) отдельной строкой «Выполнено: …».
  Состояние галочки читается из этого же текста, поэтому оно не может разойтись
  с тем, что уйдёт на сервер: если врач сам поправит или удалит строку, галочка
  честно снимется. Новых полей и новых запросов к серверу для этого не нужно.

  ДОЛГ ВЕДУЩЕМУ (нужен сервер, поэтому не делаю): отдельного машинного списка
  выполненных услуг у приёма нет. Пока его нет, ни начисление врачу, ни
  списание материалов, ни счёт по факту выполненного автоматически не построить —
  строка в тексте плана читается человеком, но не программой. Нужны поле
  visits.completedServices (или своя таблица) плюс приём его в маршруте
  сохранения приёма; на клиенте контракт уже описан —
  visitFlowRequest.completedServices в packages/shared.
*/

/*
  5. НЕПРОЧИТАННАЯ ЦЕНА ПЕЧАТАЛАСЬ КАК «0 ₽».

  БЫЛО: `Number(item?.unitPriceRub ?? 0)`. Всё, что не прочиталось числом,
  становилось нулём: пустая цена, «1500,50» с запятой (Number() запятую не
  принимает), сумма с разделителем тысяч. Услуга с НЕИЗВЕСТНОЙ ценой выглядела
  бесплатной — «0 ₽» — и этот ноль ещё складывался в итог «К оплате по
  отмеченному». Врач называл пациенту сумму, в которой не хватало позиций, и
  проверить это по экрану было нельзя: «0 ₽» ничем не отличается от настоящего
  нуля.

  ТЕПЕРЬ цену либо удалось прочитать, либо о ней сказано словами. Запятая
  принимается, разделители тысяч убираются, а строка вида «1,500.50» с двумя
  разными разделителями честно считается непрочитанной: угадывать в деньгах
  нельзя. Непрочитанные позиции в итог не попадают, и об этом написано рядом с
  итогом. Разбор чисел вынесен в completedServicesPlan.ts и закрыт тестом.
*/

/** Цена не прочитана — так и пишем. Ноль вместо неё был бы ложью про деньги. */
const PRICE_UNKNOWN_TEXT = "цена не указана";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function serviceTitleOf(item: any): string {
	const title =
		typeof item?.snapshotServiceName === "string"
			? item.snapshotServiceName.trim()
			: "";
	if (title) return title;
	const serviceId =
		typeof item?.serviceId === "string" ? item.serviceId.trim() : "";
	return serviceId || "Услуга без названия";
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function toothSuffixOf(item: any): string {
	const tooth =
		typeof item?.toothCode === "string" ? item.toothCode.trim() : "";
	return tooth ? ` (зуб ${tooth})` : "";
}

/**
 * Строка, которой отметка записывается в поле «План» карты приёма.
 * Формат фиксированный: по нему же отметка потом находится и снимается.
 */
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function completedLineOf(item: any): string {
	const quantity = planLineQuantity(item);
	const quantityPart =
		quantity !== null && quantity > 1 ? `, ${quantity} шт.` : "";
	const total = planLineTotalRub(item);
	const priceText = total === null ? PRICE_UNKNOWN_TEXT : money(total);
	return `Выполнено: ${serviceTitleOf(item)}${toothSuffixOf(item)}${quantityPart} — ${priceText}`;
}

export const CompletedServicesChecklist: React.FC = () => {
	// `|| {}` убран: useAppLogicContext() либо отдаёт контекст, либо бросает
	// исключение (contexts/AppLogicContext.tsx) — пустой объект он больше не
	// выдумывает, и вторая ветка была недостижима.
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const context = useAppLogicContext() as any;
	const {
		visitNoteForm = {},
		updateVisitNoteField,
		dashboard,
		activeVisitPatient,
	} = context;

	/*
	  СПИСОК ПОКАЗЫВАЛ ПЛАН ЛЕЧЕНИЯ ДРУГОГО ПАЦИЕНТА.

	  БЫЛО: позиции брались из контекстного `activeTreatmentPlanItems`, а он
	  отфильтрован по `documentPatient` (useAppLogic.tsx:4949), где
	  `documentPatient = selectedPatient ?? activePatient`, а
	  `selectedPatient = выбранный в списке пациентов ?? activePatient`
	  (hooks/domains/usePatientLogic.ts:136-145). Выбор пациента в разделе
	  «Пациенты» живёт дальше своего раздела, приём его не сбрасывает.

	  Что это значило у кресла. Врач идёт по приёму пациента А, но в списке
	  пациентов открытым остался пациент Б — и здесь, внутри карты приёма
	  пациента А, перечислен план лечения ПАЦИЕНТА Б с его ценами. Галочка
	  дописывает строку «Выполнено: <услуга пациента Б> — 4 500,00 ₽» в поле
	  «План» приёма пациента А, откуда она уходит в его ЭМК и в кассу.
	  Зеркальный случай так же плох: у пациента А план есть, а список уверенно
	  писал «У этого пациента нет согласованного плана лечения», потому что
	  плана нет у пациента Б.

	  ТЕПЕРЬ: хозяин списка — пациент ОТКРЫТОГО ПРИЁМА, и никто другой. Позиции
	  фильтруем сами, от того же источника (`dashboard.treatmentPlanItems`),
	  по идентификатору пациента приёма. Контекстный `activeTreatmentPlanItems`
	  здесь сознательно не используется: он уже сужен по чужому пациенту, и
	  повторный фильтр по нему дал бы пустой список там, где план есть.
	  Правило вынесено в completedServicesPlan.ts и закрыто тестом.
	*/
	const visitPatientId = realVisitFieldId(dashboard?.activeVisit?.patientId);
	const visitId = realVisitFieldId(dashboard?.activeVisit?.id);
	const visitIsOpen = Boolean(visitPatientId && visitId);
	const visitPatientName =
		typeof activeVisitPatient?.fullName === "string" &&
		activeVisitPatient.fullName.trim()
			? activeVisitPatient.fullName.trim()
			: null;

	// Отменённые позиции отмечать нечего — их не делают.
	const planItems = React.useMemo(
		() => visitOwnedPlanItems(dashboard?.treatmentPlanItems, visitPatientId),
		[dashboard?.treatmentPlanItems, visitPatientId],
	);

	const planText: string =
		typeof visitNoteForm?.treatmentPlan === "string"
			? visitNoteForm.treatmentPlan
			: "";
	const planLines = React.useMemo(
		() => (planText ?? "").split("\n").map((line) => (line ?? "").trim()),
		[planText],
	);

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const isMarked = (item: any) => planLines.includes(completedLineOf(item));

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const markedItems = (planItems ?? []).filter((item: any) => isMarked(item));
	/*
	  В итог складываем только то, что действительно прочитано как цена.
	  Позиции с непрочитанной ценой считаем отдельно и называем их числом: молча
	  выбросить их из суммы — это тот же обман, что и подставить им ноль.
	*/
	const markedWithoutPrice = (markedItems ?? []).filter(
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(item: any) => planLineTotalRub(item) === null,
	).length;
	const markedTotalRub = roundToKopecks(
		(markedItems ?? []).reduce(
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(sum: number, item: any) => sum + (planLineTotalRub(item) ?? 0),
			0,
		),
	);

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const toggle = (item: any) => {
		if (!updateVisitNoteField) return;
		const line = completedLineOf(item);
		if (isMarked(item)) {
			const kept = (planText ?? "")
				.split("\n")
				.filter((existing) => (existing ?? "").trim() !== line);
			// Хвостовые пустые строки после удаления отметки убираем, середину текста не трогаем.
			updateVisitNoteField(
				"treatmentPlan",
				kept.join("\n").replace(/\n+$/, ""),
			);
			return;
		}
		const base = (planText ?? "").replace(/\s+$/, "");
		updateVisitNoteField("treatmentPlan", base ? `${base}\n${line}` : line);
	};

	const handleAddBundle = (bundle: ClinicalServiceBundle) => {
		if (!updateVisitNoteField) return;
		const bundleLines = bundle.services.map(
			(s) => `Выполнено: [${s.code804n}] ${s.title} — ${money(s.priceRub)}`,
		);
		const base = (planText ?? "").replace(/\s+$/, "");
		const updatedPlan = base
			? `${base}\n${bundleLines.join("\n")}`
			: bundleLines.join("\n");
		updateVisitNoteField("treatmentPlan", updatedPlan);
		showToast(
			`Пакет «${bundle.title}» (${countLabel(bundle.services.length, "услуга", "услуги", "услуг")} на ${money(bundle.totalPriceRub)}) внесен в карту и счет`,
			"success",
			3500,
		);
	};

	const renderClinicalBundlesBar = () => (
		<div className="mb-3 p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/50">
			<div className="flex items-center justify-between gap-2 mb-2">
				<span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
					<Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
					Быстрые клинические пакеты (1 клик):
				</span>
				<span className="text-[11px] text-slate-500 dark:text-slate-400">
					Номенклатура 804н
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
				{CLINICAL_SERVICE_BUNDLES.map((b) => (
					<button
						key={b.id}
						type="button"
						onClick={() => handleAddBundle(b)}
						className="flex flex-col items-start p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/30 transition-all text-left group"
						title={b.services.map((s) => `• [${s.code804n}] ${s.title} (${money(s.priceRub)})`).join("\n")}
					>
						<div className="w-full flex items-center justify-between gap-1">
							<span className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
								{b.shortLabel}
							</span>
							<span className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono">
								{money(b.totalPriceRub)}
							</span>
						</div>
						<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full mt-0.5">
							{b.badge}
						</span>
					</button>
				))}
			</div>
		</div>
	);

	/*
	  Приём не открыт — отмечать некуда: отметка дописывается в поле «План»
	  ЭТОГО приёма, а без приёма её не примет и сохранение (оно требует
	  идентификатор приёма). Раньше в этом случае показывался план лечения
	  выбранного в списке пациента, и врач отмечал услуги в никуда.
	*/
	if (!visitIsOpen) {
		return (
			<div
				data-testid="completed-services-checklist"
				className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3"
			>
				<h4 className="m-0 mb-1 text-sm font-semibold text-slate-900 dark:text-white">
					Отметка выполненного по плану лечения
				</h4>
				<p
					className="m-0 text-xs text-slate-500 dark:text-slate-400"
					role="status"
					aria-live="polite"
				>
					Приём ещё не открыт, поэтому отмечать выполненное не по чему: отметка
					записывается в карту конкретного приёма. Запишите пациента и начните
					приём в разделе «Записи» — план лечения появится здесь списком с
					ценами.
				</p>
			</div>
		);
	}

	if ((planItems ?? []).length === 0) {
		return (
			<div
				data-testid="completed-services-checklist"
				className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3"
			>
				<h4 className="m-0 mb-1 text-sm font-semibold text-slate-900 dark:text-white">
					Отметка выполненного по плану лечения
				</h4>
				<p className="m-0 mb-3 text-xs text-slate-500 dark:text-slate-400">
					{visitPatientName
						? `У пациента ${visitPatientName} нет предварительного плана лечения.`
						: "У пациента этого приёма нет предварительного плана лечения."}{" "}
					Вы можете внести стандартный клинический пакет услуг в 1 клик прямо сейчас:
				</p>
				{renderClinicalBundlesBar()}
			</div>
		);
	}

	return (
		<div
			data-testid="completed-services-checklist"
			className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3"
		>
			<h4 className="m-0 mb-1 text-sm font-semibold text-slate-900 dark:text-white">
				Отметка выполненного по плану лечения
			</h4>
			{/* Чей это план — написано прямо: список берётся у пациента открытого приёма. */}
			<p className="m-0 mb-2 text-xs text-slate-500 dark:text-slate-400">
				{visitPatientName ? `План пациента ${visitPatientName}. ` : ""}
				Отмеченное дописывается строкой «Выполнено…» в поле «План» этого приёма
				— там его видно и там его можно поправить руками.
			</p>
			{renderClinicalBundlesBar()}
			<div className="flex flex-col gap-1.5">
				{/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
				{(planItems ?? []).map((item: any, index: number) => {
					const marked = isMarked(item);
					const totalRub = planLineTotalRub(item);
					const quantity = planLineQuantity(item);
					return (
						<label
							key={
								item?.id ??
								`${item?.serviceId ?? "услуга"}-${item?.toothCode ?? "без-зуба"}-${index}`
							}
							className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-800 dark:text-slate-200 min-h-[44px] py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
						>
							<input
								type="checkbox"
								checked={marked}
								onChange={() => toggle(item)}
								className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[var(--teal,var(--brand-primary))] focus:ring-[var(--teal,var(--brand-primary))]"
							/>
							<span className="flex-1">
								{serviceTitleOf(item)}
								{toothSuffixOf(item)}
								{quantity !== null && quantity > 1 ? `, ${quantity} шт.` : ""}
							</span>
							{/* Сумма — общими money(): «1 500,50 ₽», а не своё форматирование.
							    Непрочитанная цена называется словами, а не нулём. */}
							{totalRub === null ? (
								<em className="whitespace-nowrap text-amber-700 dark:text-amber-400 not-italic">
									{PRICE_UNKNOWN_TEXT}
								</em>
							) : (
								<strong className="tabular-nums whitespace-nowrap">
									{money(totalRub)}
								</strong>
							)}
						</label>
					);
				})}
			</div>
			{/*
				Счётное слово склоняется общим countLabel: было «Отмечено позиций: 1».
				Позиции без прочитанной цены названы отдельно — иначе итог выглядел бы
				полным, а в нём не хватало бы услуг.
			*/}
			<p className="m-0 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
				{(markedItems ?? []).length === 0
					? "Пока ничего не отмечено."
					: `Отмечено: ${countLabel(markedItems.length, "позиция", "позиции", "позиций")}. К оплате по отмеченному: ${money(markedTotalRub)}.`}
				{(markedItems ?? []).length > 0 && markedWithoutPrice > 0
					? ` В эту сумму НЕ вошли ${countLabel(markedWithoutPrice, "позиция", "позиции", "позиций")} без цены — уточните их стоимость в прейскуранте, прежде чем называть сумму пациенту.`
					: ""}
			</p>
		</div>
	);
};
