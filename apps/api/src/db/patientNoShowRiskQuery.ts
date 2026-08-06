/**
 * Риск неявки пациента, посчитанный по его настоящей истории записей.
 *
 * ЗАЧЕМ ЭТОТ МОДУЛЬ. Экран карточки (PatientNoShowRisk.tsx) звал
 * POST /api/ai/predict-no-show, а маршрута не существовало: живая проверка видела
 * 404, и виджет числился «незаконченным разделом» в долг-листе. Администратор жал
 * «Рассчитать AI-риск», видел «Считаем…» и получал обратно то же приглашение
 * рассчитать — кнопка не делала ничего.
 *
 * ЧТО ЭТО НЕ ТАКОЕ. Здесь НЕТ никакой языковой модели и НЕТ обученной модели
 * вообще. Это пересчёт того, что и так лежит в базе: сколько записей пациента
 * закончились неявкой, сколько отменами, сколько состоялись. Название маршрута
 * содержит «ai» по историческим причинам — менять его значило бы ломать
 * работающий клиент. Вместо обещания предсказания отдаются понятные врачу числа и
 * причины, каждую из которых можно проверить в журнале записей.
 *
 * ПОЧЕМУ ПОРОГИ ИМЕННО ТАКИЕ — честный ответ: они назначены, а не выведены из
 * данных. Ни на одной выборке этой клиники они не калиброваны, и обещать точность
 * было бы обманом. Поэтому наружу вместе с уровнем всегда уходят исходные числа:
 * решение принимает человек, а не порог.
 */
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";

/** Ровно те три значения, которые понимает экран. */
export type NoShowRiskLevel = "low" | "medium" | "high";

export type PatientNoShowRisk = {
	riskLevel: NoShowRiskLevel;
	noShowProbability: number;
	factors: string[];
	recommendedAction: string;
	/* Исходные числа отдаются наружу, чтобы уровень можно было проверить, а не принять на слово. */
	history: {
		consideredAppointments: number;
		noShows: number;
		cancellations: number;
		attended: number;
	};
};

/**
 * Меньше двух прошедших записей — считать не на чем.
 *
 * Один визит не отличает надёжного человека от случайного совпадения, а выдать при
 * этом «низкий риск» значило бы назвать новичка проверенным пациентом. Маршрут в
 * этом случае отвечает отказом с человеческим текстом, и экран показывает своё
 * честное «Риск неявки не рассчитан».
 */
export const MINIMUM_HISTORY_FOR_RISK = 2;

export type NoShowRiskOutcome =
	| { kind: "computed"; risk: PatientNoShowRisk }
	| { kind: "not_enough_history"; consideredAppointments: number };

/** Русское склонение для «раз/раза» — местное и маленькое, без общих словарей. */
function timesWord(count: number): string {
	const lastTwo = count % 100;
	const last = count % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return "раз";
	if (last === 1) return "раз";
	if (last >= 2 && last <= 4) return "раза";
	return "раз";
}

export async function computePatientNoShowRisk(
	orgId: string,
	patientId: string,
): Promise<NoShowRiskOutcome> {
	/*
	 * Берутся только ПРОШЕДШИЕ записи: запланированная на будущее ничего не говорит
	 * о том, придёт ли человек. Фильтр по клинике стоит в SQL, а не после выборки.
	 */
	const rows = await db
		.select({
			status: schema.appointments.status,
			startsAt: schema.appointments.startsAt,
		})
		.from(schema.appointments)
		.where(
			and(
				eq(schema.appointments.organizationId, orgId),
				eq(schema.appointments.patientId, patientId),
				lt(schema.appointments.startsAt, new Date()),
			),
		)
		.orderBy(desc(schema.appointments.startsAt));

	/*
	 * «Запланирована» и «подтверждена» в прошлом — это не исход, а незакрытая
	 * запись: администратор не отметил ни приход, ни неявку. Считать её неявкой
	 * значило бы обвинять пациента в чужой невнимательности, поэтому такие записи
	 * в расчёт не берутся вовсе.
	 */
	const decided = rows.filter((row) =>
		["completed", "arrived", "in_treatment", "no_show", "cancelled"].includes(
			row.status,
		),
	);

	if (decided.length < MINIMUM_HISTORY_FOR_RISK) {
		return {
			kind: "not_enough_history",
			consideredAppointments: decided.length,
		};
	}

	const noShows = decided.filter((row) => row.status === "no_show").length;
	const cancellations = decided.filter(
		(row) => row.status === "cancelled",
	).length;
	const attended = decided.length - noShows - cancellations;
	const probability = noShows / decided.length;

	const factors: string[] = [];
	if (noShows > 0) {
		factors.push(
			`Не пришёл и не отменил: ${noShows} ${timesWord(noShows)} из ${decided.length}`,
		);
	}
	if (cancellations > 0) {
		factors.push(
			`Отменял запись: ${cancellations} ${timesWord(cancellations)}`,
		);
	}
	if (attended > 0) {
		factors.push(`Приходил на приём: ${attended} ${timesWord(attended)}`);
	}
	/*
	 * Свежая неявка весит для решения больше давней, поэтому она называется
	 * отдельной строкой. Порядок записей — свежие сверху.
	 */
	if (decided[0]?.status === "no_show") {
		factors.push("Последняя запись закончилась неявкой");
	}
	if (noShows === 0 && cancellations === 0) {
		factors.push("Пропусков и отмен в истории нет");
	}

	let riskLevel: NoShowRiskLevel;
	if (noShows >= 2 || probability >= 0.34) riskLevel = "high";
	else if (noShows === 1 || cancellations >= 2) riskLevel = "medium";
	else riskLevel = "low";

	const recommendedAction =
		riskLevel === "high"
			? "Позвоните за день и дождитесь подтверждения голосом. Не ставьте этого пациента первым в день и не начинайте с ним долгое дорогое лечение без предоплаты."
			: riskLevel === "medium"
				? "Отправьте напоминание за день и убедитесь, что пациент ответил. Если ответа нет — позвоните."
				: "Достаточно обычного напоминания за день.";

	return {
		kind: "computed",
		risk: {
			riskLevel,
			/* Округление до сотых: экран показывает целые проценты. */
			noShowProbability: Math.round(probability * 100) / 100,
			factors,
			recommendedAction,
			history: {
				consideredAppointments: decided.length,
				noShows,
				cancellations,
				attended,
			},
		},
	};
}
