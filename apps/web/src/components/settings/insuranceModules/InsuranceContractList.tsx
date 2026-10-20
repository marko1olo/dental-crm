/**
 * apps/web/src/components/settings/insuranceModules/InsuranceContractList.tsx
 *
 * Grouped list / grid of active DMS insurance contracts.
 * Renders individual InsuranceContractCard elements with responsive grid layout.
 */

import type React from "react";
import { InsuranceContractCard } from "./InsuranceContractCard";
import type {
	GuaranteeLetterSummary,
	InsuranceContract,
} from "./insuranceContractsTypes";

interface InsuranceContractListProps {
	contracts: InsuranceContract[];
	guaranteeLetters: GuaranteeLetterSummary[];
	onEditContract: (contract: InsuranceContract) => void;
	onDeactivateContract: (contract: InsuranceContract) => void;
}

export const InsuranceContractList: React.FC<InsuranceContractListProps> = ({
	contracts,
	guaranteeLetters,
	onEditContract,
	onDeactivateContract,
}) => {
	if (contracts.length === 0) return null;

	return (
		<div
			className="grid grid-cols-1 xl:grid-cols-3 gap-3"
			data-testid="insurance-contract-list"
		>
			{contracts.map((contract) => (
				<InsuranceContractCard
					key={contract.id}
					contract={contract}
					guaranteeLetters={guaranteeLetters}
					onEdit={onEditContract}
					onDeactivate={onDeactivateContract}
				/>
			))}
		</div>
	);
};
