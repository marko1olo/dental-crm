import { useCallback, useEffect, useRef, useState } from "react";
import { panelFailureCause } from "../lib/panelStateText";
import { logger } from "../utils/logger";
import {
	cacheClinicalRecord,
	getCachedClinicalRecordSync,
} from "../services/storage/clinicalCacheStorage";

/**
 * Загрузка ресурса, привязанного к конкретному пациенту.
 *
 * Виджеты карточки пациента писали загрузку вручную:
 *
 *     useEffect(() => { fetch(`/api/patients/${patientId}/...`)
 *       .then(r => r.json()).then(setItems); }, [patientId]);
 *
 * У такой загрузки два дефекта, и оба воспроизведены в живом браузере
 * (scratch/verify-patient-widget-race.mjs):
 *
 *   1. Состояние не сбрасывается при смене пациента. Пока идёт запрос по
 *      новому пациенту, на его карточке показаны данные предыдущего — и
 *      без индикатора загрузки, то есть как достоверные. На медленной
 *      сети это секунды чужой переписки и чужих осложнений на чужой
 *      карточке.
 *
 *   2. Устаревший ответ не отбрасывается. Если ответ по ранее выбранному
 *      пациенту приходит позже ответа по текущему, он перетирает экран и
 *      остаётся там до следующего переключения.
 *
 * Хук закрывает оба: данные обнуляются синхронно при смене пациента, а
 * запрос отменяется и его результат игнорируется, если пациент сменился.
 *
 * ОПТИМИЗАЦИЯ ZERO-DELAY COLD BOOT & STALE-WHILE-REVALIDATE (Мандаты 8e, 8n):
 * Если для выбранного пациента уже есть локальный кэш (L1 RAM / safeLocalStorage),
 * он подставляется СИНХРОННО (0 ms latency), исключая мерцание и пустые спиннеры
 * на слабых моноблоках (Celeron / Atom / 4GB RAM).
 * При ответе сети кэш обновляется методом сквозной записи (Write-Through).
 *
 * `reload` нужен виджетам, которые перечитывают список после своей же
 * мутации (создали задачу — обновили список).
 *
 * `error` появился по третьей причине: отказ сервера (404 на несуществующий
 * адрес, 500 на сбой запроса) раньше оставлял пустое значение, и виджет
 * показывал «данных нет». Это ложь: данные могут быть, их не удалось
 * получить. Виджет обязан показать отказ, а не выдать его за пустоту.
 *
 * ЧЕТВЁРТАЯ ПРИЧИНА, ПОЧЕМУ ЭТОТ ФАЙЛ ПРАВИЛСЯ СНОВА. Текст отказа был
 * «Сервер ответил ошибкой 500. Данные не загружены.» — и три виджета карточки
 * печатали его дословно. Голый код состояния администратору не говорит ни что
 * случилось, ни что делать; номер нужен разработчику и уходит в logger.error.
 * Формулировки живут в одном месте — lib/panelStateText.ts.
 *
 * `failureStatus` отдаётся рядом с `error`, чтобы виджет мог собрать своё
 * предложение через `panelStateText` и назвать последствие отказа по-своему:
 * «осложнения не прочитаны» и «задачи не прочитаны» — разные по цене вещи.
 */
export function usePatientResource<T>(
	patientId: string | null | undefined,
	buildUrl: (patientId: string) => string,
	buildHeaders: () => Record<string, string>,
	emptyValue: T,
): {
	data: T;
	setData: React.Dispatch<React.SetStateAction<T>>;
	isLoading: boolean;
	/** Готовая человеческая причина отказа с точкой на конце, либо null. */
	error: string | null;
	/** Код ответа сервера при отказе; null — до сервера не дошли или отказа не было. */
	failureStatus: number | null;
	reload: () => void;
} {
	// Функции приходят новыми на каждом рендере. Держим их в ref, иначе
	// эффект перезапускался бы постоянно и бомбил бы API.
	const urlRef = useRef(buildUrl);
	urlRef.current = buildUrl;
	const headersRef = useRef(buildHeaders);
	headersRef.current = buildHeaders;
	const emptyRef = useRef(emptyValue);

	// Первичное мгновенное чтение из L1 RAM / LocalStorage кэша (0 ms)
	const getInitialData = (): T => {
		if (!patientId) return emptyValue;
		try {
			const resourceUrl = urlRef.current(patientId);
			const cached = getCachedClinicalRecordSync<T>(
				"patient_resource",
				`${patientId}:${resourceUrl}`,
			);
			return cached ? cached.data : emptyValue;
		} catch {
			return emptyValue;
		}
	};

	const [data, setData] = useState<T>(getInitialData);
	const [isLoading, setIsLoading] = useState<boolean>(() => {
		if (!patientId) return false;
		try {
			const resourceUrl = urlRef.current(patientId);
			const cached = getCachedClinicalRecordSync<T>(
				"patient_resource",
				`${patientId}:${resourceUrl}`,
			);
			return !cached;
		} catch {
			return true;
		}
	});
	const [error, setError] = useState<string | null>(null);
	const [failureStatus, setFailureStatus] = useState<number | null>(null);
	const [_reloadToken, setReloadToken] = useState(0);

	useEffect(() => {
		if (!patientId) {
			setData(emptyRef.current);
			setIsLoading(false);
			setError(null);
			setFailureStatus(null);
			return;
		}

		const resourceUrl = urlRef.current(patientId);
		const cached = getCachedClinicalRecordSync<T>(
			"patient_resource",
			`${patientId}:${resourceUrl}`,
		);

		if (cached) {
			// Мгновенная гидратация для конкретного выбранного пациента (0 ms)
			setData(cached.data);
			setIsLoading(false);
		} else {
			// Данные предыдущего пациента убираются ДО ответа сервера, а не после.
			setData(emptyRef.current);
			setIsLoading(true);
		}
		setError(null);
		setFailureStatus(null);

		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const res = await fetch(resourceUrl, {
					headers: headersRef.current(),
					signal: controller.signal,
				});
				if (cancelled) return;
				if (!res.ok) {
					// Код состояния нужен поддержке, а не оператору: он в консоли.
					logger.error(
						`[usePatientResource ${patientId}] ответ ${res.status} на ${resourceUrl}`,
					);
					setFailureStatus(res.status);
					setError(`${panelFailureCause(res.status)}.`);
					return;
				}
				const parsed = (await res.json()) as T;
				// Повторная проверка: разбор тела — тоже await, за это время
				// пациент мог смениться.
				if (cancelled) return;
				setData(parsed);
				// Сквозная запись в локальный кэш (Write-Through)
				void cacheClinicalRecord(
					"patient_resource",
					`${patientId}:${resourceUrl}`,
					parsed,
				);
			} catch (requestError) {
				if (cancelled) return;
				if ((requestError as Error)?.name === "AbortError") return;
				logger.error(`[usePatientResource ${patientId}]`, requestError);
				// null означает «до сервера не дошли вовсе» — это другая причина
				// и другое действие, чем любой ответ сервера.
				setFailureStatus(null);
				setError(`${panelFailureCause(null)}.`);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [patientId, _reloadToken]);

	const reload = useCallback(() => setReloadToken((token) => token + 1), []);

	return { data, setData, isLoading, error, failureStatus, reload };
}
