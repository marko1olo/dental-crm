import type React from "react";
import { Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { BarChart2, X } from "lucide-react";
import { VisitDiaryModals } from "../VisitDiaryModals";

const PeriodontogramChart = lazy(() =>
	import("../../../perio/PeriodontogramChart").then((m) => ({ default: m.PeriodontogramChart }))
);

export interface VisitDiaryModalsHostProps {
	readonly modals: any;
	readonly logic: any;
	readonly patientInfo: any;
	readonly ctx: any;
	readonly icdEntry: any;
	readonly patientId?: string;
}

export const VisitDiaryModalsHost: React.FC<VisitDiaryModalsHostProps> = ({
	modals,
	logic,
	patientInfo,
	ctx,
	icdEntry,
	patientId,
}) => {
	return (
		<>
			<VisitDiaryModals
				showSummaryModal={modals.showSummaryModal}
				setShowSummaryModal={modals.setShowSummaryModal}
				showPrescriptionModal={modals.showPrescriptionModal}
				setShowPrescriptionModal={modals.setShowPrescriptionModal}
				showRadiologyReferralModal={modals.showRadiologyReferralModal}
				setShowRadiologyReferralModal={modals.setShowRadiologyReferralModal}
				showEgiszModal={modals.showEgiszModal}
				setShowEgiszModal={modals.setShowEgiszModal}
				showTemplatesModal={modals.showTemplatesModal}
				setShowTemplatesModal={modals.setShowTemplatesModal}
				showBrandingCustomizer={modals.showBrandingCustomizer}
				setShowBrandingCustomizer={modals.setShowBrandingCustomizer}
				showPreview={logic.showPreview}
				setShowPreview={logic.setShowPreview}
				diary={logic.diary}
				setDiary={logic.setDiary}
				isLocked={logic.isLocked}
				isRevising={logic.isRevising}
				beginRevise={logic.beginRevise}
				scheduleDebouncedSave={logic.scheduleDebouncedSave}
				setIcdSearch={logic.setIcdSearch}
				doSave={logic.doSave}
				doctorName={patientInfo.doctorName}
				doctorSpecialty={patientInfo.doctorSpecialty}
				patientFullName={patientInfo.patientFullName}
				patientBirthDate={patientInfo.patientBirthDate}
				patientCardNumber={patientInfo.patientCardNumber}
				patientPassport={patientInfo.patientPassport}
				patientOms={patientInfo.patientOms}
				patientSnils={patientInfo.patientSnils}
				patientPhone={patientInfo.patientPhone}
				patientAddress={patientInfo.patientAddress}
				clinicName={patientInfo.clinicName}
				activePatient={ctx.activePatient}
				printPatient={patientInfo.printPatient}
				lockedAt={logic.lockedAt}
				diaryHash={logic.diaryHash}
				hasCryptoSignature={logic.hasCryptoSignature}
				activeTeeth={patientInfo.activeTeeth}
				radiologySnapshots={patientInfo.radiologySnapshots}
				lastSavedAt={logic.lastSavedAt}
				icdEntry={icdEntry}
				revisionCount={logic.revisionCount}
			/>

			{modals.isTier3PerioModalOpen &&
				typeof window !== "undefined" &&
				createPortal(
					<div
						className="fixed inset-0 z-[9995] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
						role="dialog"
						aria-modal="true"
						aria-label="Кабинет врача-пародонтолога"
					>
						<div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
							<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#334155)]">
								<div className="flex items-center gap-2">
									<BarChart2 className="w-5 h-5 text-teal-400" />
									<h3 className="text-base font-bold text-[var(--ink,#f8fafc)]">
										Пародонтологическая карта (6 точек зондирования & Статус)
									</h3>
								</div>
								<button
									type="button"
									onClick={() => modals.setIsTier3PerioModalOpen(false)}
									className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer font-bold flex items-center justify-center"
									title="Закрыть кабинет пародонтологии"
									aria-label="Закрыть кабинет пародонтологии"
								>
									<X size={16} />
								</button>
							</div>
							<Suspense
								fallback={
									<div className="p-8 text-center text-sm text-[var(--muted)] flex items-center justify-center gap-2">
										<BarChart2 className="w-5 h-5 animate-pulse text-teal-400" />
										<span>Загрузка кабинета пародонтологии...</span>
									</div>
								}
							>
								<PeriodontogramChart
									patientId={patientId || ""}
									patientName={patientInfo.patientFullName || "Пациент"}
									organizationId={undefined}
									doctorName={logic.diaryDoctorFullName || patientInfo.sessionDoctorName || undefined}
									onInsertToProtocol={(protocolText) => {
										logic.setDiary((prev: any) => ({
											...prev,
											statusLocalis: prev.statusLocalis
												? `${prev.statusLocalis}\n\n${protocolText}`
												: protocolText,
										}));
										logic.scheduleDebouncedSave();
										modals.setIsTier3PerioModalOpen(false);
										ctx.showToast?.("Пародонтограмма перенесена в дневник приёма", "success");
									}}
								/>
							</Suspense>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
};
