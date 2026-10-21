import type React from "react";
import type { A4DocumentInformedConsentData } from "@dental/shared";
import { ConsentSheetPage1 } from "./ConsentSheetPage1";
import { ConsentSheetPage2 } from "./ConsentSheetPage2";

export interface ConsentSheetProps {
	zoomClass: string;
	effectiveConsentData: A4DocumentInformedConsentData | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicRequisites
	cl: any;
}

export const ConsentSheet: React.FC<ConsentSheetProps> = ({
	effectiveConsentData,
	cl,
}) => {
	return (
		<div className="pro-a4-sheet-stack" data-testid="a4-consent-1051n-content">
			<ConsentSheetPage1 effectiveConsentData={effectiveConsentData} cl={cl} />
			<ConsentSheetPage2 effectiveConsentData={effectiveConsentData} cl={cl} />
		</div>
	);
};
