import { useEffect } from "react";
import type { AppView } from "../../utils/routeUtils";

interface UseHotkeysControllerProps {
	setCurrentView: (view: AppView) => void;
	setQuery?: (q: string) => void;
	closeModals?: () => void;
}

export function useHotkeysController({
	setCurrentView,
	closeModals,
}: UseHotkeysControllerProps) {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const isEditable =
				target?.tagName === "INPUT" ||
				target?.tagName === "TEXTAREA" ||
				target?.isContentEditable;

			// Escape: закрытие модалок и оверлеев
			if (event.key === "Escape") {
				if (closeModals) {
					event.stopPropagation();
					closeModals();
				}
				return;
			}

			// Cmd+K или Ctrl+K: фокус на поиск
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				event.stopPropagation();
				const searchInput = document.querySelector<HTMLInputElement>(
					'input[type="search"], input[placeholder*="Поиск"], .dente-search-input',
				);
				if (searchInput) {
					searchInput.focus();
					searchInput.select();
				}
				return;
			}

			// Не перехватываем F-клавиши и навигацию при наборе текста
			if (isEditable) return;

			// F1: Справка / Онбординг
			if (event.key === "F1") {
				event.preventDefault();
				setCurrentView("settings");
				return;
			}

			// F2: Расписание
			if (event.key === "F2") {
				event.preventDefault();
				setCurrentView("schedule");
				return;
			}

			// F3: Пациенты
			if (event.key === "F3") {
				event.preventDefault();
				setCurrentView("patients");
				return;
			}

			// F4: Приём врача
			if (event.key === "F4") {
				event.preventDefault();
				setCurrentView("visit");
				return;
			}

			// F5: Касса / Финансы (Alt+F5 чтобы не блокировать браузерный рефреш)
			if (event.altKey && event.key === "F5") {
				event.preventDefault();
				setCurrentView("finance");
				return;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [setCurrentView, closeModals]);
}
