import React from "react";
import type { A4DocumentContractData } from "@dental/shared";
import { ContractSheetPage1 } from "./ContractSheetPage1";
import { ContractSheetPage2 } from "./ContractSheetPage2";
import { ContractSheetPage3 } from "./ContractSheetPage3";

export interface ContractSheetProps {
	zoomClass: string;
	contractData: A4DocumentContractData;
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
}

export const ContractSheet: React.FC<ContractSheetProps> = ({
	contractData,
	cl,
}) => {
	return (
		<div className="pro-a4-sheet-stack" data-testid="a4-contract-content">
			<ContractSheetPage1 contractData={contractData} cl={cl} />
			<ContractSheetPage2 contractData={contractData} cl={cl} />
			<ContractSheetPage3 contractData={contractData} cl={cl} />
		</div>
	);
};
