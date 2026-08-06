/**
 * РАЗБОР РАСПИСАНИЯ ПО ДНЯМ, ОКНАМ И НАКЛАДКАМ.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. Экран «Записи» показывал плоский список всех приёмов
 * клиники за всё время, а на карточке стояло одно только время — «16:30». По
 * умолчанию фильтр даты пуст, поэтому первым в списке шёл САМЫЙ СТАРЫЙ приём.
 * Проверено в живом браузере на демо-клинике: наверху расписания висел приём от
 * 28 января 2024 года, и по виду он ничем не отличался от сегодняшнего.
 * Администратор с телефонной трубкой не мог ответить ни на один свой вопрос:
 * какой это день, где в дне дырки, а где два человека посажены на одно время.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ КОД ВНУТРИ ЭКРАНА. Здесь арифметика времени, в
 * которой легко ошибиться молча: границы дня, пересечения, отменённые приёмы.
 * Отдельный модуль без React проверяется тестами (scheduleDayGrouping.test.ts),
 * а не разглядыванием картинки.
 *
 * ПОЧЕМУ ДЕНЬ СЧИТАЕТСЯ ЧУЖОЙ ФУНКЦИЕЙ. Ключ дня получается тем же
 * toDateTimeLocalValue с часовым поясом клиники, каким работает фильтр по дате
 * в useAppLogic. Свой расчёт «начала суток» дал бы второй ответ на тот же
 * вопрос: у клиники в Самаре (UTC+4) день, посчитанный по UTC, съезжает на
 * четыре часа, и приём в 01:30 попал бы во вчера.
 */

/** Приём в том виде, в каком этот модуль его читает. Полный тип не нужен. */
export type DayGroupingAppointment = {
	id: string;
	startsAt: string;
	endsAt: string;
	status: string;
	doctorUserId: string | null;
	chairId: string | null;
	patientId: string | null;
};

/**
 * Статусы, при которых время действительно занято.
 *
 * Отменённый приём и неявка время НЕ занимают: именно из них берутся
 * освободившиеся окна, и показывать их как занятые — значит прятать от
 * администратора свободный час. По той же причине они не считаются накладкой:
 * посадить человека на время отменённого приёма нормально и нужно.
 */
export const timeOccupyingAppointmentStatuses = new Set<string>([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
	"completed",
]);

/** Окно короче этого не показываем: между приёмами всегда есть минуты на уборку. */
export const MIN_VISIBLE_GAP_MINUTES = 10;

export type ScheduleDayRow =
	| { kind: "appointment"; appointment: DayGroupingAppointment }
	/** Свободное окно между двумя приёмами: столько-то минут никем не занято. */
	| { kind: "gap"; minutes: number; afterAppointmentId: string }
	/**
	 * Наложение: два приёма делят время и при этом делят врача или кресло. Разные
	 * врачи в разных креслах в одно время — это нормальная параллельная работа, а
	 * не ошибка, и такие пары здесь не появляются.
	 */
	| {
			kind: "overlap";
			minutes: number;
			sameDoctor: boolean;
			sameChair: boolean;
			withAppointmentId: string;
	  };

