import type React from "react";
import type { FiscalReceiptFooterProps } from "./FiscalReceiptFooter.js";
import { FiscalFooterOneCTab } from "./FiscalFooterOneCTab.js";
import { FiscalFooterPrintDocs } from "./FiscalFooterPrintDocs.js";

/**
 * 1C and printed documents (Act, Tax Certificate) actions footer facade.
 * Mandate 8b: <= 120 lines facade.
 */
export const FiscalFooterOneCAndDocs: React.FC<
	FiscalReceiptFooterProps & { notify: (msg: string, type: "success" | "error" | "info", dur?: number) => void }
> = (props) => {
	if (props.activeTab === "oneC") {
		return <FiscalFooterOneCTab {...props} />;
	}
	return <FiscalFooterPrintDocs {...props} />;
};