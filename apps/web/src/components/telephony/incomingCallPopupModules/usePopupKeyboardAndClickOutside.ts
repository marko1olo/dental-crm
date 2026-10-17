import { useEffect } from "react";

export function usePopupKeyboardAndClickOutside(
	isCallDrawerOpen: boolean,
	closeCallDrawer: () => void,
	showBadgeMoreMenu: boolean,
	setShowBadgeMoreMenu: (show: boolean) => void,
) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (showBadgeMoreMenu) setShowBadgeMoreMenu(false);
				else if (isCallDrawerOpen) closeCallDrawer();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isCallDrawerOpen, closeCallDrawer, showBadgeMoreMenu, setShowBadgeMoreMenu]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				showBadgeMoreMenu &&
				!(e.target as HTMLElement).closest("[data-badge-more-container]")
			) {
				setShowBadgeMoreMenu(false);
			}
		};
		window.addEventListener("mousedown", handleClickOutside);
		return () => window.removeEventListener("mousedown", handleClickOutside);
	}, [showBadgeMoreMenu, setShowBadgeMoreMenu]);
}
