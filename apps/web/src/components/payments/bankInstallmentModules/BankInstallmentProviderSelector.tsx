import type React from "react";
import {
	BANK_INSTALLMENT_PROVIDERS,
	type BankInstallmentProviderConfig,
	type BankInstallmentProviderId,
} from "../bankInstallmentEngine";

export interface BankInstallmentProviderSelectorProps {
	readonly selectedProvider: BankInstallmentProviderId;
	readonly onProviderChange: (id: BankInstallmentProviderId) => void;
	readonly activeProviderConfig: BankInstallmentProviderConfig;
	readonly selectedTerm: number;
	readonly onSelectTerm: (term: number) => void;
}

export const BankInstallmentProviderSelector: React.FC<
	BankInstallmentProviderSelectorProps
> = ({
	selectedProvider,
	onProviderChange,
	activeProviderConfig,
	selectedTerm,
	onSelectTerm,
}) => {
	return (
		<div className="space-y-4">
			{/* Banking Partner Selector Tabs */}
			<div className="space-y-2">
				<span className="font-bold text-[var(--ink,#0f172a)] block">
					Выберите банк-партнер:
				</span>
				<div className="flex flex-wrap items-center gap-2">
					{(
						Object.keys(
							BANK_INSTALLMENT_PROVIDERS,
						) as BankInstallmentProviderId[]
					).map((pId) => {
						const p = BANK_INSTALLMENT_PROVIDERS[pId];
						const isActive = selectedProvider === pId;
						return (
							<button
								key={pId}
								type="button"
								onClick={() => onProviderChange(pId)}
								className={`bank-provider-tab ${isActive ? "active" : ""}`}
								data-testid={`provider-tab-${pId}`}
							>
								<div
									className="w-2.5 h-2.5 rounded-full"
									style={{ backgroundColor: p.logoColor }}
								/>
								<span>{p.name}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Term Selector */}
			{activeProviderConfig.availableTermsMonths.length > 1 && (
				<div className="space-y-2">
					<span className="font-bold text-[var(--ink,#0f172a)] block">
						Срок рассрочки:
					</span>
					<div className="flex flex-wrap items-center gap-2">
						{activeProviderConfig.availableTermsMonths.map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => onSelectTerm(m)}
								className={`bank-term-chip ${selectedTerm === m ? "active" : ""}`}
								data-testid={`term-chip-${m}`}
							>
								{m} {m === 3 ? "месяца" : "месяцев"}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
