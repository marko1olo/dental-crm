import * as React from "react";
import { AlertCircle, CheckCircle2, Clock, Printer, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import "./patientBudgetSign.css";
import type { PatientBudgetSignViewProps } from "./budgetSign/budgetSignTypes";
import { formatIsoDateTime } from "./budgetSign/budgetSignTypes";
import { useBudgetSignState } from "./budgetSign/useBudgetSignState";
import { BudgetVerifySection } from "./budgetSign/BudgetVerifySection";
import { BudgetItemsTableCard } from "./budgetSign/BudgetItemsTableCard";

export * from "./budgetSign/budgetSignTypes";

export const PatientBudgetSignView: React.FC<PatientBudgetSignViewProps> = ({ token: propToken, apiBaseUrl = "", onSuccess, className = "" }) => {
	const s = useBudgetSignState(propToken, apiBaseUrl, onSuccess);

	if (s.isLoading) {
		return (
			<div className={`patient-budget-container ${className}`}>
				<div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
					<Clock size={32} style={{ margin: "0 auto 1rem", display: "block" }} /><p>Загрузка данных сметы...</p>
				</div>
			</div>
		);
	}
	if (s.fetchError || !s.budget) {
		return (
			<div className={`patient-budget-container ${className}`}>
				<div className="patient-budget-card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
					<AlertCircle size={40} style={{ margin: "0 auto 0.75rem", display: "block", color: "var(--bad-fg, var(--rust))" }} />
					<h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--ink)" }}>Ошибка доступа</h3>
					<p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>{s.fetchError || "Смета не найдена."}</p>
				</div>
			</div>
		);
	}

	const isAccepted = s.budget.status === "accepted";

	return (
		<div className={`patient-budget-container ${className}`}>
			<div className="patient-budget-header">
				<div>
					<div className="patient-budget-clinic-title">{s.budget.clinicName || "Стоматологическая клиника"}</div>
					{s.budget.doctorName && <div className="patient-budget-doctor-name">Врач: {s.budget.doctorName}</div>}
				</div>
				<div>
					{isAccepted ? (
						<span className="patient-budget-status-chip accepted"><CheckCircle2 size={12} />Согласовано</span>
					) : (
						<span className="patient-budget-status-chip pending"><Clock size={12} />Ожидает подписи</span>
					)}
				</div>
			</div>

			{s.budget.requiresVerification && !s.budget.isVerified && (
				<BudgetVerifySection budget={s.budget} verifyFactor={s.verifyFactor} setVerifyFactor={s.setVerifyFactor} isVerifying={s.isVerifying} verifyError={s.verifyError} onSubmit={s.handleVerifySubmit} />
			)}

			<BudgetItemsTableCard budget={s.budget} />

			{isAccepted ? (
				<div className="patient-budget-accepted-card">
					<CheckCircle2 size={40} style={{ margin: "0 auto", color: "var(--teal)" }} />
					<div className="patient-budget-accepted-title">Смета успешно согласована</div>
					<p className="patient-budget-accepted-desc">План лечения утверждён пациентом: <strong>{s.budget.signerName || s.budget.patientFirstName || "Пациент"}</strong></p>
					{s.budget.signedAt && <p className="patient-budget-accepted-date">Дата и время: {formatIsoDateTime(s.budget.signedAt)}</p>}
					{s.budget.documentHash && <div className="patient-budget-hash-box"><strong>SHA-256 целостности документа:</strong><br />{s.budget.documentHash}</div>}
					<button type="button" className="patient-budget-print-btn" onClick={() => window.print()}><Printer size={16} />Распечатать / Сохранить в PDF</button>
				</div>
			) : s.budget.isVerified ? (
				<div className="patient-budget-card" data-testid="patient-budget-sign-card">
					<div className="patient-budget-card-title"><ShieldCheck size={18} style={{ color: "var(--teal)" }} />Электронное согласование сметы онлайн</div>
					<p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>Распишитесь пальцем/стилусом или согласуйте в 1 клик с формированием электронной подписи:</p>
					<div className="patient-budget-signature-section">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
							<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>Подпись пациента:</span>
							<div style={{ display: "flex", gap: "6px" }}>
								{s.hasStrokes && <button type="button" onClick={s.clearCanvas} className="patient-budget-clear-btn" data-testid="patient-budget-clear-canvas-btn"><RotateCcw size={12} />Очистить</button>}
								<button type="button" onClick={s.handleOneClickPep} className="patient-budget-stamp-btn" data-testid="patient-budget-generate-pep-stamp-btn"><Sparkles size={12} />Штамп ПЭП (1 клик)</button>
							</div>
						</div>
						<div className="patient-budget-canvas-wrapper">
							<canvas ref={s.canvasRef} className="patient-budget-signature-canvas" data-testid="patient-budget-signature-canvas" onPointerDown={s.startDrawing} onPointerMove={s.draw} onPointerUp={s.stopDrawing} onPointerLeave={s.stopDrawing} />
							{!s.hasStrokes && <div className="patient-budget-canvas-placeholder">Распишитесь пальцем/стилусом в поле выше или нажмите «Согласовать в 1 клик»</div>}
						</div>
					</div>
					<input type="text" className="patient-budget-signer-input" placeholder="ФИО подписанта (пациента)" value={s.signerName} onChange={(e) => s.setSignerName(e.target.value)} data-testid="patient-budget-signer-input" />
					<label className="patient-budget-consent-label" data-testid="patient-budget-152fz-consent-label">
						<input type="checkbox" checked={s.legalConsent152Fz} onChange={(e) => s.setLegalConsent152Fz(e.target.checked)} data-testid="patient-budget-152fz-checkbox" style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--teal)" }} />
						<span>Я подтверждаю согласие на обработку персональных данных (152-ФЗ) и утверждение сметы (63-ФЗ ПЭП)</span>
					</label>
					<div className="patient-budget-legal-text">В соответствии с 152-ФЗ и 63-ФЗ простая электронная подпись (ПЭП) признаётся равнозначной собственноручной подписи.</div>
					{s.signError && <div className="patient-budget-error-msg" style={{ marginBottom: "0.75rem" }} data-testid="patient-budget-sign-error"><AlertCircle size={14} />{s.signError}</div>}
					<button type="button" className="patient-budget-submit-btn" onClick={s.handleSignSubmit} data-testid="patient-budget-agree-oneclick-btn">
						<ShieldCheck size={18} />{s.isSubmittingSign ? "Сохранение согласования..." : "Согласовать смету и план лечения"}
					</button>
				</div>
			) : null}
		</div>
	);
};

export default PatientBudgetSignView;
