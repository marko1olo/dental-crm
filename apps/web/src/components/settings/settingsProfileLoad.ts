/**
 * Чтение своего профиля на вкладке «Мой профиль»: состояния и разбор ответа.
 *
 * ЧТО БЫЛО СЛОМАНО.
 *
 * 1. БЕСКОНЕЧНЫЙ КРУТЯЩИЙСЯ КРУЖОК. Загрузка была написана так:
 *
 *      const [profileLoading, setProfileLoading] = useState(!profile);
 *      useEffect(() => {
 *        const staffToken = localStorage.getItem("dente_staff_token");
 *        if (!staffToken) return;      // ← выход БЕЗ setProfileLoading(false)
 *        ...
 *      }, []);
 *
 *    Когда токена сотрудника нет и профиль не пришёл пропсом, `profileLoading`
 *    оставался `true` навсегда, и вкладка показывала «Загрузка профиля...» до
 *    закрытия страницы. Человек не мог ни сменить пароль, ни понять, что не так.
 *
 * 2. ОТКАЗ СЕРВЕРА ПРОГЛАТЫВАЛСЯ ЦЕЛИКОМ: `.then(r => r.ok ? r.json() : null)`
 *    и `.catch(() => {})`. У 401 (истёк вход), 404, 500 и обрыва связи был один
 *    и тот же исход — не показать ничего. Дальше срабатывала ветка «профиля нет»
 *    с текстом «Профиль не найден. Войдите через PIN или перезайдите в систему.»
 *    Причину этот текст НАЗЫВАЛ, и называл неверно: при сбое сервера или обрыве
 *    сети совет перезайти отправляет человека выходить из программы, из которой
 *    он потом может не войти. Придумывать причину, которой сервер не сообщал,
 *    запрещено правилом lib/panelStateText.ts — здесь она была придумана.
 *
 *    Отдельно: если профиль пришёл пропсом, а сервер отказал, вкладка показывала
 *    прежние данные молча — то есть возможно устаревшие ФИО и роль, без единого
 *    признака, что свежие прочитать не удалось.
 *
 * ЧТО СТАЛО. Состояния объявлены явно и не подменяют друг друга: читаем /
 * прочитано / отказ / входа нет. «Входа нет» — отдельный случай, при котором
 * совет войти заново правильный, и только он.
 */

import type { PanelSubject } from "../../lib/panelStateText";

/** Профиль сотрудника в том виде, в каком его показывает вкладка. */
export interface StaffProfile {
	id: string;
	fullName: string;
	role: string;
	email?: string | null;
	organizationId?: string;
	yandexCalendarId?: string | null;
	yandexCalendarToken?: unknown | null;
}

/** Как называется содержимое вкладки для трёх состояний панели. */
export const PROFILE_PANEL_SUBJECT: PanelSubject = {
	notLoadedTitle: "Ваш профиль не загружен",
	accusative: "ваш профиль",
	emptyTitle: "Профиль сотрудника не найден",
	emptyHint:
		"Войдите по PIN-коду на планшете клиники или по почте и паролю — после входа профиль появится здесь.",
	failureConsequence:
		"ФИО и должность ниже могут быть устаревшими. Смена пароля и PIN-кода при этом работает: они меняются на сервере, а не в этом списке.",
};

/**
 * Состояние чтения профиля.
 *
 * `noSession` отделён от `failed` намеренно: это единственный случай, когда
 * «войдите заново» — верный совет, а не догадка. Раньше в эту ветку сваливались
 * и отказ сервера, и обрыв связи.
 */
export type ProfileLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "ready" }
	| { readonly phase: "noSession" }
	/** `status` — код ответа; null означает, что до сервера не дошли вовсе. */
	| { readonly phase: "failed"; readonly status: number | null };

/** Итог чтения без React и fetch: разбирается и проверяется отдельно от них. */
export type ProfileLoadOutcome =
	| { readonly ok: true; readonly profile: StaffProfile }
	| { readonly ok: false; readonly status: number | null };

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function textOrNull(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

/**
 * Разбор ответа `GET /api/auth/user/me` из УЖЕ прочитанного тела.
 *
 * Сервер отвечает `{ ok: true, user }`. Успешный ответ без `user` — отказ, а не
 * «профиля нет»: показывать пустые ФИО и должность как свои данные нельзя.
 * Профиль без `id` тоже не годится — он ничего не идентифицирует.
 */
export function parseProfilePayload(
	status: number,
	rawBody: string,
): ProfileLoadOutcome {
	if (status < 200 || status >= 300) {
		return { ok: false, status };
	}
	let payload: unknown;
	try {
		payload = rawBody.trim().length > 0 ? JSON.parse(rawBody) : null;
	} catch {
		return { ok: false, status };
	}
	const user = asRecord(asRecord(payload)?.user);
	const id = user ? textOrNull(user.id) : null;
	if (!user || !id) {
		return { ok: false, status };
	}
	/*
	 * organizationId дописывается только когда он есть: при
	 * `exactOptionalPropertyTypes` необязательное поле нельзя явно выставить в
	 * undefined, и это правильно — «ключа нет» и «ключ есть, значение пустое»
	 * различаются, а второе здесь ничего не значит.
	 */
	const organizationId = textOrNull(user.organizationId);
	return {
		ok: true,
		profile: {
			id,
			// Пустое ФИО не выдаём за имя: в поле «ФИО» стояла бы пустая строка, и
			// человек решил бы, что программа потеряла его данные.
			fullName: textOrNull(user.fullName) ?? "ФИО не заполнено",
			role: textOrNull(user.role) ?? "",
			email: textOrNull(user.email),
			...(organizationId ? { organizationId } : {}),
			yandexCalendarId: textOrNull(user.yandexCalendarId),
			yandexCalendarToken: user.yandexCalendarToken ?? null,
		},
	};
}

/**
 * Надёжность пароля.
 *
 * Вынесено сюда вместе с остальными решениями: подпись показывается человеку, а
 * правило «что считать надёжным» проверяется тестом, а не глазами по экрану.
 * Порог совпадает с серверным (не короче 8 знаков,
 * `routes/auth.ts` update-password), поэтому «Слабый» не может стоять на пароле,
 * который сервер вообще не примет, — такой не доходит до этой оценки.
 */
export function passwordStrength(password: string): {
	score: 1 | 2 | 3;
	label: string;
} {
	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[A-ZА-ЯЁ]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^A-Za-zА-Яа-яЁё0-9]/.test(password)) score++;
	if (score <= 1) return { score: 1, label: "Слабый" };
	if (score <= 3) return { score: 2, label: "Средний" };
	return { score: 3, label: "Надёжный" };
}
