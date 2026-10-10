import React from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { ConsentDocumentSheet } from "../ConsentDocumentSheet.js";
import type { ConsentSubstitutionContext } from "./types.js";

export interface ConsentDocumentPreviewProps {
	isMobile: boolean;
	isDocumentTextExpanded: boolean;
	setIsDocumentTextExpanded: React.Dispatch<React.SetStateAction<boolean>>;
	rendered: {
		title: string;
		fullTextContent: string;
		sections?: any[];
		[key: string]: any;
	};
	effectiveContext: ConsentSubstitutionContext;
	effectiveWatermark: string;
	stampColor: string;
	isClosedOrSigned: boolean;
}

export const ConsentDocumentPreview: React.FC<ConsentDocumentPreviewProps> = ({
	isMobile,
	isDocumentTextExpanded,
	setIsDocumentTextExpanded,
	rendered,
	effectiveContext,
	effectiveWatermark,
	stampColor,
	isClosedOrSigned,
}) => {
	if (isMobile) {
		return (
			<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
				<button
					type="button"
					onClick={() => setIsDocumentTextExpanded((v) => !v)}
					className="w-full flex items-center justify-between p-3.5 text-xs sm:text-sm font-semibold text-[var(--ink)] bg-[var(--paper-soft)] cursor-pointer hover:bg-[var(--paper)] transition-colors"
				>
					<span className="flex items-center gap-2">
						<FileText size={16} className="text-[var(--teal,#0d9488)]" />
						<span>Юридический текст согласия (Приказ 1051н)</span>
					</span>
					<span className="text-xs text-[var(--muted)] flex items-center gap-1">
						{isDocumentTextExpanded ? (
							<>
								<span>Свернуть</span>
								<ChevronUp size={14} />
							</>
						) : (
							<>
								<span>Читать полный текст</span>
								<ChevronDown size={14} />
							</>
						)}
					</span>
				</button>
				{isDocumentTextExpanded && (
					<div className="p-3 border-t border-[var(--line)]">
						<ConsentDocumentSheet
							rendered={rendered}
							effectiveContext={effectiveContext}
							effectiveWatermark={effectiveWatermark}
							stampColor={stampColor}
							isClosedOrSigned={isClosedOrSigned}
						/>
					</div>
				)}
			</div>
		);
	}

	return (
		<ConsentDocumentSheet
			rendered={rendered}
			effectiveContext={effectiveContext}
			effectiveWatermark={effectiveWatermark}
			stampColor={stampColor}
			isClosedOrSigned={isClosedOrSigned}
		/>
	);
};
