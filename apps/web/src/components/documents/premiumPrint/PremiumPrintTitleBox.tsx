import React from "react";
import { CheckCircle2, FileText } from "lucide-react";

export interface PremiumPrintTitleBoxProps {
	documentTitle: string;
	documentSubtitle: string;
	isLocked: boolean;
	revisionCount: number;
}

export const PremiumPrintTitleBox: React.FC<PremiumPrintTitleBoxProps> = ({
	documentTitle,
	documentSubtitle,
	isLocked,
	revisionCount,
}) => {
	const watermarkStyle: React.CSSProperties = {
		position: "absolute",
		top: "50%",
		left: "50%",
		transform: "translate(-50%, -50%) rotate(-32deg)",
		fontWeight: 900,
		textTransform: "uppercase",
		letterSpacing: "0.12em",
		pointerEvents: "none",
		zIndex: 0,
		whiteSpace: "nowrap",
		userSelect: "none",
	};

	return (
		<>
			<div className="doc-official-title-box">
				<h1>{documentTitle}</h1>
				<div className="doc-form-sub">{documentSubtitle}</div>
				<div className="mt-1 flex justify-center">
					{isLocked ? (
						<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-emerald-600/40 bg-emerald-500/10 text-emerald-800 text-[10px] font-bold tracking-wider uppercase">
							<CheckCircle2 className="w-3 h-3 text-emerald-600" />
							{revisionCount > 0 ? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount + 1})` : "ПОДПИСАНО ВРАЧОМ"}
						</span>
					) : (
						<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-amber-600/40 bg-amber-500/10 text-amber-800 text-[10px] font-bold tracking-wider uppercase">
							<FileText className="w-3 h-3 text-amber-600" />
							ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП
						</span>
					)}
				</div>
			</div>

			{!isLocked ? (
				<div
					className="doc-watermark-draft"
					aria-hidden="true"
					style={{ ...watermarkStyle, fontSize: "36pt", color: "rgba(15, 23, 42, 0.045)" }}
				>
					ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП
				</div>
			) : (
				<div
					className="doc-watermark-signed"
					aria-hidden="true"
					style={{ ...watermarkStyle, fontSize: revisionCount > 0 ? "42pt" : "50pt", color: "rgba(16, 185, 129, 0.045)" }}
				>
					{revisionCount > 0 ? "ИСПРАВЛЕННОМУ ВЕРИТЬ" : "ПОДПИСАНО ВРАЧОМ"}
				</div>
			)}
		</>
	);
};
