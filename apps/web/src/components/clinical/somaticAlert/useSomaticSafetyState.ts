import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	type SomaticSafetyEvaluation,
	applySomaticNorm,
	evaluateSomaticSafety,
} from "@dental/shared";
import type { SomaticSafetyAlertWidgetProps } from "./types";

export function useSomaticSafetyState(props: SomaticSafetyAlertWidgetProps) {
	const { patient, allergyText, onApplyNorm, onSyncToDiary } = props;
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const popoverRef = useRef<HTMLDivElement | null>(null);
	const triggerRef = useRef<HTMLButtonElement | null>(null);

	const evaluation: SomaticSafetyEvaluation = useMemo(() => {
		return evaluateSomaticSafety(patient, allergyText);
	}, [patient, allergyText]);

	useEffect(() => {
		if (!isPopoverOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsPopoverOpen(false);
				triggerRef.current?.focus();
			}
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node) &&
				triggerRef.current &&
				!triggerRef.current.contains(e.target as Node)
			) {
				setIsPopoverOpen(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isPopoverOpen]);

	const handleApplyNormClick = useCallback(
		(e?: React.MouseEvent) => {
			e?.stopPropagation();
			setIsPopoverOpen(false);
			const normProfile = applySomaticNorm(typeof patient === "object" ? patient : null);
			const evalNorm = evaluateSomaticSafety(normProfile);
			if (onApplyNorm) {
				onApplyNorm(evalNorm.diary043uSnippet);
			}
			showToast("Применена норма: соматически здоров", "success", 3000);
		},
		[patient, onApplyNorm],
	);

	const handleSyncToDiaryClick = useCallback(
		(e?: React.MouseEvent) => {
			e?.stopPropagation();
			const snippet = evaluation.diary043uSnippet;
			if (onSyncToDiary) {
				onSyncToDiary(snippet);
			}
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				navigator.clipboard.writeText(snippet).catch(() => {});
			}
			showToast("Стоп-факторы и рекомендации скопированы в карту", "success", 3000);
		},
		[evaluation.diary043uSnippet, onSyncToDiary],
	);

	return {
		evaluation,
		isPopoverOpen,
		setIsPopoverOpen,
		popoverRef,
		triggerRef,
		handleApplyNormClick,
		handleSyncToDiaryClick,
	};
}
