import { Minus, Plus } from "lucide-react";
import React from "react";

export interface MobileInboundQuantitySectionProps {
	readonly drawerQuantity: number;
	readonly setDrawerQuantity: React.Dispatch<React.SetStateAction<number>>;
	readonly triggerHaptic: () => void;
}

export const MobileInboundQuantitySection: React.FC<MobileInboundQuantitySectionProps> = ({
	drawerQuantity,
	setDrawerQuantity,
	triggerHaptic,
}) => {
	return (
		<>
			{/* Large Quantity Stepper */}
			<div className="text-center">
				<span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
					Количество к поступлению
				</span>
				<div className="mobile-inventory-stepper-wrap">
					<button
						type="button"
						className="mobile-inventory-stepper-btn"
						onClick={() => {
							triggerHaptic();
							setDrawerQuantity((prev) => Math.max(1, prev - 1));
						}}
						aria-label="Уменьшить количество на 1"
						data-testid="drawer-stepper-minus"
					>
						<Minus size={20} aria-hidden="true" />
					</button>

					<span
						className="mobile-inventory-stepper-val"
						data-testid="drawer-stepper-value"
					>
						{drawerQuantity}
					</span>

					<button
						type="button"
						className="mobile-inventory-stepper-btn"
						onClick={() => {
							triggerHaptic();
							setDrawerQuantity((prev) => prev + 1);
						}}
						aria-label="Увеличить количество на 1"
						data-testid="drawer-stepper-plus"
					>
						<Plus size={20} aria-hidden="true" />
					</button>
				</div>
			</div>

			{/* Quick Increment Chips: +1, +5, +10, +50, +100 */}
			<div
				className="mobile-inventory-quick-chips-grid"
				data-testid="drawer-quick-chips"
			>
				{[1, 5, 10, 50, 100].map((inc) => (
					<button
						key={inc}
						type="button"
						className="mobile-inventory-quick-chip"
						onClick={() => {
							triggerHaptic();
							setDrawerQuantity((prev) => prev + inc);
						}}
						data-testid={`drawer-chip-plus-${inc}`}
					>
						+{inc}
					</button>
				))}
			</div>
		</>
	);
};

export default MobileInboundQuantitySection;
