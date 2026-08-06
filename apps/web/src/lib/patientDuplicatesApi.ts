/**
 * Доступ к разбору дублей пациентов.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Дубли показываются в двух местах: списком в разделе
 * картотеки и предупреждением в самой карточке открытого пациента. Действия
 * («объединить», «это разные люди») в обоих местах одни и те же, и раскладывать
 * их дважды означало бы, что однажды они разойдутся: в одном месте появится
 * подтверждение или заголовок авторизации, в другом нет.
 *
 * Заголовки приходят снаружи, а не берутся здесь: доступ к клинике живёт в
 * контексте приложения, и этот файл не должен знать, как он устроен.
 *
 * ПОЧЕМУ У `headers` НЕТ ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ. Все четыре адреса закрыты охраной
 * `requireClinicalReadContext` / `requireClinicalMutationContext`: без заголовка
 * `x-dente-admin-secret` сервер отвечает 403. Раньше параметр имел значение по
 * умолчанию `{}`, и это ровно тот дефект, который не видно на машине разработчика:
 * в корневом `.env` секрет закомментирован, зато включены лазейки
 * `DENTE_CLINICAL_ALLOW_UNGUARDED_READS/MUTATIONS`, поэтому вызов без заголовков
 * локально зелёный. Лазейки живут только пока `NODE_ENV !== "production"` — у
 * заказчика их нет, и такой вызов там означает, что поиск дублей и слияние карт
 * мертвы, а на одного человека продолжают плодиться карты. Теперь заголовки —
 * обязательный аргумент: забыть их нельзя, это ошибка компиляции, а не тишина.
 *
 * ЭТОТ ФАЙЛ ОСТАЁТСЯ В НАХОДКАХ `npm run check:guarded-headers`, И ЭТО ОЖИДАЕМО.
 * Проверка ищет имя помощника заголовков в тексте вызова и в тридцати строках над
 * ним; здесь заголовки приходят параметром, за границу файла проверка не смотрит и
 * сама называет это своим известным пределом. Оба вызывающих —
 * `components/crm/PatientDuplicateMergeQueuesWidget.tsx` и
 * `components/patients/PatientDuplicateAlert.tsx` — берут `auth` из
 * `useAppLogicContext()` и передают сюда `auth.denteClinicalReadHeaders()` либо
 * `auth.denteClinicalMutationHeaders()`, то есть секрет сеанса уходит на сервер.
 *
 * ЧЕГО ЗДЕСЬ ДЕЛАТЬ НЕЛЬЗЯ, чтобы «закрыть» ту находку. Не звать
 * `denteAdminSecretRequestHeaders()` без секрета: помощник добавляет заголовок
 * ТОЛЬКО когда секрет передан аргументом, поэтому такой вызов заголовка не даёт —
 * проверка замолчит, а в клинике останется 403. Не читать секрет из хранилища
 * настроек здесь: единственный источник — `clinicalAdminSecretSession` в
 * `hooks/domains/useAuthLogic.ts`, и второй путь к нему разошёлся бы с первым.
 * Молчание проверки на этом файле опаснее самой находки: тридцатистрочное окно
 * накрыло бы и соседние вызовы, и пятый добавленный без заголовков уже не нашли бы.
 */

export type DuplicateReason =
	| "same_name_and_birth_date"
	| "same_name_birth_date_unknown"
	| "same_phone_and_surname"
	| "same_phone_only"
	| "same_email";

/** Карточка в паре. Телефон и дата рождения нужны, чтобы человек мог сверить. */
export type DuplicateSide = {
	patientId: string;
	fullName: string;
	phone: string | null;
	birthDate: string | null;
	email: string | null;
};

export type DuplicateCandidate = {
	leftPatientId: string;
	leftName: string;
	left: DuplicateSide;
	rightPatientId: string;
	rightName: string;
	right: DuplicateSide;
	reason: DuplicateReason;
	confidence: number;
	explanation: string;
	caution: string | null;
};

export type DuplicateReport = {
	candidates: DuplicateCandidate[];
	examinedPatients: number;
	dismissedPairs: number;
	note: string;
};

/** Ниже этого порога пара показывается как сомнительная и требует сверки. */
export const DOUBTFUL_BELOW = 0.6;

export type RequestHeaders = Record<string, string>;

/**
 * Ошибка сервера превращается в человеческую фразу. «Internal Server Error» на
 * экране администратора бесполезен: он не говорит, что делать.
 */
async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as unknown;
	if (!response.ok) {
		const message =
			payload &&
			typeof payload === "object" &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

/** Устойчивый ключ пары — порядок сторон в ответе уже нормализован сервером. */
export function duplicatePairKey(candidate: DuplicateCandidate): string {
	return `${candidate.leftPatientId}|${candidate.rightPatientId}`;
}

export async function fetchDuplicateReport(
	headers: RequestHeaders,
): Promise<DuplicateReport> {
	return readJson<DuplicateReport>(
		await fetch("/api/patients/duplicates", { headers }),
	);
}

/** Дубли одной карточки — для предупреждения внутри неё. */
export async function fetchDuplicatesForPatient(
	patientId: string,
	headers: RequestHeaders,
): Promise<DuplicateCandidate[]> {
	const payload = await readJson<{
		patientId: string;
		candidates: DuplicateCandidate[];
	}>(
		await fetch(`/api/patients/${encodeURIComponent(patientId)}/duplicates`, {
			headers,
		}),
	);
	return payload.candidates;
}

/**
 * Слияние. keepPatientId — карточка, которая останется; вторая становится
 * архивной ссылкой на неё, её данные переносятся, ничего не удаляется.
 */
export async function mergeDuplicatePair(
	input: { keepPatientId: string; mergePatientId: string; reason?: string },
	headers: RequestHeaders,
): Promise<{ summary: string }> {
	const body: Record<string, string> = {
		primaryPatientId: input.keepPatientId,
		duplicatePatientId: input.mergePatientId,
	};
	if (input.reason) body.reason = input.reason;
	return readJson<{ summary: string }>(
		await fetch("/api/patients/duplicates/merge", {
			method: "POST",
			headers: { ...headers, "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

/** «Это разные люди»: пара больше не предлагается. */
export async function dismissDuplicatePair(
	input: { leftPatientId: string; rightPatientId: string; reason?: string },
	headers: RequestHeaders,
): Promise<{ message: string }> {
	const body: Record<string, string> = {
		leftPatientId: input.leftPatientId,
		rightPatientId: input.rightPatientId,
	};
	if (input.reason) body.reason = input.reason;
	return readJson<{ message: string }>(
		await fetch("/api/patients/duplicates/dismiss", {
			method: "POST",
			headers: { ...headers, "content-type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

/**
 * Сторона пары, которая НЕ является данной карточкой. Нужно предупреждению в
 * карточке: показывать надо вторую карточку, а не ту, что уже открыта.
 */
export function otherSideOf(
	candidate: DuplicateCandidate,
	patientId: string,
): DuplicateSide {
	return candidate.leftPatientId === patientId
		? candidate.right
		: candidate.left;
}
