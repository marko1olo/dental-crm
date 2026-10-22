import type React from "react";
import { useEffect, useRef, useState } from "react";
import { getToothStateFromHotkey } from "../ClassicGostOdontogram";
import type { ToothState } from "../ToothChart";
import type { RadialMenuItem } from "./radialMenuTypes";

export function useRadialKeyboardAndGestures(
	onClose: () => void,
	allItems: readonly RadialMenuItem[],
	selectedSurfaces: readonly string[],
	surfaces: readonly string[] | undefined,
	handleSelectStateWithHaptic: (state: ToothState, surfs?: readonly string[], subType?: string) => void,
) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [dragOffsetY, setDragOffsetY] = useState(0);
	const [isDraggingSheet, setIsDraggingSheet] = useState(false);
	const touchStartYRef = useRef(0);
	const isAtTopRef = useRef(true);

	const handleSheetTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		if (!touch) return;
		touchStartYRef.current = touch.clientY;
		const el = menuRef.current;
		isAtTopRef.current = el ? el.scrollTop <= 0 : true;
	};

	const handleSheetTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		if (!touch) return;
		const deltaY = touch.clientY - touchStartYRef.current;
		if (deltaY > 0 && isAtTopRef.current) {
			setDragOffsetY(deltaY);
			setIsDraggingSheet(true);
		}
	};

	const handleSheetTouchEnd = () => {
		if (dragOffsetY > 65) onClose();
		else {
			setDragOffsetY(0);
			setIsDraggingSheet(false);
		}
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") { onClose(); return; }
			const parsedState = getToothStateFromHotkey(e.key);
			if (parsedState) {
				e.preventDefault();
				handleSelectStateWithHaptic(parsedState, selectedSurfaces.length > 0 ? selectedSurfaces : surfaces);
				return;
			}
			const keyUpper = e.key.toUpperCase();
			const matched = allItems.find((it) => it.hotkey === keyUpper);
			if (matched && matched.state) {
				e.preventDefault();
				handleSelectStateWithHaptic(matched.state, selectedSurfaces.length > 0 ? selectedSurfaces : surfaces);
			}
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("mousedown", handleClickOutside);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("mousedown", handleClickOutside);
		};
	}, [onClose, allItems, surfaces, selectedSurfaces, handleSelectStateWithHaptic]);

	return { menuRef, dragOffsetY, isDraggingSheet, handleSheetTouchStart, handleSheetTouchMove, handleSheetTouchEnd };
}
