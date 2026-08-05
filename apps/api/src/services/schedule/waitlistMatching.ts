/**
 * Кому предложить освободившееся окно.
 *
 * ЗАЧЕМ ЭТО КЛИНИКЕ. Пациент отменил приём на 10:00 — час работы кресла и врача
 * пропадает. При этом в листе ожидания сидят люди, которые сами просили
 * позвонить, когда что-то освободится. Сегодня эти две вещи в системе не связаны
 * никак: лист ожидания заполняется (POST /api/waitlist), но ни расписание, ни
 * отмена приёма о нём не знают — проверено поиском, слово waitlist встречается
 * только в собственном маршруте. То есть очередь есть, а пользы от неё нет.
 *
 * ПОЧЕМУ ПОДБОР, А НЕ АВТОМАТИЧЕСКАЯ ЗАПИСЬ. Записать человека в чужое окно без
 * его согласия нельзя: он просил позвонить, а не «поставить куда угодно». Здесь
 * считается СПИСОК КАНДИДАТОВ с объяснением, почему каждый подходит, а звонит и
 * записывает администратор. Это же защищает от накладок, когда двум людям
 * достаётся одно окно.
 *
 * ПОРЯДОК ВАЖЕН И ОБЪЯСНЁН. Сначала тот, кто ждёт того же врача и в подходящее
 * время: ему окно действительно подходит. Потом — по приоритету (боль, острая
 * ситуация), потом по давности ожидания. «Первый в списке» без объяснения
 * заставляет администратора перепроверять всё вручную, и он перестаёт
 * пользоваться подбором.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointmentWaitlists, appointments, patients } from "../../db/schema.js";
import { withTenantCtx, withSuperuserBypass } from "../../db/rls.js";

/** Насколько кандидат подходит под окно и почему. */
export type WaitlistMatch = {
	readonly entryId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string | null;
	readonly priorityLevel: string;
	/** Сколько дней человек ждёт. */
	readonly waitingDays: number;
	/** Тот же врач, что был в отменённом приёме. */
	readonly sameDoctor: boolean;
	/** Время окна попадает в желаемые интервалы. */
	readonly timeFits: boolean;
	/** Человеческое объяснение для администратора. */
	readonly reason: string;
	/** У пациента уже есть другая запись на будущее. */
	readonly alreadyBooked: boolean;
};

export type FreedSlot = {
	readonly organizationId: string;
	readonly startsAt: Date;
	readonly endsAt: Date;
	readonly doctorUserId: string | null;
	readonly doctorName: string | null;
};

export type WaitlistMatchReport = {
	readonly slot: { from: string; to: string; doctorName: string | null };
	readonly matches: WaitlistMatch[];
	readonly examinedEntries: number;
	readonly note: string;
};

/**
 * Дни недели в написаниях, которые могут прийти. Источник правды о формате —
 * только zod-схема POST /api/waitlist (`{day: string, slot: string}`), а какие
 * именно строки туда кладут, не задано: единственный писатель —
 * WaitlistDrawer.tsx — отправляет пустой массив. Поэтому распознаются
 * распространённые написания, а незнакомое считается «день не важен».
 *
 * 0 — воскресенье, как в Date.getDay().
 */
const WEEKDAY_NAMES: Readonly<Record<string, number>> = {
	вс: 0, воскресенье: 0, sunday: 0, sun: 0,
	пн: 1, понедельник: 1, monday: 1, mon: 1,
	вт: 2, вторник: 2, tuesday: 2, tue: 2,
	ср: 3, среда: 3, wednesday: 3, wed: 3,
	чт: 4, четверг: 4, thursday: 4, thu: 4,
	пт: 5, пятница: 5, friday: 5, fri: 5,
	сб: 6, суббота: 6, saturday: 6, sat: 6
};

/**
 * День недели из строки. Понимает название, номер и дату в виде YYYY-MM-DD.
 * null — «не разобрали», то есть ограничения по дню нет.
 */
export function parsePreferredWeekday(raw: unknown): number | null {
	if (typeof raw === "number") {
		return Number.isInteger(raw) && raw >= 0 && raw <= 6 ? raw : null;
	}
	if (typeof raw !== "string") return null;
	const value = raw.trim().toLowerCase();
	if (!value) return null;

	const byName = WEEKDAY_NAMES[value];
	if (byName !== undefined) return byName;

	if (/^[0-6]$/.test(value)) return Number(value);

	// Конкретная дата: «2026-07-29». Из неё день недели выводится однозначно.
	const asDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : null;
	if (asDate && !Number.isNaN(asDate.getTime())) return asDate.getDay();

	return null;
}

