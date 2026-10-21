import type { Appointment } from "@dental/shared";
import { useCallback } from "react";
import { showToast } from "../../GlobalToast";
import type {
	QUICK_APPOINTMENT_REASONS,
	TECHNICAL_BREAK_PRESETS,
} from "../AppointmentModalQuickReasons";

interface UseAppointmentModalPresetsParams {
	setReason: (fn: string | ((prev: string) => string)) => void;
	comment: string;
	setComment: (fn: string | ((prev: string) => string)) => void;
	status: Appointment["status"];
	setStatus: (status: Appointment["status"]) => void;
	setIsCito: (isCito: boolean) => void;
	applyDuration: (minutes: number) => void;
}

export function useAppointmentModalPresets({
	setReason,
	comment,
	setComment,
	status,
	setStatus,
	setIsCito,
	applyDuration,
}: UseAppointmentModalPresetsParams) {
	const handleApplyReasonPreset = useCallback(
		(preset: (typeof QUICK_APPOINTMENT_REASONS)[number]) => {
			setReason(preset.reason);
			applyDuration(preset.durationMinutes);
			if (preset.tone === "emergency") {
				setIsCito(true);
			}
			if ("comment" in preset && preset.comment && !comment) {
				setComment(preset.comment);
			}
			if ("status" in preset && preset.status) {
				setStatus(preset.status);
			}
		},
		[applyDuration, comment, setReason, setComment, setIsCito, setStatus],
	);

	const handleApplyTechnicalBreakPreset = useCallback(
		(preset: (typeof TECHNICAL_BREAK_PRESETS)[number]) => {
			setReason(preset.reason);
			applyDuration(preset.durationMinutes);
			setComment(preset.comment);
		},
		[applyDuration, setReason, setComment],
	);

	const handleApplyRefusalReason = useCallback(
		(nameRu: string) => {
			const cancelTag = `[Отмена: ${nameRu}]`;
			setComment((prev) => {
				if (/\[Отмена:[^\]]*\]/.test(prev)) {
					return prev.replace(/\[Отмена:[^\]]*\]/, cancelTag);
				}
				return prev.trim() ? `${prev.trim()}\n${cancelTag}` : cancelTag;
			});
		},
		[setComment],
	);

	const handleConvertToCito = useCallback(() => {
		setIsCito(true);
		const citoReason = "Срочно! Острая боль";
		setReason((prev) => (prev ? `${citoReason} (${prev})` : citoReason));
		applyDuration(30);
		if (!comment.includes("Экстренно") && !comment.includes("CITO")) {
			setComment((prev) =>
				prev
					? `${prev}\n[Экстренно: обращение с острой болью]`
					: "[Экстренно: обращение с острой болью]",
			);
		}
		if (status === "planned") {
			setStatus("confirmed");
		}
		showToast(
			"Приём переведён в срочную запись (Острая боль): 30 мин, наложение слота допустимо",
			"warning",
			3500,
		);
	}, [
		comment,
		status,
		applyDuration,
		setIsCito,
		setReason,
		setComment,
		setStatus,
	]);

	return {
		handleApplyReasonPreset,
		handleApplyTechnicalBreakPreset,
		handleApplyRefusalReason,
		handleConvertToCito,
	};
}
