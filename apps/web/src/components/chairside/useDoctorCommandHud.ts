/**
 * @file useDoctorCommandHud.ts
 * @description Реактивный хук командного HUD врача у кресла (Chairside Doctor Command HUD).
 *
 * Инварианты клинической эргономики (Мандаты 8c, 8e, 8n):
 * 1. 0ms задержки: in-memory кэш пациентов и мгновенный парсинг команд.
 * 2. Номер зуба (FDI 11..48, 51..85): мгновенный выбор и скролл к зубу в формуле.
 * 3. Быстрые действия: касса (F9), новый визит (F3), норма (1-клик), рецепт (Rx), снимки (F7).
 * 4. Глобальный хоткей: Ctrl+K / Cmd+K / Ctrl+Л, закрытие по Esc, навигация стрелками.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";
import {
	playTactileEarcon,
	togglePatientPrivacyShield,
} from "../../lib/chairsideErgonomics";
import { searchDentalSsotMedications } from "@dental/shared";
import { isAppView } from "../../utils/routeUtils";

export type CommandCategory = "teeth" | "clinical" | "nav" | "patients";

export interface CommandHudItem {
	id: string;
	title: string;
	subtitle: string;
	category: CommandCategory;
	categoryLabel: string;
	shortcut?: string;
	action: () => void;
	toothNumber?: number;
	patientId?: string;
}

export interface UseDoctorCommandHudOptions {
	initialOpen?: boolean | undefined;
	onClose?: (() => void) | undefined;
	onNavigate?: ((view: string) => void) | undefined;
}

import {
	getFdiToothDescription,
	isValidFdiTooth,
	parseToothNumber,
} from "./toothCommandUtils";

export { isValidFdiTooth, parseToothNumber, getFdiToothDescription };

/**
 * Выбор и фокус зуба в зубной формуле приёма
 */
export function focusAndSelectTooth(
	toothNumber: number,
	onNavigate?: (view: string) => void,
): void {
	playTactileEarcon("norm");
	useVisitStore.getState().setActiveToothNumber(toothNumber);

	if (onNavigate) {
		onNavigate("visit");
	}
	if (typeof window !== "undefined") {
		window.location.hash = "visit";
		window.dispatchEvent(
			new CustomEvent("dente:select-tooth", { detail: { toothNumber } }),
		);

		// Мягкий плавный скролл к целевому зубу в DOM
		setTimeout(() => {
			const el = document.querySelector<HTMLElement>(
				`[data-tooth-id="${toothNumber}"]`,
			);
			if (el) {
				el.scrollIntoView({
					behavior: "smooth",
					block: "center",
					inline: "center",
				});
				el.classList.add("dente-tooth-hud-focus");
				setTimeout(() => el.classList.remove("dente-tooth-hud-focus"), 2000);
				el.focus?.();
			}
		}, 60);
	}
}

