/**
 * PatientSecondaryActionsMenu.tsx — Выпадающее меню дополнительных действий карточки пациента.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 */

import { MoreHorizontal } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { PatientSecondaryActionsMenuProps } from "./secondaryActions/types";
import { SecondaryActionsDropdownList } from "./secondaryActions/SecondaryActionsDropdownList";

export type { PatientSecondaryActionsMenuProps } from "./secondaryActions/types";

export function PatientSecondaryActionsMenu(props: PatientSecondaryActionsMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div ref={menuRef} className="relative inline-block shrink-0">
			<button
				type="button"
				className="patient-card-more-btn min-h-[44px] sm:min-h-[36px] sm:h-9 sm:w-9 w-9 h-9 p-0 rounded-lg text-xs font-bold inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] hover:border-[var(--teal)] text-[var(--ink)] border border-[var(--line)]"
				onClick={() => setIsOpen((v) => !v)}
				title="Дополнительные действия с пациентом"
				aria-label="Дополнительные действия с пациентом"
				aria-haspopup="true"
				aria-expanded={isOpen}
				data-testid="patient-card-more-actions-btn"
			>
				<MoreHorizontal size={16} aria-hidden="true" />
			</button>

			{isOpen && (
				<SecondaryActionsDropdownList
					{...props}
					onClose={() => setIsOpen(false)}
				/>
			)}
		</div>
	);
}

export default PatientSecondaryActionsMenu;
