import { and, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	appointments,
	patients,
	payments,
	treatmentPlans,
} from "../../db/schema.js";
// Ветви воронки планов лечения выводятся из перечисления базы ОДНИМ местом на
// проект — той же функцией, что пишет колонку `bi_analytics_snapshots.plan_funnel_json`
// (`services/biAnalyticsWorker.ts` и `scripts/cronAnalyticsWorker.ts`). Своя карта
// состояний здесь стала бы ТРЕТЬИМ списком, а второй уже разошёлся с `pg_enum` и по
// регистру, и по составу: воронка показывала нули при любом числе планов (d1ff7ab21).
import { buildPlanFunnel } from "../../services/biAnalyticsWorker.js";
import { calculateCohortLtv } from "./cohortRoutes.js";
import type { TierKey } from "./types.js";
import {
	calculateChairUtilization,
	calculateDoctorProfitability,
	calculateNoShowHeatmap,
} from "./utilizationRoutes.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
	app.get("/api/analytics/dashboard", async (request, reply) => {
		// БЫЛО: `const orgId = await requireClinicalReadAccess(...)` — этот guard
		// возвращает Promise<boolean> (проверка секрета), а не идентификатор
		// организации. При успешной проверке orgId === true, поэтому условие
		// `typeof orgId !== "string"` срабатывало ВСЕГДА и обработчик выходил до
		// первого запроса к базе: весь дашборд молча отдавал пустой ответ.
		// Типизация это не ловит — сравнение typeof у boolean легально.
		// Теперь два шага явно разделены: гейт по секрету и получение арендатора
		// из подписанного токена.
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"analytics dashboard",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"analytics dashboard",
		);
		if (!orgId) return;

		try {
			const { range } = request.query as { range?: string };
			let startDate: Date | undefined;

			const now = new Date();
			if (range === "today") {
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
			} else if (range === "week") {
				const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Monday
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
			} else if (range === "month" || range === "last_month") {
				startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			} else if (range === "quarter" || range === "last_3_months") {
				const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
				startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
			} else if (range === "year" || range === "this_year") {
				startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
			}

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			const withDate = (orgCol: any, dateCol?: any) =>
				startDate
					? and(eq(orgCol, orgId), gte(dateCol, startDate))
					: eq(orgCol, orgId);

			/*
			 * 1. ВОРОНКА ПЛАНОВ ЛЕЧЕНИЯ. ЗДЕСЬ СЧИТАЛИСЬ ПРИЁМЫ.
			 *
			 * Поле называется `planFunnelJson`, экран рисует его под заголовком
			 * «Воронка планов лечения» и подписывает числа склонением «план / плана /
			 * планов» (`AnalyticsDashboardView.tsx:412` и `:66-69`), а расчёт брал
			 * `appointments.status` — четыре ветви `planned / confirmed / completed /
			 * cancelled` под подписями «Запланированы, Подтверждены, Завершены,
			 * Отменены». Планов лечения он не касался вовсе.
			 *
			 * ЗАМЕРЕНО на живой базе 2026-07-29 (демонстрационная клиника
			 * `d0000000-…-d001`: 27 приёмов, НОЛЬ планов лечения):
			 *   [{Запланированы 8}, {Подтверждены 2}, {Завершены 13}, {Отменены 4}],
			 *   сумма 27 — ровно `kpis.totalAppointments`.
			 * То есть владельцу клиники предъявлялось 27 «планов лечения», из них 13
			 * «завершённых», при полном отсутствии планов. Пустое состояние виджета
			 * («Планов лечения ещё нет. Составьте план в карточке пациента») не
			 * показывалось НИКОГДА, пока в клинике есть хоть один приём: указание,
			 * которое оператору и надо было выполнить, оказалось недостижимо.
			 *
			 * ВТОРАЯ ПОЛОВИНА ДЕФЕКТА — ветка `else`. Карта знала четыре статуса приёма
			 * из семи (`appointment_status`: planned, confirmed, arrived, in_treatment,
			 * completed, cancelled, no_show), а незнакомые молча прибавлялись к
			 * «Запланированы»: в том же замере 8 = 5 `planned` + 3 `no_show`, то есть
			 * три НЕЯВИВШИХСЯ пациента предъявлялись как приёмы, которые ещё
			 * состоятся. `st.toLowerCase()` был заряженным ружьём рядом: регистр
			 * совпадал случайно — `appointment_status` в базе строчный, в отличие от
			 * `treatment_plan_status`, — и в день смены регистра перечисления все семь
			 * статусов ушли бы в ту же ветку `else` одной строкой «Запланированы».
			 *
			 * ПОЧЕМУ ВЫБРАНЫ ПЛАНЫ, А НЕ ПЕРЕИМЕНОВАНИЕ ПОЛЯ В «воронку приёмов».
			 * Решает то, что видит оператор: заголовок, пустое состояние, указание
			 * «составьте план в карточке пациента» и единица измерения в подсказке —
			 * всё это про планы лечения, и на том же экране приёмы показаны уже дважды
			 * (плитка «Приёмов за период» и «Загруженность кресел» со своим склонением
			 * «приём / приёма / приёмов»). Плюс состояние `Rejected` — отказ пациента
			 * от сметы — среди статусов приёма не имеет соответствия вовсе, а это
			 * единственное место в продукте, где владелец видит, продаётся ли смета.
			 * И колонка снимка `plan_funnel_json` теперь считается по планам у обоих
			 * писателей (d1ff7ab21): оставить здесь приёмы значило бы дать одному имени
			 * поля два разных смысла в одном продукте.
			 *
			 * АРЕНДАТОР — из `treatment_plans.organization_id`, собственной колонки
			 * таблицы, как у всех остальных запросов этого файла и как в
			 * `services/biAnalyticsWorker.ts`. Колонка `NOT NULL` с миграции 0146,
			 * поэтому план не может выпасть из воронки из-за отсутствия арендатора.
			 * `scripts/cronAnalyticsWorker.ts` идёт к организации соединением с
			 * `patients` — это ДРУГОЕ правило: план, чей пациент заведён в соседней
			 * клинике, уходит по нему к соседям и исчезает из своей воронки, а сумма
			 * ветвей перестаёт сходиться с числом планов. Расхождение оставлено как
			 * есть и не приведено к единому виду тихой правкой: это вопрос правила
			 * аренды, а не оформления, и файл воркера принадлежит другой задаче.
			 *
			 * ПЕРИОД — по `createdAt` плана, как у всех виджетов этого экрана
			 * (приёмы по `startsAt`, платежи и пациенты по `createdAt`). Даты смены
			 * состояния в схеме нет (есть только `approvedAt`), поэтому иначе воронка
			 * перестала бы слушаться переключателя периода.
			 */
			const planCounts = await db
				.select({
					status: treatmentPlans.status,
					count: sql<number>`count(*)::int`,
				})
				.from(treatmentPlans)
				.where(
					withDate(treatmentPlans.organizationId, treatmentPlans.createdAt),
				)
				.groupBy(treatmentPlans.status);

			/*
			 * Ветви — из перечисления базы, подписи и цвета — из `Record` по нему,
			 * поэтому сумма ветвей всегда равна числу планов: состояние, которого нет в
			 * объявлении, попадает в воронку под сырым именем и кричит в лог, а не
			 * исчезает в `else`. Именно из-за `else` соседний писатель этой же колонки
			 * объявлял завершёнными планы, которых никто не завершал.
			 *
			 * Нулевые ветви отбрасываются, и это не потеря данных: экран сам скрывает
			 * ветви со нулём (`AnalyticsDashboardView.tsx:416`), а ПУСТАЯ воронка —
			 * единственный признак, по которому он показывает «Планов лечения ещё нет»
			 * с указанием, что делать, и по которому считается `isEmpty` всего
			 * дашборда. Сумма от этого не меняется: отброшенные ветви несут ноль.
			 */
			const planFunnelJson = buildPlanFunnel(planCounts).filter(
				(x) => x.value > 0,
			);

			// 2. Doctor Profitability — payments and appointments grouped by doctorUserId
			const doctorProfitabilityJson = await calculateDoctorProfitability(
				orgId,
				startDate,
			);

			// 3. Chair Utilization (% времени в кресле от доступного рабочего времени смены)
			const { chairUtilizationJson, chairOccupancyRate } =
				await calculateChairUtilization(orgId, startDate, now);

			// 4. Cohort LTV — payments grouped by patient creation month (строгий учет таймзоны клиники)
			const { cohortLtvJson, cohortZone } = await calculateCohortLtv(
				orgId,
				now,
			);

			const [patientCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(patients)
				.where(withDate(patients.organizationId, patients.createdAt));

			const [revenueRow] = await db
				.select({
					total: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
					cash: sql<number>`coalesce(sum(case when ${payments.method} = 'cash' then ${payments.amountRub} else 0 end), 0)`,
					card: sql<number>`coalesce(sum(case when ${payments.method} = 'card' then ${payments.amountRub} else 0 end), 0)`,
					cashless: sql<number>`coalesce(sum(case when ${payments.method} in ('bank_transfer', 'online') then ${payments.amountRub} else 0 end), 0)`,
					advance: sql<number>`coalesce(sum(case when ${payments.method} in ('family_wallet', 'insurance', 'other') then ${payments.amountRub} else 0 end), 0)`,
					sbp: sql<number>`coalesce(sum(case when ${payments.method} = 'online' then ${payments.amountRub} else 0 end), 0)`,
					bankTransfer: sql<number>`coalesce(sum(case when ${payments.method} = 'bank_transfer' then ${payments.amountRub} else 0 end), 0)`,
					insurance: sql<number>`coalesce(sum(case when ${payments.method} = 'insurance' then ${payments.amountRub} else 0 end), 0)`,
				})
				.from(payments)
				// Только фактически полученные деньги
				.where(
					and(
						withDate(payments.organizationId, payments.createdAt),
						eq(payments.status, "paid"),
					),
				);

			// Средний чек считается на ПЛАТИВШИХ пациентов. Раньше делили выручку
			// периода на число пациентов, ЗАРЕГИСТРИРОВАННЫХ в этом периоде: при
			// 10 новых пациентах и выручке со старых средний чек улетал в космос.
			const [payingPatientRow] = await db
				.select({ count: sql<number>`count(distinct ${payments.patientId})` })
				.from(payments)
				.where(
					and(
						withDate(payments.organizationId, payments.createdAt),
						eq(payments.status, "paid"),
					),
				);

			const [apptCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(appointments)
				.where(withDate(appointments.organizationId, appointments.startsAt));

			// 5. 3-Tier Treatment Plan Acceptance Rate & Primary Consultation Conversion
			const allPlans = await db
				.select({
					id: treatmentPlans.id,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
					totalPriceRub: treatmentPlans.totalPriceRub,
					totalPrice: treatmentPlans.totalPrice,
				})
				.from(treatmentPlans)
				.where(
					withDate(treatmentPlans.organizationId, treatmentPlans.createdAt),
				);

			const [consultationApptRow] = await db
				.select({
					count: sql<number>`count(*)::int`,
				})
				.from(appointments)
				.where(
					and(
						withDate(appointments.organizationId, appointments.startsAt),
						sql`(${appointments.reason} ilike '%конс%' or ${appointments.reason} ilike '%первич%' or ${appointments.reason} is null)`,
					),
				);

			const totalConsultations = Number(consultationApptRow?.count ?? 0);

			const tierGroups: Record<
				TierKey,
				{
					label: string;
					totalPlans: number;
					acceptedPlans: number;
					totalRub: number;
				}
			> = {
				basic: {
					label: "Базовый (эконом)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalRub: 0,
				},
				optimum: {
					label: "Оптимальный (стандарт)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalRub: 0,
				},
				premium: {
					label: "Премиум (комплексный)",
					totalPlans: 0,
					acceptedPlans: 0,
					totalRub: 0,
				},
			};

			for (const plan of allPlans) {
				const price = Number(plan.totalPriceRub || plan.totalPrice || 0);
				const nameLower = (plan.name || "").toLowerCase();
				let tier: TierKey = "optimum";
				if (
					nameLower.includes("премиум") ||
					nameLower.includes("комплекс") ||
					nameLower.includes("all-on") ||
					price >= 150_000
				) {
					tier = "premium";
				} else if (
					nameLower.includes("базов") ||
					nameLower.includes("эконом") ||
					nameLower.includes("терапевт") ||
					price < 50_000
				) {
					tier = "basic";
				}

				tierGroups[tier].totalPlans += 1;
				const isAccepted =
					plan.status === "Approved" ||
					plan.status === "Active" ||
					plan.status === "Completed";
				if (isAccepted) {
					tierGroups[tier].acceptedPlans += 1;
					tierGroups[tier].totalRub += price;
				}
			}

			const totalPlansCount = allPlans.length;
			const acceptedPlansCount = Object.values(tierGroups).reduce(
				(s, g) => s + g.acceptedPlans,
				0,
			);
			const overallAcceptancePercent =
				totalPlansCount > 0
					? Math.round((acceptedPlansCount / totalPlansCount) * 100)
					: 0;
			const consultationToPlanConversionPercent =
				totalConsultations > 0
					? Math.min(
							100,
							Math.round((acceptedPlansCount / totalConsultations) * 100),
						)
					: acceptedPlansCount > 0
						? 100
						: 0;

			const tierAcceptance = {
				totalConsultations,
				consultationToPlanConversionPercent,
				totalPlansCount,
				acceptedPlansCount,
				overallAcceptancePercent,
				tiers: (["basic", "optimum", "premium"] as const).map((key) => {
					const group = tierGroups[key];
					const acceptanceRatePercent =
						group.totalPlans > 0
							? Math.round((group.acceptedPlans / group.totalPlans) * 100)
							: 0;
					return {
						tier: key,
						label: group.label,
						totalPlans: group.totalPlans,
						acceptedPlans: group.acceptedPlans,
						acceptanceRatePercent,
						totalRub: group.totalRub,
					};
				}),
			};

			// 6. No-Show & Cancellation Heatmap
			const noShowHeatmap = await calculateNoShowHeatmap(
				orgId,
				startDate,
				cohortZone,
			);

			const totalPayingPatients = Number(payingPatientRow?.count ?? 0);
			const primaryCount = Number(patientCountRow?.count ?? 0);
			const repeatCount = Math.max(0, totalPayingPatients - primaryCount);
			const avgChk =
				totalPayingPatients > 0
					? Math.round(Number(revenueRow?.total ?? 0) / totalPayingPatients)
					: 0;

			const data = {
				kpis: {
					totalPatients: primaryCount,
					totalRevenue: Number(revenueRow?.total ?? 0),
					cashRevenue: Number(revenueRow?.cash ?? 0),
					cardRevenue: Number(revenueRow?.card ?? 0),
					cashlessRevenue: Number(revenueRow?.cashless ?? 0),
					advanceRevenue: Number(revenueRow?.advance ?? 0),
					sbpRevenue: Number(revenueRow?.sbp ?? 0),
					bankTransferRevenue: Number(revenueRow?.bankTransfer ?? 0),
					insuranceRevenue: Number(revenueRow?.insurance ?? 0),
					bonusRevenue: 0,
					totalAppointments: Number(apptCountRow?.count ?? 0),
					avgRevenuePerPatient: avgChk,
					averageCheck: avgChk,
					primaryPatientsCount: primaryCount,
					repeatPatientsCount: repeatCount,
					chairOccupancyRatePercent: chairOccupancyRate,
				},
				cohortLtvJson,
				planFunnelJson,
				chairUtilizationJson,
				doctorProfitabilityJson,
				tierAcceptance,
				noShowHeatmap,
				// Явный признак пустого периода, чтобы интерфейс отличал "нет данных"
				// от "все показатели равны нулю".
				isEmpty:
					!cohortLtvJson.length &&
					!planFunnelJson.length &&
					!chairUtilizationJson.length &&
					!doctorProfitabilityJson.length &&
					totalPlansCount === 0 &&
					noShowHeatmap.totalCancelled === 0 &&
					noShowHeatmap.totalNoShow === 0 &&
					Number(revenueRow?.total ?? 0) === 0 &&
					Number(apptCountRow?.count ?? 0) === 0,
			};

			return { success: true, data };
		} catch (e) {
			request.log.error({ err: e }, "Не удалось построить аналитику");
			return reply.code(503).send({
				success: false,
				error: "AnalyticsUnavailable",
				message:
					"Не удалось построить аналитику. Данные не потеряны, повторите позже.",
			});
		}
	});
}
