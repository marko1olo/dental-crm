import { useCallback, useEffect, useRef } from "react";
import { showRollbackToast } from "../components/GlobalToast";

export interface RollbackActionOptions<T> {
	/** Сохраняемый снимок состояния до удаления (для мгновенного возврата) */
	item: T;
	/** Текст сообщения в тосте (например: "Услуга «Кариес эмали» удалена") */
	message: string;
	/** Мгновенная локальная мутация (удаление из стейта / сметы за 0 мс) */
	onExecute: (item: T) => void;
	/** Локальное восстановление состояния при нажатии Undo */
	onRollback: (item: T) => void;
	/** Окончательный коммит на бэкенд после истечения таймера (опционально) */
	onCommit?: (item: T) => Promise<void> | void;
	/** Длительность окна отката в миллисекундах (по умолчанию 5000 мс) */
	duration?: number;
	/** Подпись кнопки отмены (по умолчанию "Отменить") */
	actionLabel?: string;
}

interface PendingRollbackEntry<T> {
	id: string;
	item: T;
	timerId: NodeJS.Timeout;
	onRollback: (item: T) => void;
	onCommit?: ((item: T) => Promise<void> | void) | undefined;
}

/**
 * useToastRollback: Gmail/Apple-style Undo Stack для стоматологической CRM DENTE.
 * Ликвидирует блокирующие модалки «Вы уверены?» и window.confirm.
 * Обеспечивает мгновенное оптимистичное удаление (0 мс) с гарантированным окном отката 5 секунд.
 * Zero-Leak cleanup при размонтировании компонента.
 */
export function useToastRollback<T = unknown>() {
	// biome-ignore lint/suspicious/noExplicitAny: generic storage for pending rollbacks
	const pendingRef = useRef<Map<string, PendingRollbackEntry<any>>>(new Map());

	// Очистка при размонтировании: окончательно коммитим все зависшие действия
	useEffect(() => {
		const currentPending = pendingRef.current;
		return () => {
			for (const [_id, entry] of currentPending.entries()) {
				clearTimeout(entry.timerId);
				if (entry.onCommit) {
					try {
						void entry.onCommit(entry.item);
					} catch (e) {
						console.error("[useToastRollback] unmount commit failed:", e);
					}
				}
			}
			currentPending.clear();
		};
	}, []);

	const triggerRollback = useCallback((options: RollbackActionOptions<T>) => {
		const {
			item,
			message,
			onExecute,
			onRollback,
			onCommit,
			duration = 5000,
			actionLabel = "Отменить",
		} = options;

		const actionId = `rb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

		// 1. Мгновенное оптимистичное удаление (0 мс задержки)
		onExecute(item);

		// 2. Таймер окончательного коммита
		const timerId = setTimeout(() => {
			const entry = pendingRef.current.get(actionId);
			if (entry) {
				pendingRef.current.delete(actionId);
				if (entry.onCommit) {
					try {
						void entry.onCommit(entry.item);
					} catch (e) {
						console.error("[useToastRollback] commit failed:", e);
					}
				}
			}
		}, duration);

		// Регистрация в стеке
		pendingRef.current.set(actionId, {
			id: actionId,
			item,
			timerId,
			onRollback,
			onCommit,
		});

		// 3. Вызов тоста с кнопкой отката
		const handleUndo = () => {
			const entry = pendingRef.current.get(actionId);
			if (entry) {
				clearTimeout(entry.timerId);
				pendingRef.current.delete(actionId);
				try {
					entry.onRollback(entry.item);
				} catch (e) {
					console.error("[useToastRollback] rollback restore failed:", e);
				}
			}
		};

		showRollbackToast(message, handleUndo, duration, actionLabel);
	}, []);

	return { triggerRollback };
}
