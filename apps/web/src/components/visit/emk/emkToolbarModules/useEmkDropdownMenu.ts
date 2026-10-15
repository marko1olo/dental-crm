import React from "react";

export function useEmkDropdownMenu() {
	const [isExtraMenuOpen, setIsExtraMenuOpen] = React.useState<boolean>(false);
	const [dropdownPos, setDropdownPos] = React.useState<{ top: number; left: number } | null>(null);
	const buttonRef = React.useRef<HTMLButtonElement | null>(null);
	const menuRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (isExtraMenuOpen && buttonRef.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			setDropdownPos({
				top: rect.bottom + 6,
				left: Math.max(8, Math.min(rect.left, window.innerWidth - 290)),
			});
		}
	}, [isExtraMenuOpen]);

	React.useEffect(() => {
		if (!isExtraMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				buttonRef.current && !buttonRef.current.contains(target) &&
				menuRef.current && !menuRef.current.contains(target)
			) {
				setIsExtraMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isExtraMenuOpen]);

	return {
		isExtraMenuOpen,
		setIsExtraMenuOpen,
		dropdownPos,
		buttonRef,
		menuRef,
	};
}
