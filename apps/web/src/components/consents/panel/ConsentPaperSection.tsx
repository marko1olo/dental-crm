import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import React from "react";
import { ConsentPaperScanUpload } from "./ConsentPaperScanUpload";
import { ConsentPaperActions } from "./ConsentPaperActions";

export interface ConsentPaperSectionProps {
	paperOriginalConfirmed: boolean;
	setPaperOriginalConfirmed: (confirmed: boolean) => void;
	paperScanFile?: File | null | undefined;
	setPaperScanFile?: ((file: File | null) => void) | undefined;
	activeMode: "packages" | "single";
	packageDocsCount: number;
	isSubmitting: boolean;
	onConfirmSign: (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
	onPrint: () => void;
	onPrintBlank: () => void;
	onDownloadPdfA: () => void;
	setVerificationMethod: (method: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
}

export const ConsentPaperSection: React.FC<ConsentPaperSectionProps> = ({
	paperOriginalConfirmed,
	setPaperOriginalConfirmed,
	paperScanFile,
	setPaperScanFile,
	activeMode,
	packageDocsCount,
	isSubmitting,
	onConfirmSign,
	onPrint,
	onPrintBlank,
	onDownloadPdfA,
	setVerificationMethod,
}) => {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-2 flex-wrap pb-1">
				<div className="flex items-center gap-2">
					<ShieldCheck size={22} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="font-bold text-sm text-[var(--ink)]">
						Подписание на бумажном носителе
					</span>
				</div>
				<span className="consent-statutory-badge shrink-0">Оригинал в карте</span>
			</div>

			<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
				Пациент знакомится с текстом согласия и расписывается шариковой ручкой на бумажном бланке.
				Бумажный оригинал хранится в медицинской карте пациента.
			</p>

			<label className="consent-paper-checkbox-label">
				<input
					type="checkbox"
					checked={paperOriginalConfirmed}
					onChange={(e) => setPaperOriginalConfirmed(e.target.checked)}
					data-testid="checkbox-paper-original-stored"
					style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--teal, #0d9488)" }}
				/>
				<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
					<Check size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Бумажный оригинал в карте (подписан пациентом от руки)</span>
				</span>
			</label>

			<ConsentPaperScanUpload
				paperScanFile={paperScanFile}
				setPaperScanFile={setPaperScanFile}
			/>

			<div className="flex items-center text-xs px-1">
				{!paperOriginalConfirmed && !paperScanFile ? (
					<span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5" data-testid="status-paper-unsigned">
						<AlertTriangle size={14} className="shrink-0" />
						<span>Готово к подтверждению бумажного оригинала в карте пациента</span>
					</span>
				) : (
					<span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5" data-testid="status-paper-signed">
						<ShieldCheck size={14} />
						<span>
							{paperScanFile
								? `Скан прикреплен («${paperScanFile.name}») • Готово к архивации`
								: "Бумажный оригинал подписан и подшит в медицинскую карту пациента"}
						</span>
					</span>
				)}
			</div>

			<ConsentPaperActions
				activeMode={activeMode}
				packageDocsCount={packageDocsCount}
				isSubmitting={isSubmitting}
				onConfirmSign={onConfirmSign}
				onPrint={onPrint}
				onPrintBlank={onPrintBlank}
				onDownloadPdfA={onDownloadPdfA}
				setPaperOriginalConfirmed={setPaperOriginalConfirmed}
				setVerificationMethod={setVerificationMethod}
			/>
		</div>
	);
};
