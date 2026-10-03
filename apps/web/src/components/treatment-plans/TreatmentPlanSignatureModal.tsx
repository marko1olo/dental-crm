/**
 * TreatmentPlanSignatureModal.tsx — модальное окно электронного подписания плана лечения пациентом.
 */

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	AlertTriangle,
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
import { detectMutuallyExclusiveToothProcedures } from "./validation/starProtocolValidationEngine";

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

export const PAPER_SIGNATURE_DATA_URL =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 54' width='220' height='54'><rect x='1' y='1' width='218' height='52' rx='6' fill='%23f0fdf4' stroke='%2316a34a' stroke-width='1.5' stroke-dasharray='4 2'/><path d='M16 27l5 5 10-10' fill='none' stroke='%2316a34a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><text x='38' y='24' font-family='sans-serif' font-size='11' font-weight='bold' fill='%2315803d'>Подписано на бумаге</text><text x='38' y='40' font-family='sans-serif' font-size='9' fill='%23166534'>Оригинал подписан пациентом очно</text></svg>";

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

	const allItems = useMemo(() => {
		return tier?.stages ? tier.stages.flatMap((s) => s.items) : [];
	}, [tier]);

	const conflicts = useMemo(() => {
		return detectMutuallyExclusiveToothProcedures(allItems);
	}, [allItems]);

	if (!isOpen) return null;

	const handleConfirmAgreement = (forcedSignature?: string) => {
		if (isSubmitting) return;

		// Doctor & Patient Autonomy (Mandates 8e, 8y, 8z): Zero arbitrary locks.
		// Even if clinical conflicts exist, doctor has sovereign autonomy to confirm under clinical responsibility.
		if (!termsAccepted) {
			setTermsAccepted(true);
		}
		setErrorText(null);
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
			termsAccepted: true,
		};

		onSignedSuccess(agreement);
		setIsSubmitting(false);
	};

	const handlePaperConfirm = () => {
		if (isSubmitting) return;
		setTermsAccepted(true);
		setSignatureBase64(PAPER_SIGNATURE_DATA_URL);
		setErrorText(null);
		handleConfirmAgreement(PAPER_SIGNATURE_DATA_URL);
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
			data-testid="treatment-plan-signature-modal"
		>
			<div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-[var(--paper-strong,var(--paper))] text-[var(--ink)] rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden">
				{/* Modal Header */}
				<div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
							<FileCheck size={22} />
						</div>
						<div>
							<h3 className="text-base font-extrabold text-[var(--ink)]">
								Электронное подписание плана лечения
							</h3>
							<p className="text-xs text-[var(--muted)]">
								Информированное добровольное согласие на медицинские вмешательства
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					{/* Summary Plan Banner */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border)]">
						<div className="space-y-0.5">
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-[var(--teal-dark,var(--teal))]">
									Выбранный вариант:
								</span>
								<span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20">
									{tier.title}
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] flex items-center gap-1.5 pt-1">
								<User size={13} /> Пациент: <strong>{patientName}</strong>
							</p>
						</div>

						<div className="text-right">
							<span className="text-xs text-[var(--muted)]">Сумма к оплате:</span>
							<div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
								{tier.totalRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
					</div>

					{/* Legal Clause / Consent Statement */}
					<div className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border)] text-xs text-[var(--muted)] space-y-2 leading-relaxed max-h-36 overflow-y-auto">
						<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
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
								<div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--ink)]">
									<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span>Бумажное подписание сметы и плана (Автономия врача)</span>
								</div>
								<p className="text-xs text-[var(--muted)] leading-relaxed">
									Распечатайте план на А4 для физической подписи пациентом или подтвердите утверждение на бумаге в 1 клик.
								</p>
							</div>

							<button
								type="button"
								onClick={() => window.print()}
								className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 border border-[var(--border)] hover:bg-[var(--paper-strong)] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
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

					{/* Clinical Conflict Alert (Mutually Exclusive Procedures on same FDI tooth) */}
					{conflicts.length > 0 && (
						<div
							className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3"
							data-testid="clinical-conflict-alert"
						>
							<AlertTriangle size={20} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
							<div className="space-y-1.5 flex-1">
								<div className="font-bold text-sm">
									Клиническое предупреждение: взаимоисключающие манипуляции
								</div>
								<div className="space-y-1">
									{conflicts.map((c, idx) => (
										<div key={idx} className="text-xs leading-relaxed">
											• <strong>Зуб №{c.toothNumber}:</strong> {c.descriptionRu}
										</div>
									))}
								</div>
								<div className="text-[11px] text-amber-700/90 dark:text-amber-300/90 font-semibold pt-1 border-t border-amber-500/20">
									Внимание: в плане назначены взаимоисключающие манипуляции. Врач вправе утвердить план под личную клиническую ответственность (Mandates 8e, 8y).
								</div>
							</div>
						</div>
					)}

					{/* Checkbox Consent */}
					<label className="flex items-start gap-2.5 pt-1 text-xs text-[var(--ink)] cursor-pointer select-none">
						<input
							type="checkbox"
							checked={termsAccepted}
							onChange={(e) => setTermsAccepted(e.target.checked)}
							className="mt-0.5 w-4 h-4 rounded text-[var(--teal,var(--brand-primary))] border-[var(--border)] focus:ring-[var(--teal)] cursor-pointer"
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
				<div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 p-4 border-t border-[var(--border)] bg-[var(--paper-soft)]">
					<button
						type="button"
						onClick={onClose}
						className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] border border-[var(--border)] transition-colors cursor-pointer"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handlePaperConfirm}
						aria-busy={isSubmitting}
						disabled={isSubmitting}
						title={conflicts.length > 0 ? "Внимание: в плане имеются клинические предупреждения. План будет утверждён под клиническую ответственность врача." : undefined}
						className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						data-testid="paper-signature-confirm-btn"
					>
						<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
						<span>Утвердить и подписать на бумаге (1 клик)</span>
					</button>

					<button
						type="button"
						onClick={() => handleConfirmAgreement()}
						aria-busy={isSubmitting}
						disabled={isSubmitting}
						title={conflicts.length > 0 ? "Внимание: в плане имеются клинические предупреждения. План будет утверждён под клиническую ответственность врача." : undefined}
						className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
