import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { money } from "../../AppHelpers";

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

/** Копейки не теряем и не выдумываем: 1500,505 ₽ не бывает. */
function roundToKopecks(value: number): number {
	return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

/**
 * Итог строки плана. Формула ровно та же, что в смете (useAppLogic.tsx) и в
 * ленте оплат (FinanceLedger.tsx): цена × количество − скидка, не ниже нуля.
 * Number() стоит потому, что numeric из drizzle приходит СТРОКОЙ, а данные
 * дашборда на клиенте схемой не проверяются: «10» − «3» без приведения дало бы
 * NaN, а NaN в сумме приёма — это неверная цифра в кассе.
 */
function planLineTotalRub(item: any): number {
	const unit = Number(item?.unitPriceRub ?? 0);
	const quantity = Number(item?.quantity ?? 1);
	const discount = Number(item?.discountRub ?? 0);
	return Math.max(0, roundToKopecks(unit * quantity - discount));
}

function serviceTitleOf(item: any): string {
	const title = typeof item?.snapshotServiceName === "string" ? item.snapshotServiceName.trim() : "";
	if (title) return title;
	const serviceId = typeof item?.serviceId === "string" ? item.serviceId.trim() : "";
	return serviceId || "Услуга без названия";
}

function toothSuffixOf(item: any): string {
	const tooth = typeof item?.toothCode === "string" ? item.toothCode.trim() : "";
	return tooth ? ` (зуб ${tooth})` : "";
}

/**
 * Строка, которой отметка записывается в поле «План» карты приёма.
 * Формат фиксированный: по нему же отметка потом находится и снимается.
 */
function completedLineOf(item: any): string {
	const quantity = Number(item?.quantity ?? 1);
	const quantityPart = Number.isFinite(quantity) && quantity > 1 ? `, ${quantity} шт.` : "";
	return `Выполнено: ${serviceTitleOf(item)}${toothSuffixOf(item)}${quantityPart} — ${money(planLineTotalRub(item))}`;
}

export const CompletedServicesChecklist: React.FC = () => {
	const context = (useAppLogicContext() || {}) as any;
	const { activeTreatmentPlanItems = [], visitNoteForm = {}, updateVisitNoteField } = context;

	// Отменённые позиции отмечать нечего — их не делают.
	const planItems = React.useMemo(() => {
		const items = Array.isArray(activeTreatmentPlanItems) ? activeTreatmentPlanItems : [];
		return items.filter((item: any) => item?.status !== "cancelled");
	}, [activeTreatmentPlanItems]);

	const planText: string = typeof visitNoteForm?.treatmentPlan === "string" ? visitNoteForm.treatmentPlan : "";
	const planLines = React.useMemo(
		() => planText.split("\n").map((line) => line.trim()),
		[planText],
	);

	const isMarked = (item: any) => planLines.includes(completedLineOf(item));

	const markedItems = planItems.filter((item: any) => isMarked(item));
	const markedTotalRub = roundToKopecks(
		markedItems.reduce((sum: number, item: any) => sum + planLineTotalRub(item), 0),
	);

	const toggle = (item: any) => {
		if (!updateVisitNoteField) return;
		const line = completedLineOf(item);
		if (isMarked(item)) {
			const kept = planText
				.split("\n")
				.filter((existing) => existing.trim() !== line);
			// Хвостовые пустые строки после удаления отметки убираем, середину текста не трогаем.
			updateVisitNoteField("treatmentPlan", kept.join("\n").replace(/\n+$/, ""));
			return;
		}
		const base = planText.replace(/\s+$/, "");
		updateVisitNoteField("treatmentPlan", base ? `${base}\n${line}` : line);
	};

	if (planItems.length === 0) {
		return (
			<div
				data-testid="completed-services-checklist"
				className="completed-services-checklist bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3"
			>
				<h4 className="m-0 mb-1 text-sm font-semibold text-slate-900 dark:text-white">
					Отметка выполненного по плану лечения
				</h4>
				<p className="m-0 text-xs text-slate-500 dark:text-slate-400">
					У этого пациента нет согласованного плана лечения — отмечать пока нечего.
					План собирают в карточке пациента, и после этого его услуги появятся здесь
					списком с ценами.
				</p>
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
			<p className="m-0 mb-2 text-xs text-slate-500 dark:text-slate-400">
				Отмеченное дописывается строкой «Выполнено…» в поле «План» этого приёма —
				там его видно и там его можно поправить руками.
			</p>
			<div className="flex flex-col gap-1.5">
				{planItems.map((item: any, index: number) => {
					const marked = isMarked(item);
					const totalRub = planLineTotalRub(item);
					const quantity = Number(item?.quantity ?? 1);
					return (
						<label
							key={item?.id ?? `${item?.serviceId ?? "услуга"}-${item?.toothCode ?? "без-зуба"}-${index}`}
							className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 dark:text-slate-200"
						>
							<input
								type="checkbox"
								checked={marked}
								onChange={() => toggle(item)}
								className="rounded border-slate-300 dark:border-slate-700"
							/>
							<span className="flex-1">
								{serviceTitleOf(item)}
								{toothSuffixOf(item)}
								{Number.isFinite(quantity) && quantity > 1 ? `, ${quantity} шт.` : ""}
							</span>
							{/* Сумма — общими money(): «1 500,50 ₽», а не своё форматирование. */}
							<strong className="tabular-nums whitespace-nowrap">{money(totalRub)}</strong>
						</label>
					);
				})}
			</div>
			<p className="m-0 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
				{markedItems.length === 0
					? "Пока ничего не отмечено."
					: `Отмечено позиций: ${markedItems.length}. К оплате по отмеченному: ${money(markedTotalRub)}.`}
			</p>
		</div>
	);
};