/**
 * Разбор желаемых интервалов. Поле хранится как jsonb, и его форма задана только
 * zod-схемой POST /api/waitlist: массив `{day, slot}`. Что именно лежит в slot,
 * схема не уточняет, а единственный писатель отправляет пустой массив, поэтому
 * фактических данных для сверки нет.
 *
 * Здесь принимаются те формы, которые реально могут прийти, и ничего не
 * выдумывается: незнакомое значение означает «время не ограничено». Это честнее
 * обратного — придуманное ограничение спрятало бы подходящего человека, и
 * клиника потеряла бы запись, не узнав об этом.
 *
 * Понимаются: `{day, slot}` (slot как «10:00-13:00» или «10:00»), строка
 * «10:00-13:00», объект `{from, to}`.
 */
export function parsePreferredRanges(raw: unknown): { fromMinute: number; toMinute: number }[] {
	const toMinutes = (value: string): number | null => {
		const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
		if (!match) return null;
		const hours = Number(match[1]);
		const minutes = Number(match[2]);
		if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
		return hours * 60 + minutes;
	};

	const fromPair = (text: string): { fromMinute: number; toMinute: number } | null => {
		const parts = text.split(/[-–—]/);
		if (parts.length !== 2) return null;
		const start = toMinutes(parts[0] ?? "");
		const end = toMinutes(parts[1] ?? "");
		if (start === null || end === null || end <= start) return null;
		return { fromMinute: start, toMinute: end };
	};

	const collected: { fromMinute: number; toMinute: number }[] = [];
	const items = Array.isArray(raw) ? raw : raw === null || raw === undefined ? [] : [raw];

	for (const item of items) {
		if (typeof item === "string") {
			const pair = fromPair(item);
			if (pair) collected.push(pair);
			continue;
		}
		if (item && typeof item === "object") {
			const record = item as Record<string, unknown>;

			// Форма из zod-схемы POST /api/waitlist: {day, slot}.
			if (typeof record.slot === "string") {
				const asPair = fromPair(record.slot);
				if (asPair) {
					collected.push(asPair);
					continue;
				}
				/*
				 * Одно время вместо интервала («10:00»). Считаем его началом
				 * получаса: администратор, назвавший «10:00», имел в виду это время,
				 * а не «в любой момент дня». Полчаса — самый короткий приём в
				 * прайсе, поэтому окно, начинающееся в этот же полчас, ему подходит.
				 */
				const single = toMinutes(record.slot);
				if (single !== null) {
					collected.push({ fromMinute: single, toMinute: single + 30 });
					continue;
				}
			}

			const start = typeof record.from === "string" ? toMinutes(record.from) : null;
			const end = typeof record.to === "string" ? toMinutes(record.to) : null;
			if (start !== null && end !== null && end > start) collected.push({ fromMinute: start, toMinute: end });
		}
	}
	return collected;
}

/** Попадает ли окно в желаемое время. Нет ограничений — подходит любое. */
export function slotFitsRanges(slotStartMinute: number, ranges: { fromMinute: number; toMinute: number }[]): boolean {
	if (ranges.length === 0) return true;
	return ranges.some((range) => slotStartMinute >= range.fromMinute && slotStartMinute < range.toMinute);
}

const PRIORITY_ORDER: Readonly<Record<string, number>> = { high: 0, medium: 1, low: 2 };

