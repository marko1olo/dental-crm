import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import React from "react";
import { LOYALTY_CONFIG, type LoyaltyTier } from "./loyaltyConfig";

export interface LoyaltyTierDropdownProps {
	readonly currentTier: LoyaltyTier;
	readonly onSelectTier: (tier: LoyaltyTier) => void;
	readonly onClose: () => void;
}

export const LoyaltyTierDropdown: React.FC<LoyaltyTierDropdownProps> = React.memo(({
	currentTier,
	onSelectTier,
	onClose,
}) => {
	return (
		<>
			<button
				type="button"
				className="fixed inset-0 z-50 bg-transparent border-0 p-0 cursor-default"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") onClose();
				}}
			/>
			<motion.div
				initial={{ opacity: 0, y: 5, scale: 0.95 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: 5, scale: 0.95 }}
				transition={{ duration: 0.15 }}
				className="absolute top-full left-0 mt-1 bg-[var(--paper)] border border-[var(--line)] rounded-lg shadow-xl p-1 z-50 min-w-[160px] flex flex-col gap-0.5"
			>
				{(Object.entries(LOYALTY_CONFIG) as [LoyaltyTier, (typeof LOYALTY_CONFIG)[LoyaltyTier]][]).map(
					([tierKey, config]) => (
						<button
							key={tierKey}
							type="button"
							onClick={() => onSelectTier(tierKey)}
							className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs border-0 cursor-pointer text-left transition-colors min-h-[44px] sm:min-h-[32px] ${
								currentTier === tierKey
									? "bg-[var(--paper-soft)] font-semibold text-[var(--ink)]"
									: "bg-transparent hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] font-medium"
							}`}
						>
							<Crown size={14} color={config.color} />
							<span className="flex-1">{config.label}</span>
							{config.discountPct > 0 && (
								<span style={{ color: config.color }} className="text-xs font-bold">
									-{config.discountPct}%
								</span>
							)}
						</button>
					),
				)}
				<p className="m-0 mt-1 px-3 py-2 text-xs leading-relaxed text-[var(--muted)] border-t border-[var(--line)]">
					Это пометка для сотрудников. Скидка сама в счёт не подставляется — назначьте её вручную при оплате.
				</p>
			</motion.div>
		</>
	);
});

LoyaltyTierDropdown.displayName = "LoyaltyTierDropdown";
