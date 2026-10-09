import React, { memo } from "react";
import { CreditCard, QrCode, ShieldCheck, Zap } from "lucide-react";
import { CabinetFinanceTab, type CabinetFinanceTabProps } from "./CabinetFinanceTab";

export interface CabinetBillingTabProps extends CabinetFinanceTabProps {
	readonly onPaySbp?: (amountRub: number) => void;
	readonly onTriggerHaptic?: (style?: "light" | "medium" | "heavy") => void;
}

export const CabinetBillingTab: React.FC<CabinetBillingTabProps> = memo((props) => {
	return <CabinetFinanceTab {...props} />;
});

CabinetBillingTab.displayName = "CabinetBillingTab";