export async function findWaitlistMatches(slot: FreedSlot, limit = 20): Promise<WaitlistMatchReport> {
	const rows = await withTenantCtx(slot.organizationId, async (tx) => tx
    		.select({
    			entryId: appointmentWaitlists.id,
    			patientId: appointmentWaitlists.patientId,
    			storedName: appointmentWaitlists.patientName,
    			storedPhone: appointmentWaitlists.patientPhone,
    			preferredDoctorId: appointmentWaitlists.preferredDoctorId,
    			priorityLevel: appointmentWaitlists.priorityLevel,
    			preferredTimeRanges: appointmentWaitlists.preferredTimeRanges,
    			createdAt: appointmentWaitlists.createdAt,
    			// Имя и телефон берутся из карточки: в записи листа ожидания они
    			// скопированы на момент создания и успевают устареть.
    			patientName: patients.fullName,
    			patientPhone: patients.phone,
    			/*
    			 * Есть ли у пациента другая запись на будущее. Предлагать окно тому,
    			 * кто уже записан, обычно не нужно — но скрывать его нельзя: человек
    			 * мог просить более раннее время, и это как раз оно.
    			 * Ссылка на внешнюю таблицу пишется как ${appointmentWaitlists}."patient_id":
    			 * без имени таблицы drizzle подставит голое «patient_id», и внутри
    			 * подзапроса оно свяжется с колонкой appointments — условие станет
    			 * всегда ложным без всякой ошибки.
    			 */
    			futureAppointments: sql<number>`(
				SELECT count(*) FROM ${appointments} a
				WHERE a.patient_id = ${appointmentWaitlists}."patient_id"
				  AND a.starts_at > now()
				  AND a.status IN ('planned', 'confirmed')
			)`.as("future_appointments")
    		})
    		.from(appointmentWaitlists)
    		.leftJoin(patients, eq(patients.id, appointmentWaitlists.patientId))
    		.where(
    			and(
    				eq(appointmentWaitlists.organizationId, slot.organizationId),
    				// Только те, кто ещё ждёт: отработанные записи предлагать нельзя.
    				eq(appointmentWaitlists.status, "waiting")
    			)
    		));

	const now = new Date();
	const slotStartMinute = slot.startsAt.getHours() * 60 + slot.startsAt.getMinutes();

	/** День недели окна. 0 — воскресенье, как в Date.getDay(). */
	const slotWeekday = slot.startsAt.getDay();

	const matches: WaitlistMatch[] = rows.map((row) => {
		const sameDoctor = Boolean(slot.doctorUserId && row.preferredDoctorId === slot.doctorUserId);
		const ranges = parsePreferredRanges(row.preferredTimeRanges);
		/*
		 * ДЕНЬ НЕДЕЛИ УЧИТЫВАЕТСЯ, а не игнорируется. В первой редакции подбор
		 * смотрел только на время суток, потому что я не сверился с фактическим
		 * контрактом поля: в zod-схеме POST /api/waitlist это массив {day, slot},
		 * то есть день там есть. Без его учёта человек, просивший вторник, попадал
		 * в подбор на пятничное окно — и звонок был бы потрачен впустую.
		 *
		 * Если день не разобрался ни у одной записи — ограничения нет, подходит
		 * любой: выдуманное ограничение хуже отсутствующего.
		 */
		const rangesArray = Array.isArray(row.preferredTimeRanges) ? row.preferredTimeRanges : [];
		let dayFits = rangesArray.length === 0;
		if (!dayFits) {
			let found = false;
			let hasValidDay = false;
			for (let i = 0; i < rangesArray.length; i++) {
				const item = rangesArray[i];
				if (item && typeof item === "object") {
					const day = parsePreferredWeekday((item as Record<string, unknown>).day);
					if (day !== null) {
						hasValidDay = true;
						if (day === slotWeekday) {
							found = true;
							break;
						}
					}
				}
			}
			dayFits = !hasValidDay || found;
		}
		const timeFits = dayFits && slotFitsRanges(slotStartMinute, ranges);
		const waitingDays = Math.max(
			0,
			Math.floor((now.getTime() - new Date(row.createdAt).getTime()) / (24 * 60 * 60 * 1000))
		);
		const alreadyBooked = Number(row.futureAppointments) > 0;

		const parts: string[] = [];
		if (sameDoctor) parts.push("ждёт этого же врача");
		else if (row.preferredDoctorId) parts.push("просил другого врача");
		if (!dayFits) parts.push("просил другой день недели");
		else if (ranges.length === 0) parts.push("время не ограничивал");
		else if (timeFits) parts.push("это время ему подходит");
		else parts.push("просил другое время");
		if (row.priorityLevel === "high") parts.push("отмечен как срочный");
		parts.push(waitingDays === 0 ? "записан в лист сегодня" : `ждёт ${waitingDays} дн.`);
		if (alreadyBooked) parts.push("уже записан на другое время — предложите, только если ему нужно раньше");

		return {
			entryId: row.entryId,
			patientId: row.patientId,
			patientName: row.patientName ?? row.storedName ?? "Без имени",
			phone: row.patientPhone ?? row.storedPhone ?? null,
			priorityLevel: row.priorityLevel,
			waitingDays,
			sameDoctor,
			timeFits,
			alreadyBooked,
			reason: `${parts.join(", ")}.`
		};
	});

	/*
	 * Порядок: сначала кому окно действительно подходит (тот же врач и время),
	 * потом по срочности, потом по давности ожидания. Уже записанные опускаются
	 * в конец — их предлагают в последнюю очередь.
	 */
	matches.sort((left, right) => {
		const fit = (match: WaitlistMatch) => (match.sameDoctor ? 0 : 1) + (match.timeFits ? 0 : 1);
		if (left.alreadyBooked !== right.alreadyBooked) return left.alreadyBooked ? 1 : -1;
		const byFit = fit(left) - fit(right);
		if (byFit !== 0) return byFit;
		const byPriority = (PRIORITY_ORDER[left.priorityLevel] ?? 1) - (PRIORITY_ORDER[right.priorityLevel] ?? 1);
		if (byPriority !== 0) return byPriority;
		return right.waitingDays - left.waitingDays;
	});

	const asTime = (date: Date) =>
		`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

	return {
		slot: { from: asTime(slot.startsAt), to: asTime(slot.endsAt), doctorName: slot.doctorName },
		matches: matches.slice(0, limit),
		examinedEntries: rows.length,
		note:
			"Порядок: сначала те, кому окно действительно подходит, затем срочные, затем по давности ожидания. " +
			"Система никого не записывает сама: человек просил позвонить, а не поставить его куда угодно, " +
			"и звонок защищает от накладки, когда одно окно достаётся двоим."
	};
}
