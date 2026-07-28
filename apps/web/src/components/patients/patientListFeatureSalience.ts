/**
 * ЧТО В СТРОКЕ ПАЦИЕНТА ДЕЙСТВИТЕЛЬНО РАЗЛИЧАЕТ ЛЮДЕЙ, А ЧТО — СОСТОЯНИЕ ВСЕЙ
 * КЛИНИКИ, ПОКАЗАННОЕ СЕМНАДЦАТЬ РАЗ.
 *
 * Замер живой базы на 2026-07-29: у 14 пациентов из 17 в строке стояла одна и та
 * же надпись «Закрыть недостающие документы», метка «контроль» — тоже у 14 из 17,
 * а цветная полоса слева (жёлтая или красная) — у ВСЕХ 17 без исключения. Корень
 * не в том, что клиника запустила документы у семнадцати человек: в базе нет ни
 * одного документа трёх обязательных видов вообще, поэтому у каждого пациента
 * `missingDocumentKinds.length = 3`, а `openTasks = 0`. Значит метка «спокойно»
 * недостижима ни для кого, а раскраска, которая красит всё, не выделяет ничего.
 *
 * Правило одно: признак рисуется в строке, только если отличается от
 * преобладающего по клинике. Порог НЕ ЗАШИТ — ни процента, ни числа пациентов:
 * и состав, и порог считаются по данным конкретной клиники. Как только в клинике
 * появятся документы, преобладающим станет другое значение, и метка снова начнёт
 * различать — без правки кода.
 *
 * Вынесено из PatientsView.tsx отдельным модулем, чтобы правило можно было
 * прогнать: рядом лежит patientListFeatureSalience.test.ts.
 */

/** Преобладающее значение признака: сколько раз встретилось и из скольких. */
export type PrevailingFeature<Value extends string> = {
	count: number;
	total: number;
	value: Value;
};

/**
 * Преобладающее значение — или `null`, если преобладающего нет.
 *
 * «Преобладающее» здесь значит большинство, а не просто самое частое: при
 * раскладе 40/35/25 прятать самую большую группу нельзя, она не норма. Ничья
 * большинством быть не может, поэтому отдельной ветки под неё не требуется —
 * при двух равных группах каждая не больше половины, и функция вернёт `null`.
 */
export function prevailingFeature<Value extends string>(
	values: readonly Value[],
): PrevailingFeature<Value> | null {
	if (values.length === 0) return null;
	const counts = new Map<Value, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	let prevailing: PrevailingFeature<Value> | null = null;
	for (const [value, count] of counts) {
		if (count > (prevailing?.count ?? 0)) {
			prevailing = { count, total: values.length, value };
		}
	}
	if (!prevailing || prevailing.count * 2 <= values.length) return null;
	return prevailing;
}

/**
 * Рисовать ли признак в строке. Когда преобладающего значения нет вовсе (все
 * разные, ничья, пустая клиника), признак различает по определению и рисуется.
 */
export function featureDistinguishes<Value extends string>(
	value: Value,
	prevailing: PrevailingFeature<Value> | null,
): boolean {
	return prevailing === null || value !== prevailing.value;
}

type SalienceInsight<RiskLevel extends string> = {
	nextBestAction: string;
	riskLevel: RiskLevel;
};

export type PatientListFeatureSalience<RiskLevel extends string> = {
	/** Факты уровня клиники: одной строкой над списком, а не в каждой строке. */
	notices: string[];
	prevailingNextAction: PrevailingFeature<string> | null;
	prevailingRiskLevel: PrevailingFeature<RiskLevel> | null;
};

/**
 * Текст называет ЧИСЛО, а не «у большинства»: «у 14 из 17» — это проверяемое
 * утверждение, по которому администратор понимает, что смотрит на состояние
 * клиники, и может его перепроверить. Форма «14 из 17 пациентов» выбрана потому,
 * что не требует согласования существительного по числу и остаётся верной и для
 * одного пациента, и для двадцати.
 */
export function patientListFeatureSalience<RiskLevel extends string>(input: {
	insights: readonly SalienceInsight<RiskLevel>[];
	riskLabels: Record<RiskLevel, string>;
}): PatientListFeatureSalience<RiskLevel> {
	const prevailingRiskLevel = prevailingFeature(
		input.insights.map((insight) => insight.riskLevel),
	);
	const prevailingNextAction = prevailingFeature(
		input.insights.map((insight) => insight.nextBestAction),
	);
	const notices: string[] = [];
	if (prevailingRiskLevel) {
		const label =
			input.riskLabels[prevailingRiskLevel.value] ?? prevailingRiskLevel.value;
		notices.push(
			`Метка «${label}» стоит у ${prevailingRiskLevel.count} из ${prevailingRiskLevel.total} пациентов клиники — это общее состояние клиники, а не примета человека. В строках она скрыта: видны только те, чья метка отличается.`,
		);
	}
	if (prevailingNextAction) {
		notices.push(
			`Действие «${prevailingNextAction.value}» повторяется у ${prevailingNextAction.count} из ${prevailingNextAction.total} пациентов клиники — по той же причине оно из строк убрано. В списке остались те, у кого действие другое.`,
		);
	}
	return { notices, prevailingNextAction, prevailingRiskLevel };
}
