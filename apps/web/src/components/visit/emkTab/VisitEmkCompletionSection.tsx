import React from "react";
import { Check, ChevronRight, FileCheck, QrCode } from "lucide-react";
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
	setIsSbpQrModalOpen,
	activeEmkTab,
	setActiveEmkTab,
}: VisitEmkCompletionSectionProps) {
	return (
		<>
			{/* Баннер ревизии закрытого дневника («Исправленному верить») */}
			{isSignedVisit && (
				<div
					className={`mt-2.5 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
						isRevisingVisitNote
							? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
							: "bg-[var(--surface-subtle)] border-[var(--glass-border)] text-[var(--muted)]"
					}`}
					data-testid="emk-revision-status-banner"
				>
					<div className="flex items-center gap-2">
						<FileCheck
							size={14}
							className={isRevisingVisitNote ? "text-amber-600" : "text-[var(--muted)]"}
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
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 transition-colors cursor-pointer"
						>
							Завершить правку
						</button>
					) : (
						<button
							type="button"
							onClick={() => setIsRevisingVisitNote(true)}
							className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text)] transition-colors cursor-pointer"
						>
							Внести исправление
						</button>
					)}
				</div>
			)}

			{/* Нижний командный бар: Сохранение и Завершение (Мандаты 8e, 8n) */}
			<div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex flex-wrap items-center justify-end gap-2.5">
				{isSignedVisit &&
					(isRevisingVisitNote ? (
						<div
							className="flex items-center gap-1.5"
							data-testid="signed-visit-revision-actions"
						>
							<button
								type="button"
								onClick={() => setIsRevisingVisitNote(false)}
								className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-500/10 hover:bg-gray-500/20 text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
								data-testid="btn-cancel-revision"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleSaveVisitNote}
								disabled={isDraftAccepting}
								className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border border-amber-600/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
								data-testid="btn-save-revision-note"
							>
								<FileCheck size={15} />
								<span>Сохранить («Исправленному верить»)</span>
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setIsRevisingVisitNote(true)}
							className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
							data-testid="btn-begin-revision-note"
						>
							<FileCheck size={15} />
							<span>Внести исправление («Исправленному верить»)</span>
						</button>
					))}

				<button
					type="button"
					onClick={handleSaveVisitNote}
					disabled={isDraftAccepting}
					className="min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--brand)] hover:opacity-90 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
					data-testid="btn-save-visit-note"
				>
					<FileCheck size={16} className="shrink-0" />
					<span>Сохранить запись приёма</span>
				</button>

				<button
					type="button"
					onClick={handleCompleteVisitAndGenerateReceipt}
					disabled={isCompletingVisit}
					className="min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[var(--ok-fg)] hover:opacity-90 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
					data-testid="btn-complete-visit-emk"
				>
					<Check size={16} className="shrink-0" />
					<span>Завершить приём</span>
				</button>

				{completionResult && (
					<button
						type="button"
						onClick={() => setIsSbpQrModalOpen(true)}
						className="min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/40 hover:bg-[var(--ok-fg)]/10 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
						data-testid="btn-reopen-sbp-qr"
						title="Показать чек и QR-код СБП для оплаты"
					>
						<QrCode size={16} className="shrink-0" />
						<span>СБП QR и чек ({completionResult.receiptNumber})</span>
					</button>
				)}
			</div>

			{/* Мобильный плавающий бар действия у кресла (Apple HIG Thumb Zone, blur(20px), safe-area) */}
			<div
				className="sm:hidden mobile-bottom-bar-floating"
				data-testid="mobile-emk-sticky-bottom-bar"
			>
				{/* 52px Primary CTA: Далее (шаги 1–3) или Завершить приём (шаг 4) */}
				{(activeEmkTab === "complaints" ||
					activeEmkTab === "complaint" ||
					activeEmkTab === "anamnesis") && (
					<button
						type="button"
						onClick={() => setActiveEmkTab("objectiveStatus")}
						className="mobile-bottom-cta-next"
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
						className="mobile-bottom-cta-next"
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
						className="mobile-bottom-cta-next"
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
						className="mobile-bottom-cta-primary"
						data-testid="btn-mobile-primary-complete"
					>
						<Check size={18} className="shrink-0" />
						<span>Завершить приём и сформировать чек</span>
						<ChevronRight size={16} className="shrink-0" />
					</button>
				)}

				{/* Вспомогательная полоса действий (Сохранить черновик / Быстро завершить) */}
				<div className="mobile-bottom-secondary-strip">
					<button
						type="button"
						onClick={handleSaveVisitNote}
						disabled={isDraftAccepting}
						className="min-h-[40px] flex-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
						data-testid="btn-mobile-sticky-save"
					>
						<FileCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Сохранить черновик</span>
					</button>

					<button
						type="button"
						onClick={handleCompleteVisitAndGenerateReceipt}
						disabled={isCompletingVisit}
						className="min-h-[40px] flex-1 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[var(--ok-fg)] text-white flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
						data-testid="btn-mobile-sticky-complete"
					>
						<Check size={14} className="shrink-0" />
						<span>Завершить приём</span>
					</button>
				</div>
			</div>
		</>
	);
}
