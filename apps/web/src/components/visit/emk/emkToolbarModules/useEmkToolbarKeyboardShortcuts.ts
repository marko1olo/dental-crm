import React from "react";
import { showToast } from "../../../GlobalToast";

export function useEmkToolbarKeyboardShortcuts(
	canUndo: boolean,
	canRedo: boolean,
	handleUndo: () => boolean,
	handleRedo: () => boolean,
) {
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			const isTextInput =
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable);

			if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "z" || e.key === "Z" || e.key === "я" || e.key === "Я")
			) {
				if (e.shiftKey) {
					if (!isTextInput && canRedo) {
						e.preventDefault();
						const ok = handleRedo();
						if (ok) showToast("Действие возвращено (Redo)", "info", 2000);
					}
				} else {
					if (!isTextInput && canUndo) {
						e.preventDefault();
						const ok = handleUndo();
						if (ok) showToast("Действие отменено (Undo)", "info", 2000);
					}
				}
			} else if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "y" || e.key === "Y" || e.key === "н" || e.key === "Н")
			) {
				if (!isTextInput && canRedo) {
					e.preventDefault();
					const ok = handleRedo();
					if (ok) showToast("Действие возвращено (Redo)", "info", 2000);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [canUndo, canRedo, handleUndo, handleRedo]);
}
