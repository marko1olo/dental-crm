import { logger } from "../../utils/logger";

export interface VisibilityListenerHandlers {
	onVisibilityChange: (hidden: boolean) => void;
}

export function initVisibilityObserver(
	handlers: VisibilityListenerHandlers,
): (() => void) | null {
	if (typeof document === "undefined") return null;

	const listener = () => {
		const hidden = Boolean(document.hidden);
		logger.debug(`[LanDiscovery] Visibility changed: document.hidden=${hidden}`);
		handlers.onVisibilityChange(hidden);
	};

	document.addEventListener("visibilitychange", listener);
	return () => {
		document.removeEventListener("visibilitychange", listener);
	};
}

export function isDocumentCurrentlyHidden(): boolean {
	if (typeof document === "undefined") return false;
	return Boolean(document.hidden);
}
