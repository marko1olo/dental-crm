import { PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import React from "react";

export interface InventoryOperationsBundleGroupProps {
	readonly onClose: () => void;
	readonly onQuickWriteoffVisitBundle: (bundle: "therapy" | "surgery") => void;
	readonly onQuickWriteoffShiftBundle: (bundle: "therapy" | "orthopedics" | "surgery") => void;
}

export const InventoryOperationsBundleGroup: React.FC<InventoryOperationsBundleGroupProps> = ({
	onClose,
	onQuickWriteoffVisitBundle,
	onQuickWriteoffShiftBundle,
}) => {
	return (
		<>
			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="nurse-menu-quick-visit-therapy-btn"
				onClick={() => {
					onQuickWriteoffVisitBundle("therapy");
					onClose();
				}}
				role="menuitem"
				title="Списание набора визита «Терапия»"
			>
				<Sparkles size={15} className="text-[var(--primary)] shrink-0" />
				<span>Списать визит: Терапия</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="nurse-menu-quick-visit-surgery-btn"
				onClick={() => {
					onQuickWriteoffVisitBundle("surgery");
					onClose();
				}}
				role="menuitem"
				title="Списание набора визита «Хирургия»"
			>
				<Sparkles size={15} className="text-[var(--primary)] shrink-0" />
				<span>Списать визит: Хирургия</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="nurse-menu-quick-shift-therapy-btn"
				onClick={() => {
					onQuickWriteoffShiftBundle("therapy");
					onClose();
				}}
				role="menuitem"
				title="Списание расхода смены (Терапия)"
			>
				<Sparkles size={15} className="text-[var(--primary)] shrink-0" />
				<span>Списать смену: Терапия</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="nurse-menu-quick-shift-ortho-btn"
				onClick={() => {
					onQuickWriteoffShiftBundle("orthopedics");
					onClose();
				}}
				role="menuitem"
				title="Списание расхода смены (Ортопедия)"
			>
				<PackageCheck size={15} className="text-[var(--primary)] shrink-0" />
				<span>Списать смену: Ортопедия</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
				data-testid="nurse-menu-quick-shift-surgery-btn"
				onClick={() => {
					onQuickWriteoffShiftBundle("surgery");
					onClose();
				}}
				role="menuitem"
				title="Списание расхода смены (Хирургия)"
			>
				<ShieldCheck size={15} className="text-[var(--primary)] shrink-0" />
				<span>Списать смену: Хирургия</span>
			</button>
		</>
	);
};
