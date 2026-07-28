import { useCallback, useEffect, useRef, useState } from "react";

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
 * `reload` нужен виджетам, которые перечитывают список после своей же
 * мутации (создали задачу — обновили список).
 *
 * `error` появился по третьей причине: отказ сервера (404 на несуществующий
 * адрес, 500 на сбой запроса) раньше оставлял пустое значение, и виджет
 * показывал «данных нет». Это ложь: данные могут быть, их не удалось
 * получить. Виджет обязан показать отказ, а не выдать его за пустоту.
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
	error: string | null;
	reload: () => void;
} {
	const [data, setData] = useState<T>(emptyValue);
	const [isLoading, setIsLoading] = useState<boolean>(Boolean(patientId));
	const [error, setError] = useState<string | null>(null);
	const [reloadToken, setReloadToken] = useState(0);

	// Функции приходят новыми на каждом рендере. Держим их в ref, иначе
	// эффект перезапускался бы постоянно и бомбил бы API.
	const urlRef = useRef(buildUrl);
	urlRef.current = buildUrl;
	const headersRef = useRef(buildHeaders);
	headersRef.current = buildHeaders;
	const emptyRef = useRef(emptyValue);

	useEffect(() => {
		if (!patientId) {
			setData(emptyRef.current);
			setIsLoading(false);
			setError(null);
			return;
		}

		// Данные предыдущего пациента убираются ДО ответа сервера, а не после.
		setData(emptyRef.current);
		setIsLoading(true);
		setError(null);

		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const res = await fetch(urlRef.current(patientId), {
					headers: headersRef.current(),
					signal: controller.signal,
				});
				if (cancelled) return;
				if (!res.ok) {
					setError(`Сервер ответил ошибкой ${res.status}. Данные не загружены.`);
					return;
				}
				const parsed = (await res.json()) as T;
				// Повторная проверка: разбор тела — тоже await, за это время
				// пациент мог смениться.
				if (cancelled) return;
				setData(parsed);
			} catch (requestError) {
				if (cancelled) return;
				if ((requestError as Error)?.name === "AbortError") return;
				console.error(`[usePatientResource ${patientId}]`, requestError);
				setError("Не удалось связаться с сервером. Данные не загружены.");
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [patientId, reloadToken]);

	const reload = useCallback(() => setReloadToken((token) => token + 1), []);

	return { data, setData, isLoading, error, reload };
}
