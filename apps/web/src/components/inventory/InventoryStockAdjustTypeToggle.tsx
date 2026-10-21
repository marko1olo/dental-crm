import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import React from "react";

export interface InventoryStockAdjustTypeToggleProps {
	readonly adjustType: "in" | "out";
	readonly setAdjustType: (type: "in" | "out") => void;
}

export const InventoryStockAdjustTypeToggle: React.FC<InventoryStockAdjustTypeToggleProps> = ({
	adjustType,
	setAdjustType,
}) => {
	return (
		<div className="flex gap-2 mb-4">
			{(["in", "out"] as const).map((t) => (
				<button
					key={t}
					type="button"
					onClick={() => setAdjustType(t)}
					className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 border transition-all ${
						adjustType === t
							? t === "in"
								? "bg-[var(--teal-soft)] border-teal-500 text-teal-700 dark:text-teal-300 font-bold"
								: "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-bold"
							: "bg-transparent border-[var(--line)] text-[var(--muted)]"
					}`}
				>
					{t === "in" ? (
						<>
							<ArrowDownToLine size={13} /> <span>Приход</span>
						</>
					) : (
						<>
							<ArrowUpFromLine size={13} /> <span>Списание</span>
						</>
					)}
				</button>
			))}
		</div>
	);
};

export default InventoryStockAdjustTypeToggle;
