/**
 * apps/web/src/components/visit/billing/VisitBillingDiscountPopover.tsx
 * Doctor autonomy discount chip with 1-click presets popover (Mandate 8e).
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { useState, useRef, useEffect } from "react";
import { Percent, ChevronUp, ChevronDown } from "lucide-react";
import { DoctorDiscountPresetsList } from "./DoctorDiscountPresetsList.js";

export interface VisitBillingDiscountPopoverProps {
	isGlobalWarranty100: boolean;
	globalDiscountPercent: number;
	globalDiscountReason: string;
	onApplyGlobalDiscount: (percent: number, reason: string) => void;
}

export const VisitBillingDiscountPopover: React.FC<VisitBillingDiscountPopoverProps> = ({
	isGlobalWarranty100,
	globalDiscountPercent,
	globalDiscountReason,
	onApplyGlobalDiscount,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("touchstart", handlePointerDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("touchstart", handlePointerDown);
		};
	}, [isOpen]);

	return (
		<div className="relative inline-block" ref={popoverRef}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				title="Свобода скидок врача (без паролей и согласований)"
				className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
					isGlobalWarranty100
						? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
						: globalDiscountPercent > 0
							? "bg-amber-50 dark:bg-amber-950/40 border-amber-500/40 text-amber-700 dark:text-amber-300"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
				}`}
				data-testid="chip-doctor-discount"
				aria-haspopup="true"
				aria-expanded={isOpen}
			>
				<Percent size={12} className={isGlobalWarranty100 ? "text-emerald-600" : globalDiscountPercent > 0 ? "text-amber-600" : "text-[var(--muted,#64748b)]"} />
				<span>
					{isGlobalWarranty100
						? "Гарантия 100%"
						: globalDiscountPercent > 0
							? `Скидка: ${globalDiscountPercent}%`
							: "Скидка: 0%"}
				</span>
				{isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
			</button>

			<div
				className={`absolute right-0 bottom-full mb-2 z-30 p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-xl space-y-1.5 ${
					isOpen ? "block animate-in fade-in slide-in-from-bottom-2 duration-150" : "hidden"
				}`}
				style={{ width: "260px", minWidth: "260px" }}
				data-testid="doctor-discount-bar"
			>
				<div className="flex items-center justify-between text-xs font-bold text-[var(--ink,#0f172a)] px-1 pb-1 border-b border-[var(--line,#e2e8f0)] whitespace-nowrap">
					<div className="flex items-center gap-1">
						<Percent size={12} className="text-amber-600 shrink-0" />
						<span>Свобода скидок врача:</span>
					</div>
					<span className="text-[10px] text-[var(--muted,#64748b)] font-normal">без паролей</span>
				</div>
				{globalDiscountPercent > 0 && (
					<div
						className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 whitespace-nowrap"
						data-testid="active-global-discount-badge"
					>
						Активна: {globalDiscountPercent}% {globalDiscountReason ? `(${globalDiscountReason})` : ""}
					</div>
				)}
				<DoctorDiscountPresetsList
					isGlobalWarranty100={isGlobalWarranty100}
					globalDiscountPercent={globalDiscountPercent}
					onSelectPreset={(percent, reason) => {
						onApplyGlobalDiscount(percent, reason);
						setIsOpen(false);
					}}
				/>
			</div>
		</div>
	);
};