export function useDoctorCommandHud(options: UseDoctorCommandHudOptions = {}) {
	const [isOpen, setIsOpen] = useState<boolean>(Boolean(options.initialOpen));
	const [query, setQuery] = useState<string>("");
	const [selectedIndex, setSelectedIndex] = useState<number>(0);

	const appLogic = useOptionalAppLogicContext();
	const appStoreCurrentView = useAppStore((s) => s.currentView);
	const appStoreSetCurrentView = useAppStore((s) => s.setCurrentView);
	const dashboard = appLogic?.dashboard ?? useAppStore.getState().dashboard;

	const navigate = useCallback(
		(view: string) => {
			if (options.onNavigate) {
				options.onNavigate(view);
			} else if (appLogic?.setCurrentView && isAppView(view)) {
				appLogic.setCurrentView(view);
			} else if (appStoreSetCurrentView && isAppView(view)) {
				appStoreSetCurrentView(view);
			}
			if (typeof window !== "undefined") {
				window.location.hash = view;
			}
		},
		[options.onNavigate, appLogic?.setCurrentView, appStoreSetCurrentView],
	);

	// Глобальное переключение HUD (Ctrl+K, Cmd+K, кастомные события)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "k" || e.key === "K" || e.key === "л" || e.key === "Л")
			) {
				e.preventDefault();
				setIsOpen((prev) => !prev);
			} else if (e.key === "Escape") {
				setIsOpen(false);
			}
		};

		const handleCustomOpen = () => setIsOpen(true);
		const handleCustomClose = () => setIsOpen(false);
		const handleCustomToggle = () => setIsOpen((prev) => !prev);

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("dente:open-command-hud", handleCustomOpen);
		window.addEventListener("dente:close-command-hud", handleCustomClose);
		window.addEventListener("dente:toggle-command-hud", handleCustomToggle);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("dente:open-command-hud", handleCustomOpen);
			window.removeEventListener("dente:close-command-hud", handleCustomClose);
			window.removeEventListener(
				"dente:toggle-command-hud",
				handleCustomToggle,
			);
		};
	}, []);

	// Сброс индекса выбора при изменении строки поиска
	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	// In-memory список пациентов из dashboard
	const rawPatients = useMemo(() => {
		if (dashboard?.patients && Array.isArray(dashboard.patients)) {
			return dashboard.patients;
		}
		return [];
	}, [dashboard?.patients]);

	// Генерация и фильтрация результатов
	const results = useMemo<CommandHudItem[]>(() => {
		const q = query.trim().toLowerCase();
		const items: CommandHudItem[] = [];

		// 1. Проверка на ввод номера зуба
		const toothNum = parseToothNumber(q);
		if (toothNum !== null) {
			items.push({
				id: `tooth-${toothNum}`,
				title: `Зуб ${toothNum} · ${getFdiToothDescription(toothNum)}`,
				subtitle: "Выбрать и сфокусировать зуб в одонтограмме приёма (FDI)",
				category: "teeth",
				categoryLabel: "Зубная формула",
				shortcut: "Enter",
				toothNumber: toothNum,
				action: () => {
					focusAndSelectTooth(toothNum, navigate);
				},
			});
		}

		// 2. Быстрые клинические команды врача
		const clinicalCommands: CommandHudItem[] = [
			{
				id: "cmd-cashbox",
				title: "Касса и оплата",
				subtitle: "Принять оплату, фискальный чек 54-ФЗ, СБП QR и терминал",
				category: "clinical",
				categoryLabel: "Финансы",
				shortcut: "F9",
				action: () => {
					playTactileEarcon("pay");
					navigate("finance");
					window.dispatchEvent(new CustomEvent("dente:open-cashbox"));
				},
			},
			{
				id: "cmd-new-appointment",
				title: "Быстрая запись на приём",
				subtitle: "Создать визит в расписании за 5 секунд без блокировок",
				category: "clinical",
				categoryLabel: "Расписание",
				shortcut: "F3",
				action: () => {
					playTactileEarcon("save");
					navigate("schedule");
					window.dispatchEvent(new CustomEvent("dente:open-new-appointment"));
				},
			},
			{
				id: "cmd-somatic-norm",
				title: "✓ Физиологическая норма (Соматически здоров)",
				subtitle: "1-клик допуск: подтвердить норму без лишней бюрократии",
				category: "clinical",
				categoryLabel: "Приём у кресла",
				shortcut: "Норма",
				action: () => {
					playTactileEarcon("norm");
					window.dispatchEvent(
						new CustomEvent("dente:apply-somatic-norm"),
					);
					window.dispatchEvent(
						new CustomEvent("dente:show-toast", {
							detail: { message: "Физиологическая норма установлена в 1 клик" },
						}),
					);
				},
			},
			{
				id: "cmd-anesthesia-norm",
				title: "✓ Анестезия норма (Артикаин 1:100 000)",
				subtitle: "1 карпула 1.7 мл: мгновенное добавление в протокол приёма",
				category: "clinical",
				categoryLabel: "Приём у кресла",
				shortcut: "Анестезия",
				action: () => {
					playTactileEarcon("norm");
					window.dispatchEvent(
						new CustomEvent("dente:apply-anesthesia-preset", {
							detail: { preset: "articaine_1_100k" },
						}),
					);
					window.dispatchEvent(
						new CustomEvent("dente:show-toast", {
							detail: { message: "Анестезия: Артикаин 1:100 000 внесена в карту" },
						}),
					);
				},
			},
			{
				id: "cmd-prescriptions-rx",
				title: "Выписать рецепт (Каталог Rx)",
				subtitle: "Амоксиклав, Нимесил, Хлоргексидин по протоколам СтАР",
				category: "clinical",
				categoryLabel: "Назначения",
				shortcut: "Rx",
				action: () => {
					playTactileEarcon("norm");
					navigate("visit");
					window.dispatchEvent(new CustomEvent("dente:open-prescriptions"));
				},
			},
			{
				id: "cmd-imaging-xray",
				title: "Снимки и лучевая диагностика",
				subtitle: "Радиовизиограф (RVG), панорама (ОПТГ) и КЛКТ 3D",
				category: "nav",
				categoryLabel: "Диагностика",
				shortcut: "F7",
				action: () => {
					playTactileEarcon("norm");
					navigate("imaging");
				},
			},
			{
				id: "cmd-tooth-formula",
				title: "Зубная формула (FDI)",
				subtitle: "Перейти к интерактивной зубной формуле приёма",
				category: "nav",
				categoryLabel: "Приём у кресла",
				shortcut: "F4",
				action: () => {
					playTactileEarcon("norm");
					navigate("visit");
				},
			},
			{
				id: "cmd-patient-registry",
				title: "Картотека пациентов",
				subtitle: "Реестр пациентов, медицинские карты и баланс",
				category: "nav",
				categoryLabel: "База данных",
				shortcut: "F2",
				action: () => {
					playTactileEarcon("norm");
					navigate("patients");
				},
			},
			{
				id: "cmd-documents-hub",
				title: "Медицинские документы и согласия",
				subtitle: "Форма 043/у, печать ИДС, договоры и акты",
				category: "nav",
				categoryLabel: "Документооборот",
				shortcut: "F10",
				action: () => {
					playTactileEarcon("norm");
					navigate("documents");
				},
			},
			{
				id: "cmd-hygiene-protocol",
				title: "Протокол: Профессиональная гигиена",
				subtitle: "УЗ-удаление зубных отложений, AirFlow и полировка",
				category: "clinical",
				categoryLabel: "Протоколы лечения",
				action: () => {
					playTactileEarcon("norm");
					navigate("visit");
					window.dispatchEvent(
						new CustomEvent("dente-apply-soap-protocol", {
							detail: { protocol: "hygiene" },
						}),
					);
				},
			},
			{
				id: "cmd-caries-protocol",
				title: "Протокол: Лечение кариеса",
				subtitle: "Препарирование и светоотверждаемая реставрация",
				category: "clinical",
				categoryLabel: "Протоколы лечения",
				action: () => {
					playTactileEarcon("norm");
					navigate("visit");
					window.dispatchEvent(
						new CustomEvent("dente-apply-soap-protocol", {
							detail: { protocol: "caries" },
						}),
					);
				},
			},
			{
				id: "cmd-endo-protocol",
				title: "Протокол: Эндодонтическое лечение",
				subtitle: "Инструментальная обработка и пломбирование каналов",
				category: "clinical",
				categoryLabel: "Протоколы лечения",
				action: () => {
					playTactileEarcon("norm");
					navigate("visit");
					window.dispatchEvent(
						new CustomEvent("dente-apply-soap-protocol", {
							detail: { protocol: "pulpitis" },
						}),
					);
				},
			},
			{
				id: "cmd-privacy-shield",
				title: "Режим «Экран пациента» (Скрыть приватное)",
				subtitle: "Скрыть финансовые и служебные данные для демонстрации снимка",
				category: "clinical",
				categoryLabel: "Приватность",
				shortcut: "Alt+H",
				action: () => {
					playTactileEarcon("privacy");
					togglePatientPrivacyShield();
				},
			},
		];

		// Фильтрация команд по тексту
		if (!q) {
			items.push(...clinicalCommands.slice(0, 8));
		} else {
			const matchingCommands = clinicalCommands.filter((cmd) => {
				const fullText =
					`${cmd.title} ${cmd.subtitle} ${cmd.categoryLabel}`.toLowerCase();
				return fullText.includes(q);
			});
			items.push(...matchingCommands);
		}

		// 3. Быстрый поиск пациентов (0ms in-memory cache)
		if (q.length >= 2 && toothNum === null) {
			const matchingPatients = rawPatients
				.filter((p: any) => {
					const name = (p.fullName || "").toLowerCase();
					const phone = (p.phone || "").replace(/\D/g, "");
					const card = (
						p.cardNumber ||
						p.chartNumber ||
						p.medicalCardNumber ||
						""
					).toLowerCase();
					const qDigits = q.replace(/\D/g, "");

					return (
						name.includes(q) ||
						(qDigits.length >= 3 && phone.includes(qDigits)) ||
						card.includes(q)
					);
				})
				.slice(0, 5);

			for (const p of matchingPatients) {
				const cardStr =
					p.cardNumber || p.chartNumber || p.medicalCardNumber || "";
				items.push({
					id: `patient-${p.id}`,
					title: p.fullName || "Пациент",
					subtitle: `Тел: ${p.phone || "—"}${cardStr ? ` · Карта №${cardStr}` : ""}${p.birthDate ? ` · Дата рожд: ${p.birthDate}` : ""}`,
					category: "patients",
					categoryLabel: "Пациент",
					shortcut: "Открыть",
					patientId: p.id,
					action: () => {
						playTactileEarcon("norm");
						if (appLogic?.setSelectedPatientId) {
							appLogic.setSelectedPatientId(p.id);
						}
						navigate("patients");
					},
				});
			}
		}

		// 4. Поиск по каноническому формуляру лекарств (Rx SSOT)
		if (q.length >= 2 && toothNum === null) {
			const matchingMeds = searchDentalSsotMedications(q).slice(0, 4);
			for (const med of matchingMeds) {
				items.push({
					id: `rx-${med.id}`,
					title: `Рецепт: ${med.tradeNameRu}`,
					subtitle: `${med.latinRp} · ${med.signaRu}`,
					category: "clinical",
					categoryLabel: "Каталог Rx",
					shortcut: "Выписать",
					action: () => {
						playTactileEarcon("norm");
						navigate("visit");
						window.dispatchEvent(
							new CustomEvent("dente:open-prescriptions", {
								detail: { medicationId: med.id },
							}),
						);
					},
				});
			}
		}

		return items;
	}, [query, rawPatients, navigate, appLogic?.setSelectedPatientId]);

	const close = useCallback(() => {
		setIsOpen(false);
		setQuery("");
		if (options.onClose) {
			options.onClose();
		}
	}, [options.onClose]);

	const executeCurrent = useCallback(() => {
		if (results.length === 0) return;
		const target = results[selectedIndex] || results[0];
		if (target) {
			target.action();
			close();
		}
	}, [results, selectedIndex, close]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev - 1 < 0 ? Math.max(0, results.length - 1) : prev - 1,
				);
			} else if (e.key === "Enter") {
				e.preventDefault();
				executeCurrent();
			} else if (e.key === "Escape") {
				e.preventDefault();
				close();
			}
		},
		[results.length, executeCurrent, close],
	);

	return {
		isOpen,
		setIsOpen,
		query,
		setQuery,
		selectedIndex,
		setSelectedIndex,
		results,
		close,
		executeCurrent,
		handleKeyDown,
	};
}
