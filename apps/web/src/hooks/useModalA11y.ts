/**
 * useModalA11y.ts — Hook и утилиты клавиатурной доступности (A11y), Focus Trap и Escape для модальных окон DENTE CRM.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Escape Keydown: закрытие модального окна (onClose) с предотвращением всплытия.
 * 2. Focus Trap (Tab / Shift+Tab): циклическая навигация внутри модального окна без выпадения фокуса на фоновые слои.
 * 3. AutoFocus: автоматический фокус на первичном поле ввода или первом интерактивном элементе при открытии.
 * 4. Enter Key Submission: мгновенная фиксация/фискализация при нажатии Enter в полях ввода сумм/оплаты.
 */

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";

export const FOCUSABLE_ELEMENTS_SELECTOR =
	'button:not([disabled]):not([aria-hidden="true"]), [href], input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"]), select:not([disabled]):not([aria-hidden="true"]), textarea:not([disabled]):not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])';

export interface UseModalA11yOptions {
	isOpen: boolean;
	onClose: () => void;
	onSubmit?: (() => void) | undefined;
	autoFocusRef?: RefObject<HTMLElement | null> | undefined;
	initialFocusSelector?: string | undefined;
	enableEscape?: boolean | undefined;
	enableFocusTrap?: boolean | undefined;
}

/**
 * Чистая функция Focus Trap для циклического удержания фокуса в контейнере (подходит для прямого тестирования).
 */
export function trapTabKey(
	event: KeyboardEvent | { key: string; shiftKey: boolean; preventDefault: () => void },
	container: HTMLElement,
	activeElement: Element | null = typeof document !== "undefined" ? document.activeElement : null,
): boolean {
	if (event.key !== "Tab") return false;

	const focusable = Array.from(
		container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR),
	).filter((el) => {
		// Исключаем невидимые элементы если offsetParent === null (в DOM среде)
		if (typeof el.offsetParent !== "undefined" && el.offsetParent === null && el.offsetWidth === 0) {
			return false;
		}
		return true;
	});

	if (focusable.length === 0) {
		event.preventDefault();
		return true;
	}

	const first = focusable[0];
	const last = focusable[focusable.length - 1];

	if (event.shiftKey) {
		// Shift + Tab: если фокус на первом элементе или вне контейнера -> переводим на последний
		if (!activeElement || activeElement === first || !container.contains(activeElement)) {
			event.preventDefault();
			last?.focus();
			return true;
		}
	} else {
		// Tab: если фокус на последнем элементе или вне контейнера -> переводим на первый
		if (!activeElement || activeElement === last || !container.contains(activeElement)) {
			event.preventDefault();
			first?.focus();
			return true;
		}
	}

	return false;
}

/**
 * React Hook для управления A11y, Focus Trap и Escape в модальных окнах.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
	isOpen,
	onClose,
	onSubmit,
	autoFocusRef,
	initialFocusSelector,
	enableEscape = true,
	enableFocusTrap = true,
}: UseModalA11yOptions): {
	modalRef: RefObject<T | null>;
	handleInputEnterKeyDown: (e: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
} {
	const modalRef = useRef<T | null>(null);

	// 1. AutoFocus при открытии
	useEffect(() => {
		if (!isOpen) return;

		const timer = setTimeout(() => {
			if (autoFocusRef?.current) {
				autoFocusRef.current.focus();
				return;
			}
			if (modalRef.current) {
				if (initialFocusSelector) {
					const target = modalRef.current.querySelector<HTMLElement>(initialFocusSelector);
					if (target) {
						target.focus();
						return;
					}
				}
				const firstFocusable = modalRef.current.querySelector<HTMLElement>(
					FOCUSABLE_ELEMENTS_SELECTOR,
				);
				firstFocusable?.focus();
			}
		}, 40);

		return () => clearTimeout(timer);
	}, [isOpen, autoFocusRef, initialFocusSelector]);

	// 2. Глобальный обработчик Escape и Focus Trap
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (enableEscape && e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				onClose();
				return;
			}

			if (enableFocusTrap && e.key === "Tab" && modalRef.current) {
				trapTabKey(e, modalRef.current, document.activeElement);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose, enableEscape, enableFocusTrap]);

	// 3. Обработчик нажатия Enter в инпутах
	const handleInputEnterKeyDown = (
		e: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		if (e.key === "Enter" && onSubmit) {
			e.preventDefault();
			onSubmit();
		}
	};

	return {
		modalRef,
		handleInputEnterKeyDown,
	};
}
