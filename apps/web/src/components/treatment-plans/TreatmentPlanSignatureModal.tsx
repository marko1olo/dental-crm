/**
 * TreatmentPlanSignatureModal.tsx — модальное окно электронного подписания плана лечения пациентом.
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	CheckCircle2,
	FileCheck,
	Lock,
	Printer,
	ShieldCheck,
	User,
	X,
} from "lucide-react";
import type {
	DigitalSignatureAgreementData,
	TreatmentPlanTier,
} from "./types";

interface TreatmentPlanSignatureModalProps {
	readonly isOpen: boolean;
	readonly tier: TreatmentPlanTier;
	readonly patientName: string;
	readonly patientId: string;
	readonly doctorFullName?: string;
	readonly clinicName?: string;
	readonly onClose: () => void;
	readonly onSignedSuccess: (agreement: DigitalSignatureAgreementData) => void;
}

const PAPER_SIGNATURE_DATA_URL =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='50'><text x='10' y='30' font-family='sans-serif' font-size='12' fill='%230f172a'>Подписано на бумаге</text></svg>";

export const TreatmentPlanSignatureModal: React.FC<TreatmentPlanSignatureModalProps> = ({
	isOpen,
	tier,
	patientName,
	patientId,
	doctorFullName = "Лечащий врач стоматолог",
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	onClose,
	onSignedSuccess,
}) => {
	const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
	const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorText, setErrorText] = useState<string | null>(null);

	if (!isOpen) return null;

	const handleConfirmAgreement = (forcedSignature?: string) => {
		if (!termsAccepted) {
			setErrorText("Необходимо подтвердить согласие с условиями плана лечения.");
			return;
		}

		setIsSubmitting(true);
		const effectiveSignature =
			forcedSignature || signatureBase64 || PAPER_SIGNATURE_DATA_URL;

		const agreement: DigitalSignatureAgreementData = {
			patientId,
			patientName,
			planTierId: tier.tierId,
			planTitle: tier.title,
			totalAmountRub: tier.totalRub,
			signatureBase64: effectiveSignature,
			agreedAtIso: new Date().toISOString(),
			doctorFullName,
			clinicName,
			termsAccepted,
		};

		onSignedSuccess(agreement);
		setIsSubmitting(false);
	};

	const handlePaperConfirm = () => {
		setSignatureBase64(PAPER_SIGNATURE_DATA_URL);
		setErrorText(null);
		handleConfirmAgreement(PAPER_SIGNATURE_DATA_URL);
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
			data-testid="treatment-plan-signature-modal"
		>
			<div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--border,#cbd5e1)] shadow-2xl overflow-hidden">
				{/* Modal Header */}
				<div className="flex items-center justify-between p-5 border-b border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
							<FileCheck size={22} />
						</div>
						<div>
							<h3 className="text-base font-extrabold text-[var(--ink,#0f172a)]">
								Электронное подписание плана лечения
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)]">
								Информированное добровольное согласие на медицинские вмешательства
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong)] transition-colors cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					{/* Summary Plan Banner */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]">
						<div className="space-y-0.5">
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-[var(--teal-dark,var(--teal))]">
									Выбранный вариант:
								</span>
								<span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20">
									{tier.title}
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] flex items-center gap-1.5 pt-1">
								<User size={13} /> Пациент: <strong>{patientName}</strong>
							</p>
						</div>

						<div className="text-right">
							<span className="text-xs text-[var(--muted,#64748b)]">Сумма к оплате:</span>
							<div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
								{tier.totalRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
					</div>

					{/* Legal Clause / Consent Statement */}
					<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs text-[var(--muted,#64748b)] space-y-2 leading-relaxed max-h-36 overflow-y-auto">
						<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
							<ShieldCheck size={14} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Условия утверждения плана (ст. 20 ФЗ № 323-ФЗ):</span>
						</div>
						<p>
							1. Я подтверждаю, что ознакомлен(а) с диагнозом, перечнем этапов лечения,
							используемыми материалами, ожидаемыми сроками и общей стоимостью.
						</p>
						<p>
							2. Мне разъяснены альтернативные методы лечения, возможные риски и
							гарантийные обязательства клиники «{clinicName}».
						</p>
						<p>
							3. Я даю свое информированное добровольное согласие на проведение
							запланированных медицинских вмешательств лечащим врачом ({doctorFullName}).
						</p>
					</div>

					{/* Paper-First Clinical Confirmation Banner (Mandates 8e, 8k, 8n) */}
					<div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div className="space-y-1">
								<div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--ink,#0f172a)]">
									<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span>Бумажное подписание сметы и плана (Автономия врача)</span>
								</div>
								<p className="text-xs text-[var(--muted,#64748b)] leading-relaxed">
									Распечатайте план на А4 для физической подписи пациентом или подтвердите утверждение на бумаге в 1 клик.
								</p>
							</div>

							<button
								type="button"
								onClick={() => window.print()}
								className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong)] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
								data-testid="print-treatment-plan-btn"
							>
								<Printer size={14} />
								<span>Печать плана (А4)</span>
							</button>
						</div>

						{signatureBase64 && (
							<div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
								<CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>План подтвержден на бумаге (штамп фиксации сформирован)</span>
							</div>
						)}
					</div>

					{/* Checkbox Consent */}
					<label className="flex items-start gap-2.5 pt-1 text-xs text-[var(--ink,#0f172a)] cursor-pointer select-none">
						<input
							type="checkbox"
							checked={termsAccepted}
							onChange={(e) => setTermsAccepted(e.target.checked)}
							className="mt-0.5 w-4 h-4 rounded text-[var(--teal,var(--brand-primary))] border-[var(--border,#cbd5e1)] focus:ring-[var(--teal)] cursor-pointer"
						/>
						<span>
							Подтверждаю правильность выбранного плана и даю согласие на начало лечения.
						</span>
					</label>

					{/* Error Text */}
					{errorText && (
						<div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium">
							<AlertCircle size={14} className="shrink-0" />
							<span>{errorText}</span>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 p-4 border-t border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
					<button
						type="button"
						onClick={onClose}
						className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] transition-colors cursor-pointer"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handlePaperConfirm}
						disabled={isSubmitting}
						className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
						data-testid="paper-signature-confirm-btn"
					>
						<ShieldCheck size={14} className="text-emerald-600" />
						<span>Утвердить и подписать на бумаге (1 клик)</span>
					</button>

					<button
						type="button"
						onClick={() => handleConfirmAgreement()}
						disabled={isSubmitting}
						className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
						data-testid="confirm-sign-plan-btn"
					>
						<Lock size={14} />
						<span>{isSubmitting ? "Сохранение..." : "Утвердить и подписать"}</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
