import { useCallback, useRef } from "react";
import type { Dashboard } from "@dental/shared";
import { WorkflowResponseError, responseErrorMessage } from "../../AppHelpers";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";

export interface DashboardLoaderLogicProps {
	authRef: { current: any };
	setDashboard: (dashboard: Dashboard | null) => void;
	setAccessUnlockRequired: (required: boolean) => void;
	setAccessUnlockMessage: (message: string) => void;
	showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
	setError: (error: string) => void;
	loadPersistenceHealthRef: { current: any };
	refreshSpeechRuntimeRef: { current: any };
}

export function useDashboardLoaderLogic({
	authRef,
	setDashboard,
	setAccessUnlockRequired,
	setAccessUnlockMessage,
	showToast,
	setError,
	loadPersistenceHealthRef,
	refreshSpeechRuntimeRef,
}: DashboardLoaderLogicProps) {
	const dashboardRequestSeqRef = useRef(0);

	const loadDashboard = useCallback(
		async (options: { adminSecret?: string } = {}) => {
			// БЫЛО: защиты от гонки не было, а loadDashboard вызывается из 34 мест.
			// Сценарий: загрузка при открытии экрана ещё идёт, врач сохраняет запись
			// приёма — сохранение тоже вызывает loadDashboard и получает свежие данные,
			// но МЕДЛЕННЫЙ первый ответ приходит последним и перезаписывает состояние
			// данными ДО сохранения. Только что записанный приём исчезал с экрана
			// до ручного обновления страницы.
			// Применяем только ответ последнего по времени запроса.
			const requestId = ++dashboardRequestSeqRef.current;
			const isStaleResponse = () => requestId !== dashboardRequestSeqRef.current;
			
			try {
				const response = await fetch("/api/dashboard", {
					cache: "no-store",
					headers: authRef.current.denteClinicalReadHeaders({}, options.adminSecret),
				});
				if (!response.ok) {
					const message = await responseErrorMessage(
						response,
						"Данные клиники не загружены",
					);
					throw new WorkflowResponseError(message, response.status);
				}
				const payload = (await response.json()) as Dashboard;
				// Пока ждали ответ, стартовал более свежий запрос — его результат
				// актуальнее, этот молча игнорируем.
				if (isStaleResponse()) return;
				setDashboard(payload);
				setAccessUnlockRequired(false);
				setAccessUnlockMessage("");
			} catch (err) {
				showToast(
					actionFailureToast(
						"Не удалось загрузить данные клиники. Проверьте связь с сервером и повторите — введённые данные не потеряны.",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (isStaleResponse()) return;
				// БЫЛО: любая ошибка загрузки (обрыв сети, 401, 500) подменяла реальные
				// данные клиники ВЫМЫШЛЕННЫМИ: «Демо Клиника DENTE» и пациент
				// «Смирнов Алексей Петрович» с id "pat-1", который тут же выбирался
				// активным. Врач мог диктовать приём в карту несуществующего человека.
				// Кроме того, catch никогда не пробрасывал ошибку дальше, поэтому
				// все .catch() у вызывающих (в том числе принудительный релогин при 401)
				// были мёртвым кодом, и истёкшая сессия не приводила к повторному входу.
				logger.error("[Dente] Не удалось загрузить данные клиники:", err);
				const isAuthError =
					err instanceof Error &&
					/401|403|Требуется авторизация|Сессия истекла/i.test(err.message);
				if (isAuthError) {
					setAccessUnlockRequired(true);
					setAccessUnlockMessage(
						"Сессия истекла. Войдите в кабинет клиники заново.",
					);
				} else {
					setError(
						"Не удалось загрузить данные клиники. Проверьте связь с сервером и повторите — введённые данные не потеряны.",
					);
				}
				// Прежнее состояние НЕ затираем: пусть на экране останутся последние
				// корректные данные, а не подделка.
				//
				// Ошибку намеренно НЕ пробрасываем: loadDashboard вызывается из 34 мест,
				// часть — через \`void loadDashboard()\`, и бросок превратился бы в
				// необработанные отклонения промисов. Вместо этого истёкшая сессия
				// обрабатывается прямо здесь (setAccessUnlockRequired выше) — именно
				// этого добивались внешние .catch(), которые раньше не срабатывали.
			}
			void loadPersistenceHealthRef.current({
				silent: true,
				adminSecret: options.adminSecret,
			});
			void refreshSpeechRuntimeRef.current({ silent: true });
		},
		[
			authRef,
			setDashboard,
			setAccessUnlockRequired,
			setAccessUnlockMessage,
			showToast,
			setError,
			loadPersistenceHealthRef,
			refreshSpeechRuntimeRef,
		],
	);

	return {
		loadDashboard,
	};
}
