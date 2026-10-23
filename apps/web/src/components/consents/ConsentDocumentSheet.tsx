import React, { useMemo } from "react";
import { generateQrCodeSvg } from "@dental/shared";
import type { ConsentSubstitutionContext, RenderedConsentTemplate } from "./consentTemplates.js";
import {
	cleanPrintableConsentText,
	sanitizeConsentContext,
} from "./consentSummaryHelper.js";
import { ConsentSheetHeader } from "./sheet/ConsentSheetHeader";
import { ConsentSectionsList } from "./sheet/ConsentSectionsList";
import { ConsentSignaturesBlock } from "./sheet/ConsentSignaturesBlock";

export interface ConsentDocumentSheetProps {
	rendered: RenderedConsentTemplate;
	effectiveContext: ConsentSubstitutionContext;
	effectiveWatermark: string;
	stampColor: string;
	isClosedOrSigned: boolean;
}

export const ConsentDocumentSheet: React.FC<ConsentDocumentSheetProps> = ({
	rendered,
	effectiveContext,
	effectiveWatermark,
	stampColor,
	isClosedOrSigned,
}) => {
	const cleanContext = useMemo(() => sanitizeConsentContext(effectiveContext), [effectiveContext]);
	const cleanTitle = useMemo(() => cleanPrintableConsentText(rendered.title), [rendered.title]);
	const cleanSubtitle = useMemo(() => cleanPrintableConsentText(rendered.subtitle), [rendered.subtitle]);

	const qrSvg = useMemo(() => {
		const ogrn = cleanContext.clinicOgrn || "1157746123456";
		const date = cleanContext.date || new Date().toLocaleDateString("ru-RU");
		const name = cleanContext.patientName || "Пациент";
		const payload = `https://egisz.rosminzdrav.ru/verify?doc=ids1051n&ogrn=${ogrn}&date=${date}&patient=${encodeURIComponent(name)}`;
		return generateQrCodeSvg(payload, {
			size: 48,
			margin: 0,
			foregroundColor: "#0f172a",
			backgroundColor: "#ffffff",
			title: `Верификация ЕГИСЗ: ${cleanTitle}`,
		});
	}, [cleanContext.clinicOgrn, cleanContext.date, cleanContext.patientName, cleanTitle]);

	return (
		<div
			className="consent-document-sheet"
			style={{
				position: "relative",
				wordWrap: "break-word",
				overflowWrap: "break-word",
				wordBreak: "break-word",
				overflow: "visible",
				boxSizing: "border-box",
			}}
		>
			<ConsentSheetHeader
				cleanTitle={cleanTitle}
				cleanSubtitle={cleanSubtitle}
				effectiveWatermark={effectiveWatermark}
				stampColor={stampColor}
				isClosedOrSigned={isClosedOrSigned}
			/>
			<ConsentSectionsList rendered={rendered} />
			<ConsentSignaturesBlock
				cleanContext={cleanContext}
				isClosedOrSigned={isClosedOrSigned}
				qrSvg={qrSvg}
			/>
		</div>
	);
};
