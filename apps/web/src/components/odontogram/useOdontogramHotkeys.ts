import { useEffect } from "react";
import type { ToothActionMenuConfig } from "./ToothActionMenuPortal";
import type { ToothState } from "./ToothChart";

export interface UseOdontogramHotkeysParams {
	readonly menuConfig: ToothActionMenuConfig | null;
	readonly setMenuConfig: React.Dispatch<
		React.SetStateAction<ToothActionMenuConfig | null>
	>;
	readonly handleApplyToothState: (state: ToothState) => void;
}

export function useOdontogramHotkeys({
	menuConfig,
	setMenuConfig,
	handleApplyToothState,
}: UseOdontogramHotkeysParams) {
	useEffect(() => {
		if (!menuConfig) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}

			if (e.key === "Escape") {
				e.preventDefault();
				setMenuConfig(null);
				return;
			}

			const key = e.key.toLowerCase();
			if (key === "c" || key === "с") {
				e.preventDefault();
				handleApplyToothState("Caries");
			} else if (key === "p" || key === "п") {
				e.preventDefault();
				handleApplyToothState("Pulpitis");
			} else if (key === "t" || key === "т") {
				e.preventDefault();
				handleApplyToothState("Periodontitis");
			} else if (key === "f" || key === "а") {
				e.preventDefault();
				handleApplyToothState("Filled");
			} else if (key === "k" || key === "к" || key === "r") {
				e.preventDefault();
				handleApplyToothState("Crown");
			} else if (key === "i" || key === "ш") {
				e.preventDefault();
				handleApplyToothState("Implant");
			} else if (key === "x" || key === "ч") {
				e.preventDefault();
				handleApplyToothState("Missing");
			} else if (key === "0" || key === "h" || key === "з") {
				e.preventDefault();
				handleApplyToothState("Healthy");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [menuConfig, setMenuConfig, handleApplyToothState]);
}