export type ScheduleDayGroup = {
	/** «2026-07-28» в часовом поясе клиники. */
	dateKey: string;
	/** «вторник, 28 июля» — как это произносят вслух. */
	title: string;
	/** «сегодня», «завтра», «вчера» или пусто. Слово главнее числа. */
	relativeLabel: string;
	relation: "past" | "today" | "tomorrow" | "future";
	appointmentCount: number;
	/** Сколько минут дня занято приёмами, которые не отменены. */
	bookedMinutes: number;
	/** Сколько свободных минут найдено МЕЖДУ приёмами (не считая начала и конца дня). */
	freeGapMinutes: number;
	overlapCount: number;
	rows: ScheduleDayRow[];
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const ruDay = new Intl.DateTimeFormat("ru-RU", {
	weekday: "long",
	day: "numeric",
	month: "long",
	// Ключ дня УЖЕ местный для клиники, поэтому форматируем его как есть, без
	// второго пересчёта поясов: иначе день названия и день группы разъехались бы.
	timeZone: "UTC",
});

/** «2026-07-28» -> «вторник, 28 июля». Неразобранный ключ отдаём как есть. */
export function formatDayTitle(dateKey: string): string {
	const parsed = Date.parse(`${dateKey}T12:00:00Z`);
	if (Number.isNaN(parsed)) return dateKey;
	return ruDay.format(new Date(parsed));
}

/** «2026-07-28» + 1 -> «2026-07-29». Полдень UTC, чтобы шаг не спотыкался о сутки. */
export function shiftDayKey(dateKey: string, deltaDays: number): string {
	const parsed = Date.parse(`${dateKey}T12:00:00Z`);
	if (Number.isNaN(parsed)) return dateKey;
	return new Date(parsed + deltaDays * DAY_MS).toISOString().slice(0, 10);
}

/** «45 мин», «1 ч», «1 ч 15 мин» — без «мин.» с точкой и без «h». */
export function formatMinutesForHumans(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	if (total < 60) return `${total} мин`;
	const hours = Math.floor(total / 60);
	const rest = total % 60;
	return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function dayRelation(
	dateKey: string,
	todayKey: string,
): ScheduleDayGroup["relation"] {
	if (!todayKey) return "future";
	if (dateKey === todayKey) return "today";
	if (dateKey === shiftDayKey(todayKey, 1)) return "tomorrow";
	return dateKey < todayKey ? "past" : "future";
}

function relativeLabel(
	relation: ScheduleDayGroup["relation"],
	dateKey: string,
	todayKey: string,
): string {
	if (relation === "today") return "сегодня";
	if (relation === "tomorrow") return "завтра";
	if (todayKey && dateKey === shiftDayKey(todayKey, -1)) return "вчера";
	if (relation === "past") return "прошедший день";
	return "";
}

/**
 * Разложить приёмы по дням клиники, найти между ними свободные окна и накладки.
 *
 * @param toClinicLocal — переводчик мгновения в местное время клиники в виде
 *   «ГГГГ-ММ-ДДTчч:мм». Передаётся снаружи намеренно: это тот же
 *   toDateTimeLocalValue, которым считает фильтр по дате.
 */
export function groupAppointmentsByClinicDay(
	appointments: readonly DayGroupingAppointment[],
	options: {
		toClinicLocal: (iso: string) => string;
		todayKey: string;
		minGapMinutes?: number;
	},
): ScheduleDayGroup[] {
	const minGap = options.minGapMinutes ?? MIN_VISIBLE_GAP_MINUTES;
	const byDay = new Map<string, DayGroupingAppointment[]>();

	for (const appointment of appointments) {
		const dateKey = options.toClinicLocal(appointment.startsAt).slice(0, 10);
		const bucket = byDay.get(dateKey);
		if (bucket) bucket.push(appointment);
		else byDay.set(dateKey, [appointment]);
	}

	return [...byDay.keys()].sort().map((dateKey) => {
		const dayAppointments = [...(byDay.get(dateKey) ?? [])].sort(
			(left, right) => left.startsAt.localeCompare(right.startsAt),
		);
		const rows: ScheduleDayRow[] = [];
		let bookedMinutes = 0;
		let freeGapMinutes = 0;
		let overlapCount = 0;
		/** Самый поздний конец среди уже пройденных занятых приёмов. */
		let occupiedUntilMs: number | null = null;
		const occupyingSoFar: DayGroupingAppointment[] = [];

		for (const appointment of dayAppointments) {
			const startMs = Date.parse(appointment.startsAt);
			const endMs = Date.parse(appointment.endsAt);
			const occupies = timeOccupyingAppointmentStatuses.has(appointment.status);
			const measurable =
				Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;

			if (occupies && measurable) {
				if (occupiedUntilMs !== null) {
					const gapMinutes = Math.round(
						(startMs - occupiedUntilMs) / MINUTE_MS,
					);
					if (gapMinutes >= minGap) {
						const previous = occupyingSoFar[occupyingSoFar.length - 1];
						rows.push({
							kind: "gap",
							minutes: gapMinutes,
							afterAppointmentId: previous?.id ?? "",
						});
						freeGapMinutes += gapMinutes;
					}
				}
				// Накладку ищем среди ВСЕХ занятых приёмов дня, а не только соседнего:
				// длинный приём может перекрыть два коротких сразу.
				for (const earlier of occupyingSoFar) {
					const earlierStart = Date.parse(earlier.startsAt);
					const earlierEnd = Date.parse(earlier.endsAt);
					if (!Number.isFinite(earlierStart) || !Number.isFinite(earlierEnd))
						continue;
					const overlapMs =
						Math.min(endMs, earlierEnd) - Math.max(startMs, earlierStart);
					if (overlapMs <= 0) continue;
					const sameDoctor = Boolean(
						appointment.doctorUserId &&
							appointment.doctorUserId === earlier.doctorUserId,
					);
					const sameChair = Boolean(
						appointment.chairId && appointment.chairId === earlier.chairId,
					);
					if (!sameDoctor && !sameChair) continue;
					rows.push({
						kind: "overlap",
						minutes: Math.round(overlapMs / MINUTE_MS),
						sameDoctor,
						sameChair,
						withAppointmentId: earlier.id,
					});
					overlapCount += 1;
				}
				bookedMinutes += Math.round((endMs - startMs) / MINUTE_MS);
				occupiedUntilMs =
					occupiedUntilMs === null ? endMs : Math.max(occupiedUntilMs, endMs);
				occupyingSoFar.push(appointment);
			}

			rows.push({ kind: "appointment", appointment });
		}

		const relation = dayRelation(dateKey, options.todayKey);
		return {
			dateKey,
			title: formatDayTitle(dateKey),
			relativeLabel: relativeLabel(relation, dateKey, options.todayKey),
			relation,
			appointmentCount: dayAppointments.length,
			bookedMinutes,
			freeGapMinutes,
			overlapCount,
			rows,
		};
	});
}
