import { useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import type { SnilsValidationResult } from "./doctorSnilsTypes";

export function useDoctorSnilsValidation(
	initialSnils: string,
	onValidSnils?: ((formattedSnils: string) => void) | undefined,
) {
	const [snils, setSnils] = useState(initialSnils);
	const [isValidating, setIsValidating] = useState(false);
	const [validationResult, setValidationResult] = useState<SnilsValidationResult | null>(null);

	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	async function handleValidate() {
		if (!snils.trim()) {
			setValidationResult({
				ok: false,
				message: "Введите СНИЛС врача для проверки.",
			});
			return;
		}

		setIsValidating(true);
		setValidationResult(null);

		try {
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders({
							"Content-Type": "application/json",
						})
					: { "Content-Type": "application/json" };
			const response = await fetch("/api/clinical/egisz/validate-doctor-snils", {
				method: "POST",
				headers,
				body: JSON.stringify({ snils }),
			});

			const data = await response.json();
			const formattedSnils = data.formatted || data.snilsFormatted;

			if (response.ok && data.ok) {
				setValidationResult({
					ok: true,
					formatted: formattedSnils,
					message: "СНИЛС подтверждён в реестре медицинских работников (ФРМР).",
				});
				if (onValidSnils && formattedSnils) {
					onValidSnils(formattedSnils);
				}
			} else {
				setValidationResult({
					ok: false,
					message:
						data.message ||
						"СНИЛС не прошёл проверку контрольного числа. Сохранение профиля врача доступно в 1 клик.",
				});
			}
		} catch (_err) {
			showToast(
				actionFailureToast(
					"Ошибка проверки СНИЛС",
					(_err as { status?: number })?.status ?? null,
				),
				"error",
			);
			setValidationResult({
				ok: false,
				message: "Сервис проверки временно недоступен. Сохранение профиля врача не блокируется.",
			});
		} finally {
			setIsValidating(false);
		}
	}

	return {
		snils,
		setSnils,
		isValidating,
		validationResult,
		handleValidate,
	};
}
