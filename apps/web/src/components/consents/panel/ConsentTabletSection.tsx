import { AlertTriangle, PenTool, ShieldCheck } from "lucide-react";
import React from "react";
import type { SignaturePoint, SignatureStroke } from "../signaturePadMath.js";
import { ConsentTabletActions } from "./ConsentTabletActions";
import { ConsentTouchSignatureBox } from "./ConsentTouchSignatureBox";

export interface ConsentTabletSectionProps {
	isMobile: boolean;
	strokeColor: string;
	strokes: SignatureStroke[];
	setStrokes: React.Dispatch<React.SetStateAction<SignatureStroke[]>>;
	currentPoints: SignaturePoint[];
	setCurrentPoints: React.Dispatch<React.SetStateAction<SignaturePoint[]>>;
	isDrawing: boolean;
	setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
	activeMode: "packages" | "single";
	packageDocsCount: number;
	isSubmitting: boolean;
	onConfirmSign: (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
	onDownloadPdfA: () => void;
	setVerificationMethod: (method: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
}

export const ConsentTabletSection: React.FC<ConsentTabletSectionProps> = ({
	isMobile,
	strokeColor,
	strokes,
	setStrokes,
	currentPoints,
	setCurrentPoints,
	isDrawing,
	setIsDrawing,
	activeMode,
	packageDocsCount,
	isSubmitting,
	onConfirmSign,
	onDownloadPdfA,
	setVerificationMethod,
}) => {
	const totalPoints = strokes.reduce((acc, s) => acc + s.points.length, 0);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<PenTool size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="font-bold text-xs sm:text-sm text-[var(--ink)]">
						{isMobile ? "Роспись пальцем на экране" : "Электронная подпись (сенсорный ввод / стилус)"}
					</span>
				</div>
				<span className="consent-statutory-badge shrink-0">Вектор SVG • SHA-256</span>
			</div>

			<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.4 }}>
				Пациент ставит росчерк пальцем прямо в кресле. Подпись защищена криптографическим отпечатком и фиксируется в медицинской карте.
			</p>

			<ConsentTouchSignatureBox
				strokeColor={strokeColor}
				strokes={strokes}
				setStrokes={setStrokes}
				currentPoints={currentPoints}
				setCurrentPoints={setCurrentPoints}
				isDrawing={isDrawing}
				setIsDrawing={setIsDrawing}
			/>

			<div className="flex items-center justify-between text-xs px-1">
				{strokes.length === 0 && currentPoints.length === 0 ? (
					<span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5" data-testid="status-tablet-unsigned">
						<AlertTriangle size={14} className="shrink-0" />
						<span>Не подписан • Ожидает росписи пациента пальцем или стилусом</span>
					</span>
				) : (
					<span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5" data-testid="status-tablet-signed">
						<ShieldCheck size={14} />
						<span>Векторный росчерк готов к заверению ({totalPoints} точек)</span>
					</span>
				)}
			</div>

			<ConsentTabletActions
				isMobile={isMobile}
				strokes={strokes}
				currentPoints={currentPoints}
				packageDocsCount={packageDocsCount}
				activeMode={activeMode}
				isSubmitting={isSubmitting}
				onConfirmSign={onConfirmSign}
				onDownloadPdfA={onDownloadPdfA}
				setVerificationMethod={setVerificationMethod}
			/>
		</div>
	);
};
