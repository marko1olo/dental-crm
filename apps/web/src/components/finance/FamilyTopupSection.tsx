import React from "react";
import { PlusCircle } from "lucide-react";
import { paymentMethodLabels } from "../../workspaceUiLabels";
import {
	FAMILY_TOPUP_METHODS,
	type FamilyTopupMethod,
} from "./familyWalletHelpers";

export interface FamilyTopupSectionProps {
	topupInput: string;
	setTopupInput: (val: string) => void;
	topupMethod: FamilyTopupMethod;
	setTopupMethod: (method: FamilyTopupMethod) => void;
	topupBlockReason: string | null;
	isToppingUp: boolean;
	onTopup: () => void | Promise<void>;
}

export const FamilyTopupSection: React.FC<FamilyTopupSectionProps> = ({
	topupInput,
	setTopupInput,
	topupMethod,
	setTopupMethod,
	topupBlockReason,
	isToppingUp,
	onTopup,
}) => {
	return (
		<>
			<div className="family-wallet-actions">
				<div className="family-wallet-input-group">
					<label
						htmlFor="family-topup-amount"
						className="family-wallet-input-label"
					>
						Пополнить счёт (₽)
					</label>
					<input
						id="family-topup-amount"
						type="text"
						inputMode="decimal"
						autoComplete="off"
						className="family-wallet-input"
						value={topupInput}
						onChange={(e) => setTopupInput(e.target.value)}
						placeholder="0"
						disabled={isToppingUp}
						aria-invalid={topupBlockReason ? true : undefined}
						aria-describedby={
							topupBlockReason ? "family-topup-hint" : undefined
						}
					/>
					<div
						role="toolbar"
						className="quick-chips-row"
						aria-label="Чем внесли аванс"
					>
						{FAMILY_TOPUP_METHODS.map((methodKey) => (
							<button
								key={methodKey}
								type="button"
								className={`quick-chip quick-chip--sm ${topupMethod === methodKey ? "active" : ""}`}
								aria-pressed={topupMethod === methodKey}
								onClick={() => setTopupMethod(methodKey)}
								disabled={isToppingUp}
							>
								{paymentMethodLabels[methodKey]}
							</button>
						))}
					</div>
				</div>
				<div className="family-wallet-btn-container">
					<button
						type="button"
						onClick={onTopup}
						disabled={isToppingUp}
						title={isToppingUp ? "Идет зачисление средств на семейный счет..." : undefined}
						className="family-wallet-btn"
					>
						{isToppingUp ? "Зачисление..." : "Пополнить"}{" "}
						<PlusCircle size={16} />
					</button>
				</div>
			</div>
			{topupBlockReason && (
				<p className="family-wallet-hint" id="family-topup-hint" role="status">
					{topupBlockReason}
				</p>
			)}
		</>
	);
};
