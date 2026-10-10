import {
	Activity,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	CreditCard,
	FileText,
	Lock,
	Pill,
	Printer,
	Scan,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	X,
} from "lucide-react";
import type React from "react";
import {
	type RadiologySnapshotItem,
	VisitSummaryRadiologyGallery,
	RadiologyZoomLightbox,
} from "../VisitSummaryRadiologyGallery";
import { VisitSummaryDiarySections } from "../VisitSummaryDiarySections";
import { PatientMemoPrintModal } from "../PatientMemoPrintModal";
import { VisitFollowUpSection } from "./VisitFollowUpSection";
import { VisitRecommendationsSection } from "./VisitRecommendationsSection";
import { VisitBillingSummarySection } from "./VisitBillingSummarySection";
import type { VisitSummaryModalProps } from "./types";
import type { VisitSummaryModalState } from "./useVisitSummaryModalState";

export interface VisitSummaryModalContentProps {
	props: VisitSummaryModalProps;
	state: VisitSummaryModalState;
}

export const VisitSummaryModalContent: React.FC<VisitSummaryModalContentProps> = ({
	props,
	state,
}) => {
	const {
		onClose,
		patient,
		isLocked,
		lockedAt,
		diaryHash,
		hasCryptoSignature,
		diary,
		radiologySnapshots = [],
		onOpenProtocolGenerator,
		onOpenPrescription,
		onOpenRadiologyReferral,
		onOpenEgiszExport,
		onPrint,
	} = props;

	const {
		patientName,
		patientBirth,
		patientCard,
		patientPassport,
		patientOms,
		patientSnils,
		doctorSpecialty,
		synthesizedDiaryPreview,
		abnormalTeeth,
		isVisitPaid,
		paidTenderMethod,
		paidAmountRub,
		effectiveTotalDueRub,
		effectiveDepositRub,
		isDocsDropupOpen,
		setIsDocsDropupOpen,
		docsDropupRef,
		isCompleting,
		handleScheduleNextStage,
		handleOpenPaymentModal,
		handleCompleteVisitAction,
		isMemoModalOpen,
		setIsMemoModalOpen,
		zoomImage,
		setZoomImage,
		consumablesReconciliation,
		handleAddAllUnbilledToBill,
	} = state;

	const doctorName = props.doctorName;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Клиническая сводка приёма"
			data-testid="visit-summary-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl overflow-hidden">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--line)]">
							<Activity className="w-5 h-5" />
						</div>
						<div>
							<h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
								Клиническая сводка приёма
								{isLocked ? (
									<span className="inline-flex items-center gap-1 px-3 py-1 min-h-[32px] sm:min-h-[44px] rounded-full text-xs font-semibold bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal)] min-w-0 break-words">
										<Lock className="w-3 h-3 shrink-0" />
										<span className="min-w-0 break-words">Подписано в карте</span>
									</span>
								) : (
									<span className="inline-flex items-center gap-1 px-3 py-1 min-h-[32px] sm:min-h-[44px] rounded-full text-xs font-semibold bg-[var(--amber-soft,rgba(217,119,6,0.12))] text-[var(--amber,#b45309)] border border-[var(--amber,#b45309)] min-w-0 break-words">
										<Clock className="w-3 h-3 shrink-0" />
										<span className="min-w-0 break-words">Черновик</span>
									</span>
								)}
							</h3>
							<p className="text-xs text-[var(--muted)]">
								{patientName} {patientCard ? `· Карта № ${patientCard}` : ""}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors cursor-pointer"
						aria-label="Закрыть сводку"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Modal Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Status Line & Autosave Status */}
					<VisitFollowUpSection onScheduleNextStage={handleScheduleNextStage} />

					{/* Patient & Doctor Meta Grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs">
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
								<User className="w-3.5 h-3.5 text-[var(--teal)]" /> Пациент:
							</div>
							<div className="font-semibold text-sm text-[var(--ink)]">
								{patientName}
							</div>
							<div className="grid grid-cols-1 gap-1 text-[var(--muted)] pt-0.5">
								{patientBirth ? (
									<div>
										<span className="font-medium text-[var(--ink)]">Дата рождения:</span> {patientBirth}
									</div>
								) : null}
								{patientCard ? (
									<div>
										<span className="font-medium text-[var(--ink)]">№ медкарты:</span> {patientCard}
									</div>
								) : null}
								{patientPassport ? (
									<div>
										<span className="font-medium text-[var(--ink)]">Паспорт:</span> {patientPassport}
									</div>
								) : null}
								{patientOms ? (
									<div>
										<span className="font-medium text-[var(--ink)]">Полис ОМС/ДМС:</span> {patientOms}
									</div>
								) : null}
								{patientSnils ? (
									<div>
										<span className="font-medium text-[var(--ink)]">СНИЛС:</span> {patientSnils}
									</div>
								) : null}
							</div>
						</div>
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
								<Stethoscope className="w-3.5 h-3.5 text-[var(--teal)]" /> Лечащий врач:
							</div>
							<div className="font-semibold text-sm text-[var(--ink)]">
								{doctorName || "—"}
							</div>
							{doctorSpecialty ? (
								<div className="text-[var(--muted)]">
									Специальность: {doctorSpecialty}
								</div>
							) : null}
						</div>
					</div>

					{/* Recommendations, Protocols & Tooth Chart Abnormalities */}
					<VisitRecommendationsSection
						diary={diary}
						abnormalTeeth={abnormalTeeth}
						onScheduleNextStage={handleScheduleNextStage}
						onOpenProtocolGenerator={() => {
							if (onOpenProtocolGenerator) {
								onClose();
								onOpenProtocolGenerator();
							} else {
								state.setIsProtocolGeneratorOpen(true);
							}
						}}
						onOpenMemoModal={() => setIsMemoModalOpen(true)}
					/>

					{/* Chairside POS Checkout & Quick Payment in Chair */}
					<VisitBillingSummarySection
						isVisitPaid={isVisitPaid}
						paidTenderMethod={paidTenderMethod}
						paidAmountRub={paidAmountRub}
						effectiveTotalDueRub={effectiveTotalDueRub}
						effectiveDepositRub={effectiveDepositRub}
						onOpenPaymentModal={handleOpenPaymentModal}
						consumablesReconciliation={consumablesReconciliation}
						onAddAllUnbilledToBill={handleAddAllUnbilledToBill}
					/>

					{/* Разделы Формы 043/у */}
					<VisitSummaryDiarySections
						diary={diary}
						synthesizedDiaryPreview={synthesizedDiaryPreview}
					/>

					{/* Radiology & 3D Visiograph Snapshots */}
					<VisitSummaryRadiologyGallery
						radiologySnapshots={radiologySnapshots}
						onZoomImage={setZoomImage}
					/>

					{/* Legal Status Stamp */}
					{isLocked && diaryHash ? (
						<div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--teal)] bg-[var(--teal-surface)] text-xs text-[var(--ink)]">
							<ShieldCheck className="w-6 h-6 text-[var(--teal)] shrink-0" />
							<div>
								<div className="font-bold text-sm text-[var(--teal-dark)]">
									{hasCryptoSignature
										? "Документ заверен квалифицированной ЭЦП (УКЭП)"
										: "Дневник заверен (контрольная сумма SHA-256)"}
								</div>
								<div className="text-[var(--muted)] font-mono">
									SHA-256: {diaryHash}
								</div>
								{lockedAt ? (
									<div className="text-[var(--muted)]">
										Подписано: {new Date(lockedAt).toLocaleString("ru-RU")}
									</div>
								) : null}
							</div>
						</div>
					) : null}
				</div>

				{/* Modal Footer */}
				<div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)] no-print">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center px-5 py-2.5 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] text-sm font-bold transition-colors cursor-pointer"
					>
						Закрыть
					</button>
					<div className="flex flex-wrap items-center gap-3">
						{/* Dropup Menu: Документы и справки ▾ */}
						<div className="relative" ref={docsDropupRef}>
							<button
								type="button"
								onClick={() => setIsDocsDropupOpen((prev) => !prev)}
								className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] text-sm font-semibold transition-colors cursor-pointer shadow-xs"
								data-testid="summary-docs-dropup-btn"
								aria-haspopup="true"
								aria-expanded={isDocsDropupOpen}
								title="Сопутствующие документы и справки"
							>
								<FileText className="w-4 h-4 text-[var(--muted)]" />
								<span>Документы и справки</span>
								{isDocsDropupOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
							</button>

							{isDocsDropupOpen && (
								<div
									className="absolute left-0 bottom-full mb-2 z-50 flex flex-col p-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl min-w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-150"
									data-testid="summary-docs-dropup-menu"
								>
									<div className="px-3 py-1.5 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--line)]">
										Документы и направления
									</div>
									<button
										type="button"
										onClick={() => {
											setIsDocsDropupOpen(false);
											if (onOpenProtocolGenerator) {
												onClose();
												onOpenProtocolGenerator();
											} else {
												state.setIsProtocolGeneratorOpen(true);
											}
										}}
										className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors text-left cursor-pointer"
										data-testid="summary-open-protocol-generator-btn"
									>
										<Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0" />
										<span>Дневник приёма (по диагнозу)</span>
									</button>
									{onOpenPrescription ? (
										<button
											type="button"
											onClick={() => {
												setIsDocsDropupOpen(false);
												onClose();
												onOpenPrescription();
											}}
											className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors text-left cursor-pointer"
											data-testid="summary-prescription-btn"
										>
											<Pill className="w-4 h-4 text-blue-500 shrink-0" />
											<span>Рецепт (107-1/у)</span>
										</button>
									) : null}
									{onOpenRadiologyReferral ? (
										<button
											type="button"
											onClick={() => {
												setIsDocsDropupOpen(false);
												onClose();
												onOpenRadiologyReferral();
											}}
											className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors text-left cursor-pointer"
											data-testid="summary-radiology-btn"
										>
											<Scan className="w-4 h-4 text-teal-500 shrink-0" />
											<span>Направление на снимок (КЛКТ/ОПТГ)</span>
										</button>
									) : null}
									<button
										type="button"
										onClick={() => {
											setIsDocsDropupOpen(false);
											setIsMemoModalOpen(true);
										}}
										className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors text-left cursor-pointer"
										data-testid="summary-print-memo-btn"
									>
										<FileText className="w-4 h-4 text-indigo-500 shrink-0" />
										<span>Памятка пациенту</span>
									</button>
									{onOpenEgiszExport ? (
										<button
											type="button"
											onClick={() => {
												setIsDocsDropupOpen(false);
												onClose();
												onOpenEgiszExport();
											}}
											className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors text-left cursor-pointer"
											data-testid="summary-egisz-btn"
										>
											<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
											<span>Электронная карта (Госуслуги)</span>
										</button>
									) : null}

									{/* Quick Chairside POS inside Dropup */}
									{!isVisitPaid ? (
										<button
											type="button"
											onClick={() => {
												setIsDocsDropupOpen(false);
												handleOpenPaymentModal("sbp_qr");
											}}
											className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors text-left cursor-pointer border-t border-[var(--line)]"
											data-testid="summary-quick-pay-btn"
											title="Оплатить приём в кресле"
										>
											<CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
											<span>Оплата приёма ({effectiveTotalDueRub.toLocaleString("ru-RU")} ₽)</span>
										</button>
									) : (
										<div
											className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-600 border-t border-[var(--line)]"
											data-testid="summary-paid-indicator"
										>
											<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
											<span>Оплачено ({paidAmountRub || effectiveTotalDueRub} ₽)</span>
										</div>
									)}
								</div>
							)}
						</div>

						{/* Secondary CTA: Печать карты 043/у */}
						<button
							type="button"
							onClick={() => {
								if (onPrint) {
									onClose();
									onPrint();
								} else {
									window.print();
								}
							}}
							className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[48px] rounded-xl bg-[var(--teal)] text-[var(--on-teal,white)] text-sm sm:text-base font-extrabold hover:bg-[var(--teal-dark)] transition-colors shadow-md cursor-pointer whitespace-nowrap shrink-0"
							data-testid="summary-print-btn"
							title="Печать медицинской карты приёма"
							aria-label="Печать медицинской карты приёма"
						>
							<Printer className="w-4 h-4" />
							<span>Печать медицинской карты</span>
						</button>

						{/* Primary CTA: Завершить приём */}
						<button
							type="button"
							onClick={handleCompleteVisitAction}
							disabled={isCompleting}
							className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[48px] min-w-[200px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-black transition-colors shadow-md cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
							data-testid="summary-complete-visit-btn"
							title="Завершить приём и сформировать чек"
						>
							<CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
							<span>{isCompleting ? "Завершаю..." : "Завершить приём"}</span>
						</button>
					</div>
				</div>

				{/* 1-Click Human Post-Op Memo Print Modal */}
				<PatientMemoPrintModal
					isOpen={isMemoModalOpen}
					onClose={() => setIsMemoModalOpen(false)}
					initialMemoId={
						diary.treatmentDescription?.toLowerCase().includes("удален") ||
						diary.diagnosisIcd10?.startsWith("K01")
							? "surgery_extraction"
							: diary.diagnosisIcd10?.startsWith("K04") ||
							  diary.treatmentDescription?.toLowerCase().includes("канал")
							? "endodontics"
							: "anesthesia_caries"
					}
					patient={
						patient
							? {
									fullName: patientName,
									birthDate: patient.birthDate || patient.dateOfBirth,
									phone: patient.phone,
									cardNumber: patient.cardNumber || patient.medicalCardNumber || patient.chartNumber,
							  }
							: null
					}
					doctorName={doctorName}
					doctorSpecialty={doctorSpecialty || "Врач-стоматолог"}
					toothNumber={abnormalTeeth[0]?.toothNumber}
				/>

				{/* Zoom Lightbox In-Modal Overlay */}
				<RadiologyZoomLightbox
					zoomImage={zoomImage}
					onClose={() => setZoomImage(null)}
				/>
			</div>
		</div>
	);
};
