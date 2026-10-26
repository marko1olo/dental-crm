import React from "react";
import { AlertCircle, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

export interface BudgetSignaturePadCardProps {
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly hasStrokes: boolean;
	readonly onStartDrawing: (e: React.PointerEvent<HTMLCanvasElement>) => void;
	readonly onDraw: (e: React.PointerEvent<HTMLCanvasElement>) => void;
	readonly onStopDrawing: () => void;
	readonly onClearCanvas: () => void;
	readonly onOneClickPep: () => void;
	readonly signerName: string;
	readonly setSignerName: (val: string) => void;
	readonly legalConsent152Fz: boolean;
	readonly setLegalConsent152Fz: (val: boolean) => void;
	readonly isSubmittingSign: boolean;
	readonly signError: string | null;
	readonly onSubmitSign: () => void;
}

export const BudgetSignaturePadCard: React.FC<BudgetSignaturePadCardProps> = ({
	canvasRef, hasStrokes, onStartDrawing, onDraw, onStopDrawing, onClearCanvas,
	onOneClickPep, signerName, setSignerName, legalConsent152Fz, setLegalConsent152Fz,
	isSubmittingSign, signError, onSubmitSign,
}) => {
	return (
		<div className="patient-budget-card" data-testid="patient-budget-sign-card">
			<div className="patient-budget-card-title">
				<ShieldCheck size={18} style={{ color: "var(--teal)" }} />
				Электронное согласование сметы онлайн
			</div>
			<p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>
				Распишитесь пальцем/стилусом или согласуйте в 1 клик с формированием электронной подписи:
			</p>
			<div className="patient-budget-signature-section">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
					<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>Подпись пациента:</span>
					<div style={{ display: "flex", gap: "6px" }}>
						{hasStrokes && (
							<button type="button" onClick={onClearCanvas} className="patient-budget-clear-btn" data-testid="patient-budget-clear-canvas-btn">
								<RotateCcw size={12} />
								Очистить
							</button>
						)}
						<button type="button" onClick={onOneClickPep} className="patient-budget-stamp-btn" data-testid="patient-budget-generate-pep-stamp-btn">
							<Sparkles size={12} />
							Штамп ПЭП (1 клик)
						</button>
					</div>
				</div>
				<div className="patient-budget-canvas-wrapper">
					<canvas
						ref={canvasRef}
						className="patient-budget-canvas"
						data-testid="patient-budget-signature-canvas"
						onPointerDown={onStartDrawing}
						onPointerMove={onDraw}
						onPointerUp={onStopDrawing}
						onPointerLeave={onStopDrawing}
					/>
					{!hasStrokes && (
						<div className="patient-budget-canvas-placeholder">
							Распишитесь пальцем/стилусом в поле выше или нажмите «Согласовать в 1 клик»
						</div>
					)}
				</div>
			</div>
			<input
				type="text"
				className="patient-budget-signer-input"
				placeholder="ФИО подписанта (пациента)"
				value={signerName}
				onChange={(e) => setSignerName(e.target.value)}
				data-testid="patient-budget-signer-input"
			/>
			<label className="patient-budget-consent-label" data-testid="patient-budget-152fz-consent-label">
				<input
					type="checkbox"
					checked={legalConsent152Fz}
					onChange={(e) => setLegalConsent152Fz(e.target.checked)}
					data-testid="patient-budget-152fz-checkbox"
					style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--teal)" }}
				/>
				<span>Я подтверждаю согласие на обработку данных (152-ФЗ) и утверждение сметы (ПЭП 63-ФЗ)</span>
			</label>
			{signError && (
				<div className="patient-budget-error-msg" style={{ marginBottom: "0.75rem" }} data-testid="patient-budget-sign-error">
					<AlertCircle size={14} />
					{signError}
				</div>
			)}
			<button
				type="button"
				className="patient-budget-submit-btn"
				onClick={onSubmitSign}
				data-testid="patient-budget-agree-oneclick-btn"
			>
				<ShieldCheck size={18} />
				{isSubmittingSign ? "Сохранение согласования..." : "Согласовать смету и план лечения"}
			</button>
		</div>
	);
};
