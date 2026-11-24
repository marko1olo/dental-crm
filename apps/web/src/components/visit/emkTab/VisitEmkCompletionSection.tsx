import React from "react";
import { AlertTriangle, Check, ChevronRight, FileCheck, Loader2, QrCode, RefreshCw } from "lucide-react";
import { useAppStore } from "../../../store/appStore";
import type { VisitEmkCompletionSectionProps } from "./types";

export function VisitEmkCompletionSection({
	isSignedVisit,
	isRevisingVisitNote,
	setIsRevisingVisitNote,
	handleSaveVisitNote,
	handleCompleteVisitAndGenerateReceipt,
	isDraftAccepting,
	isCompletingVisit,
	completionResult,
	completionError,
	setIsSbpQrModalOpen,
	activeEmkTab,
	setActiveEmkTab,
}: VisitEmkCompletionSectionProps) {
	return (
		<>
			{/* Ненавязчивая плашка завершения приёма (Мандат 8e: свобода врача, ноль насильственного срыва в кассу) */}
			{completionResult && (
				<div
					className="mt-2.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--ink)] text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
					data-testid="visit-completion-success-banner"
					role="status"
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0 shadow-2xs">
							<Check size={18} />
						</div>
						<div className="flex flex-col min-w-0">
							<span className="font-extrabold text-[var(--ink)]">
								Приём завершён. Счёт №{completionResult.receiptNumber || completionResult.invoiceId} сформирован
							</span>
							<span className="text-[11px] text-[var(--ink-muted)]">
								Протокол и смета сохранены. К оплате: {completionResult.totalNetRub.toLocaleString("ru-RU")} ₽. Вы можете остаться в карте или перейти в кассу.
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
						<button
							type="button"
							onClick={() => setIsSbpQrModalOpen(true)}
							className="secondary-button min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
							data-testid="btn-reopen-sbp-qr"
							title="Показать QR-код СБП"
						>
							<QrCode size={14} className="shrink-0" />
							<span>QR-код СБП</span>
						</button>
						<button
							type="button"
							onClick={() => {
								useAppStore.getState().setCurrentView("finance");
								if (typeof window !== "undefined") {
									window.dispatchEvent(new CustomEvent("dente:open-cashbox"));
									window.dispatchEvent(new CustomEvent("dente:navigate-to-finance"));
								}
							}}
							className="primary-button min-h-[38px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold bg-[var(--primary)] text-white hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
							data-testid="btn-goto-cashbox"
						>
							<span>Перейти в кассу</span>
							<ChevronRight size={15} className="shrink-0" />
						</button>
					</div>
				</div>
			)}

			{/* Честный неблокирующий баннер ошибки расчёта сметы без фальшивых чеков */}
			{completionError && (
				<div
					className="mt-2.5 p-2.5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)] text-xs flex flex-wrap items-center justify-between gap-2"
					data-testid="emk-completion-error-banner"
					role="alert"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle size={14} className="text-[var(--danger)] shrink-0" />
						<span className="truncate">{completionError}</span>
					</div>
					<button
						type="button"
						onClick={handleCompleteVisitAndGenerateReceipt}
						disabled={false}
						aria-busy={isCompletingVisit}
						className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--danger)] hover:opacity-90 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
						data-testid="btn-retry-visit-estimate"
					>
						{isCompletingVisit ? (
							<Loader2 size={12} className="shrink-0 animate-spin" />
						) : (
							<RefreshCw size={12} className="shrink-0" />
						)}
						<span>Повторить расчёт сметы</span>
					</button>
				</div>
			)}

			{/* Баннер ревизии закрытого дневника («Исправленному верить») */}
			{isSignedVisit && (
				<div
					className={`mt-2.5 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
						isRevisingVisitNote
							? "bg-[var(--warning)]/10 border-[var(--warning)]/30 text-[var(--ink)]"
							: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink-muted)]"
					}`}
					data-testid="emk-revision-status-banner"
				>
					<div className="flex items-center gap-2">
						<FileCheck
							size={14}
							className={isRevisingVisitNote ? "text-[var(--warning)]" : "text-[var(--ink-muted)]"}
						/>
						<span>
							{isRevisingVisitNote
								? "Режим исправления закрытого дневника («Исправленному верить»). Правки сохраняются с фиксацией в истории версий."
								: "Приём подписан врачом. Для корректировки нажмите «Внести исправление» внизу."}
						</span>
					</div>
					{isRevisingVisitNote ? (
						<button
							type="button"
							onClick={() => setIsRevisingVisitNote(false)}
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--warning)]/20 hover:bg-[var(--warning)]/30 text-[var(--ink)] transition-colors cursor-pointer"
						>
							Завершить правку
						</button>
					) : (
						<button
							type="button"
							onClick={() => setIsRevisingVisitNote(true)}
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer"
						>
							Внести исправление
						</button>
					)}
				</div>
			)}

			{/* Нижний командный бар: Сохранение и Завершение (Мандаты 8e, 8n, 8am) */}
			<div className="mt-4 pt-3 border-t border-[var(--line)] flex flex-wrap items-center justify-end gap-2.5">
				{isSignedVisit &&
					(isRevisingVisitNote ? (
						<div
							className="flex items-center gap-1.5"
							data-testid="signed-visit-revision-actions"
						>
							<button
								type="button"
								onClick={() => setIsRevisingVisitNote(false)}
								className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
								data-testid="btn-cancel-revision"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleSaveVisitNote}
								disabled={false}
								aria-busy={isDraftAccepting}
								className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--warning)] hover:opacity-90 text-white border border-[var(--warning)]/30 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs shrink-0"
								data-testid="btn-save-revision-note"
							>
								{isDraftAccepting ? (
									<Loader2 size={14} className="shrink-0 animate-spin" />
								) : (
									<FileCheck size={14} className="shrink-0" />
								)}
								<span>Сохранить («Исправленному верить»)</span>
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setIsRevisingVisitNote(true)}
							className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--warning)]/10 hover:bg-[var(--warning)]/20 text-[var(--ink)] border border-[var(--warning)]/30 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0"
							data-testid="btn-begin-revision-note"
						>
							<FileCheck size={14} className="shrink-0" />
							<span>Внести исправление («Исправленному верить»)</span>
						</button>
					))}

				<button
					type="button"
					onClick={handleSaveVisitNote}
					disabled={false}
					aria-busy={isDraftAccepting}
					className="secondary-button h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-2xs shrink-0"
					data-testid="btn-save-visit-note"
				>
					{isDraftAccepting ? (
						<Loader2 size={16} className="shrink-0 text-[var(--primary)] animate-spin" />
					) : (
						<FileCheck size={16} className="shrink-0 text-[var(--primary)]" />
					)}
					<span>Сохранить запись приёма</span>
				</button>

				<button
					type="button"
					onClick={handleCompleteVisitAndGenerateReceipt}
					disabled={isCompletingVisit}
					aria-busy={isCompletingVisit}
					className="primary-button h-9 px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] hover:opacity-90 text-white transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm shrink-0"
					data-testid="btn-complete-visit-emk"
				>
					{isCompletingVisit ? (
						<Loader2 size={16} className="shrink-0 animate-spin" />
					) : (
						<Check size={16} className="shrink-0" />
					)}
					<span>Завершить приём</span>
				</button>

				{completionResult && (
					<button
						type="button"
						onClick={() => setIsSbpQrModalOpen(true)}
						className="h-9 px-3.5 rounded-lg text-sm font-medium bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/40 hover:bg-[var(--success-soft)] transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs shrink-0"
						data-testid="btn-reopen-sbp-qr"
						title="Показать чек и QR-код СБП для оплаты"
					>
						<QrCode size={16} className="shrink-0" />
						<span>СБП QR и чек ({completionResult.receiptNumber})</span>
					</button>
				)}
			</div>

			{/* Мобильный плавающий бар действия у кресла (Apple HIG Thumb Zone, blur(20px), safe-area, тач >= 44x44px) */}
			<div
				className="sm:hidden mobile-bottom-bar-floating"
				data-testid="mobile-emk-sticky-bottom-bar"
			>
				{completionResult ? (
					<div className="flex flex-col gap-2 w-full" data-testid="mobile-completed-checkout-bar">
						<button
							type="button"
							onClick={() => {
								useAppStore.getState().setCurrentView("finance");
								if (typeof window !== "undefined") {
									window.dispatchEvent(new CustomEvent("dente:open-cashbox"));
									window.dispatchEvent(new CustomEvent("dente:navigate-to-finance"));
								}
							}}
							className="mobile-bottom-cta-primary min-h-[44px] h-11 px-4 rounded-xl text-base font-medium"
							data-testid="btn-mobile-goto-cashbox"
						>
							<span>Перейти в кассу (Счёт №{completionResult.receiptNumber || completionResult.invoiceId})</span>
							<ChevronRight size={16} className="shrink-0" />
						</button>
						<div className="mobile-bottom-secondary-strip">
							<button
								type="button"
								onClick={() => setIsSbpQrModalOpen(true)}
								className="min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
								data-testid="btn-mobile-reopen-sbp"
							>
								<QrCode size={16} className="text-[var(--primary)] shrink-0" />
								<span>СБП QR</span>
							</button>
							<button
								type="button"
								onClick={handleSaveVisitNote}
								disabled={false}
								aria-busy={isDraftAccepting}
								className="min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
								data-testid="btn-mobile-sticky-save"
							>
								{isDraftAccepting ? (
									<Loader2 size={16} className="text-[var(--primary)] shrink-0 animate-spin" />
								) : (
									<FileCheck size={16} className="text-[var(--primary)] shrink-0" />
								)}
								<span>Сохранить в карте</span>
							</button>
						</div>
					</div>
				) : (
					<>
						{/* Ровно 1 Primary CTA: Далее (шаги 1–3) или Завершить приём (шаг 4) */}
						{(activeEmkTab === "complaints" ||
							activeEmkTab === "complaint" ||
							activeEmkTab === "anamnesis") && (
							<button
								type="button"
								onClick={() => setActiveEmkTab("objectiveStatus")}
								className="mobile-bottom-cta-next min-h-[44px] h-11 px-4 rounded-xl text-base font-medium"
								data-testid="btn-mobile-next-step"
							>
								<span>Далее: Осмотр и статус</span>
								<ChevronRight size={16} />
							</button>
						)}

						{(activeEmkTab === "objectiveStatus" ||
							activeEmkTab === "status" ||
							activeEmkTab === "objective") && (
							<button
								type="button"
								onClick={() => setActiveEmkTab("diagnosis")}
								className="mobile-bottom-cta-next min-h-[44px] h-11 px-4 rounded-xl text-base font-medium"
								data-testid="btn-mobile-next-step"
							>
								<span>Далее: Диагноз (МКБ-10)</span>
								<ChevronRight size={16} />
							</button>
						)}

						{activeEmkTab === "diagnosis" && (
							<button
								type="button"
								onClick={() => setActiveEmkTab("treatmentPlan")}
								className="mobile-bottom-cta-next min-h-[44px] h-11 px-4 rounded-xl text-base font-medium"
								data-testid="btn-mobile-next-step"
							>
								<span>Далее: Лечение и протокол</span>
								<ChevronRight size={16} />
							</button>
						)}

						{(activeEmkTab === "treatmentPlan" ||
							activeEmkTab === "diary" ||
							activeEmkTab === "recommendations" ||
							activeEmkTab === "all") && (
							<button
								type="button"
								onClick={handleCompleteVisitAndGenerateReceipt}
								disabled={isCompletingVisit}
								aria-busy={isCompletingVisit}
								className="mobile-bottom-cta-primary min-h-[44px] h-11 px-4 rounded-xl text-base font-medium"
								data-testid="btn-mobile-primary-complete"
							>
								{isCompletingVisit ? (
									<Loader2 size={18} className="shrink-0 animate-spin" />
								) : (
									<Check size={18} className="shrink-0" />
								)}
								<span>Завершить приём и сформировать счёт</span>
								<ChevronRight size={16} className="shrink-0" />
							</button>
						)}

						{/* Вспомогательная полоса действий: ровно 1 нейтральная Secondary кнопка сохранения черновика (ноль конкуренции с Primary) */}
						<div className="mobile-bottom-secondary-strip">
							<button
								type="button"
								onClick={handleSaveVisitNote}
								disabled={false}
								aria-busy={isDraftAccepting}
								className="min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
								data-testid="btn-mobile-sticky-save"
							>
								{isDraftAccepting ? (
									<Loader2 size={15} className="text-[var(--primary)] shrink-0 animate-spin" />
								) : (
									<FileCheck size={15} className="text-[var(--primary)] shrink-0" />
								)}
								<span>Сохранить черновик</span>
							</button>
						</div>
					</>
				)}
			</div>
		</>
	);
}
