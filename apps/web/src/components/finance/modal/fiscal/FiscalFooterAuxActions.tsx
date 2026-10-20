import type React from "react";
import type { FiscalReceiptFooterProps } from "./FiscalReceiptFooter.js";
import { FiscalFooterOneCAndDocs } from "./FiscalFooterOneCAndDocs.js";
import { FiscalFooterRefundCorrection } from "./FiscalFooterRefundCorrection.js";

/**
 * Auxiliary tabs actions footer (1C, Act, Certificate, Refund, Correction, Preview).
 * Mandate 8b: <= 120 lines facade.
 */
export const FiscalFooterAuxActions: React.FC<
	FiscalReceiptFooterProps & {
		notify: (
			msg: string,
			type: "success" | "error" | "info",
			dur?: number,
		) => void;
	}
> = (props) => {
	const { activeTab } = props;

	if (
		activeTab === "oneC" ||
		activeTab === "act" ||
		activeTab === "certificate"
	) {
		return <FiscalFooterOneCAndDocs {...props} />;
	}

	return <FiscalFooterRefundCorrection {...props} />;
};
