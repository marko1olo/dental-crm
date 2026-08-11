import { useEffect, useCallback } from "react";
import { inspectBrowserContinuity } from "../../browserContinuity";

interface GlobalAppCoordinatorProps {
	setBrowserDirectoryPickerAvailable: (v: boolean) => void;
	setBrowserContinuity: (v: any) => void;
	browserMigrationInputRef: React.RefObject<HTMLInputElement>;
}

export function useGlobalAppCoordinator({
	setBrowserDirectoryPickerAvailable,
	setBrowserContinuity,
	browserMigrationInputRef
}: GlobalAppCoordinatorProps) {

	useEffect(() => {
		setBrowserDirectoryPickerAvailable("showDirectoryPicker" in window);
		const migrationInput = browserMigrationInputRef.current;
		if (migrationInput && "webkitdirectory" in migrationInput) {
			migrationInput.setAttribute("webkitdirectory", "");
			migrationInput.setAttribute("directory", "");
		}
	}, [setBrowserDirectoryPickerAvailable]);

	useEffect(() => {
		let cancelled = false;
		const refresh = async () => {
			const status = await inspectBrowserContinuity();
			if (!cancelled) setBrowserContinuity(status);
		};
		const onVisibility = () => {
			if (document.visibilityState === "visible") void refresh();
		};
		const onControllerChange = () => void refresh();
		void refresh();
		window.addEventListener("online", refresh);
		window.addEventListener("offline", refresh);
		document.addEventListener("visibilitychange", onVisibility);
		navigator.serviceWorker?.addEventListener(
			"controllerchange",
			onControllerChange,
		);
		return () => {
			cancelled = true;
			window.removeEventListener("online", refresh);
			window.removeEventListener("offline", refresh);
			document.removeEventListener("visibilitychange", onVisibility);
			navigator.serviceWorker?.removeEventListener(
				"controllerchange",
				onControllerChange,
			);
		};
	}, [setBrowserContinuity]);

	return {};
}
