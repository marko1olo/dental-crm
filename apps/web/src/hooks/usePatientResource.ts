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
	reload: () => void;
} {
	const [data, setData] = useState<T>(emptyValue);
	const [isLoading, setIsLoading] = useState<boolean>(Boolean(patientId));
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
			return;
		}

		// Данные предыдущего пациента убираются ДО ответа сервера, а не после.
		setData(emptyRef.current);
		setIsLoading(true);

		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const res = await fetch(urlRef.current(patientId), {
					headers: headersRef.current(),
					signal: controller.signal,
				});
				if (cancelled) return;
				const parsed = res.ok ? ((await res.json()) as T) : null;
				// Повторная проверка: разбор тела — тоже await, за это время
				// пациент мог смениться.
				if (cancelled) return;
				if (parsed !== null) setData(parsed);
			} catch (error) {
				if (cancelled) return;
				if ((error as Error)?.name === "AbortError") return;
				console.error(`[usePatientResource ${patientId}]`, error);
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

	return { data, setData, isLoading, reload };
}
