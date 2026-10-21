/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyDepositPresetTiles.tsx
 * Quick preset amount selection tiles for family deposit topup.
 * Mandate 8b: strictly <= 120 lines.
 */
import React from "react";
import { PRESET_AMOUNTS } from "./types";

export interface FamilyDepositPresetTilesProps {
	readonly onSelectAmount: (amount: string) => void;
}

export const FamilyDepositPresetTiles: React.FC<FamilyDepositPresetTilesProps> =
	React.memo(function FamilyDepositPresetTiles({ onSelectAmount }) {
		return (
			<div>
				<span className="text-xs font-semibold text-[var(--ink)] block mb-1.5">
					Быстрый выбор суммы:
				</span>
				<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
					{PRESET_AMOUNTS.map((amt) => (
						<button
							key={amt}
							type="button"
							onClick={() => onSelectAmount(String(amt))}
							className="min-h-[44px] sm:min-h-[36px] h-9 p-2 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal)] hover:text-white text-[var(--ink)] transition-colors cursor-pointer text-center shadow-2xs"
						>
							+{amt.toLocaleString("ru-RU")} ₽
						</button>
					))}
				</div>
			</div>
		);
	});
