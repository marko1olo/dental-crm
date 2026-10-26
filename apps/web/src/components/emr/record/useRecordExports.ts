import { useCallback } from "react";
import type { MedicalCardForm043uData } from "../emr043Types";
import {
	generatePrintableHtml043,
	generate043XmlCda,
	generate043JsonExport,
	generate043PlainText,
} from "../emr043Math";

interface UseRecordExportsParams {
	formData: MedicalCardForm043uData;
	effectiveIsDraft: boolean;
	setCopiedToast: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useRecordExports({ formData, effectiveIsDraft, setCopiedToast }: UseRecordExportsParams) {
	const handlePrint = useCallback(() => {
		const html = generatePrintableHtml043(formData, {
			scaleRatio: 1.0,
			isLocked: !effectiveIsDraft,
			isDraft: effectiveIsDraft,
			status: effectiveIsDraft ? "draft" : "signed",
		});
		const printFrame = document.createElement("iframe");
		printFrame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
		document.body.appendChild(printFrame);
		const doc = printFrame.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			printFrame.contentWindow?.focus();
			setTimeout(() => {
				printFrame.contentWindow?.print();
				setTimeout(() => document.body.removeChild(printFrame), 1500);
			}, 400);
		}
	}, [formData, effectiveIsDraft]);

	const handleExportXml = useCallback(() => {
		const blob = new Blob([generate043XmlCda(formData)], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `MedicalRecord_${formData.passport.medicalCardNumber}_EGISZ.xml`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, [formData]);

	const handleExportJson = useCallback(() => {
		const blob = new Blob([generate043JsonExport(formData)], { type: "application/json;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `MedicalRecord_${formData.passport.medicalCardNumber}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, [formData]);

	const handleCopyText = useCallback(() => {
		navigator.clipboard.writeText(generate043PlainText(formData)).then(() => {
			setCopiedToast(true);
			setTimeout(() => setCopiedToast(false), 2500);
		}).catch(() => {});
	}, [formData, setCopiedToast]);

	return { handlePrint, handleExportXml, handleExportJson, handleCopyText };
}
