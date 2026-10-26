import { useState, useEffect } from "react";
import { showToast } from "../../../GlobalToast";
import type { TelegramPhoneSimulatorProps } from "./types";

export function useSimulatorState(props: TelegramPhoneSimulatorProps) {
	const {
		channel = "telegram",
		previewScreenId,
		onScreenChange,
		themeMode: externalThemeMode,
		onThemeModeChange,
	} = props;

	const [internalThemeMode, setInternalThemeMode] = useState<"light" | "dark">(() => {
		if (typeof document !== "undefined") {
			return document.documentElement.classList.contains("dark") ||
				document.documentElement.getAttribute("data-theme") === "dark"
				? "dark"
				: "light";
		}
		return "light";
	});
	const activeTheme = externalThemeMode ?? internalThemeMode;

	const handleThemeToggle = () => {
		const next = activeTheme === "light" ? "dark" : "light";
		if (onThemeModeChange) onThemeModeChange(next);
		else setInternalThemeMode(next);
	};

	const [currentScreenId, setCurrentScreenId] = useState<string>(previewScreenId || "root");
	const [toastNotice, setToastNotice] = useState<string | null>(null);
	const [copied, setCopied] = useState<boolean>(false);

	useEffect(() => {
		if (previewScreenId && previewScreenId !== currentScreenId) {
			setCurrentScreenId(previewScreenId);
		}
	}, [previewScreenId, currentScreenId]);

	const showMiniToast = (text: string) => {
		setToastNotice(text);
		setTimeout(() => setToastNotice((prev) => (prev === text ? null : prev)), 3000);
	};

	const changeScreen = (screenId: string) => {
		setCurrentScreenId(screenId);
		if (onScreenChange) onScreenChange(screenId);
	};

	const resetToStart = () => {
		changeScreen("root");
		showMiniToast(
			channel === "telegram"
				? "Диалог перезапущен: /start"
				: channel === "vk"
					? "Сообщество VK: Переход в начало"
					: "WhatsApp: Новое приветствие",
		);
	};

	const handleCopyText = async (text: string) => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(text);
			}
			setCopied(true);
			showToast("Текст сообщения скопирован в буфер", "success");
			setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать текст", "warning");
		}
	};

	return {
		activeTheme,
		handleThemeToggle,
		currentScreenId,
		toastNotice,
		copied,
		showMiniToast,
		changeScreen,
		resetToStart,
		handleCopyText,
	};
}
