/**
 * DoctorPieceRateWalletView.tsx — Экран сдельной оплаты труда врача («Тайный блокнот врача»).
 * Mandate 8e: Doctor Autonomy & Financial Sovereignty.
 * Mandate 8x: полное исключение канцелярита Т-51.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
	type DoctorPieceRateWalletViewProps,
	pluralizeRu,
	WalletKpiLedger,
	SpecialtyBreakdownSection,
	ManipulationsTableView,
	MobileGroupedCardList,
	ReconciliationModal,
} from "./pieceRateWallet/index.js";
import { useDoctorWalletLogic } from "./pieceRateWallet/useDoctorWalletLogic.js";
import { DoctorWalletHeader } from "./pieceRateWallet/DoctorWalletHeader.js";
import { DoctorWalletFooterActions } from "./pieceRateWallet/DoctorWalletFooterActions.js";
import "./doctorPieceRateWallet.css";

export { pluralizeRu };
export type { DoctorPieceRateWalletViewProps };

export const DoctorPieceRateWalletView: React.FC<DoctorPieceRateWalletViewProps> = ({
	doctorId = "doc-1",
	doctorName = "Д-р Смирнов Алексей Петрович",
	doctorSpecialty = "Врач-стоматолог терапевт-ортопед",
	shiftDateIso = new Date().toISOString().split("T")[0]!,
	onClose,
	onPrintPayslip,
}) => {
	const logic = useDoctorWalletLogic(doctorId, shiftDateIso, onPrintPayslip);

	return (
		<div className="doctor-piece-rate-container" data-testid="doctor-piece-rate-wallet-view" role="region" aria-label="Сдельная оплата труда врача">
			<div className="dpr-mobile-drag-handle-bar" aria-hidden="true">
				<span className="dpr-mobile-drag-pill" />
			</div>

			<DoctorWalletHeader
				doctorName={logic.data?.doctorName || doctorName}
				doctorSpecialty={logic.data?.doctorSpecialty || doctorSpecialty}
				selectedDate={logic.selectedDate}
				activePeriodFilter={logic.activePeriodFilter}
				isLoading={logic.isLoading}
				onClose={onClose}
				onSelectToday={logic.handleSelectToday}
				onSelectYesterday={logic.handleSelectYesterday}
				onDateChange={(d) => { logic.setSelectedDate(d); logic.setActivePeriodFilter("custom"); }}
				onRefresh={() => logic.fetchEarnings(logic.selectedDate)}
			/>

			{logic.isLoading && !logic.data && (
				<div className="p-12 text-center text-[var(--muted)]">
					<RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-[var(--teal)]" />
					<div className="font-semibold text-sm">Сверяем выполненные манипуляции и наряды ЗТЛ...</div>
				</div>
			)}

			{logic.error && !logic.data && (
				<div className="p-8 text-center text-[var(--rose)]">
					<AlertCircle className="w-8 h-8 mx-auto mb-2" />
					<div className="font-bold text-sm mb-1">Ошибка загрузки начислений</div>
					<div className="text-xs opacity-80 mb-4">{logic.error}</div>
					<button type="button" onClick={() => logic.fetchEarnings(logic.selectedDate)} className="dpr-action-btn-primary mx-auto">
						Повторить попытку
					</button>
				</div>
			)}

			{logic.data && (
				<>
					<WalletKpiLedger data={logic.data} isReconciledConfirmed={logic.isReconciledConfirmed} />
					<SpecialtyBreakdownSection specialtyBreakdown={logic.data.specialtyBreakdown} />
					<ManipulationsTableView appointments={logic.data.appointments} />
					<MobileGroupedCardList appointments={logic.data.appointments} />
					<DoctorWalletFooterActions
						onReconcile={() => logic.setIsReconciliationModalOpen(true)}
						onPrintSlip={logic.handlePrintSlip}
						onClose={onClose}
					/>
				</>
			)}

			<ReconciliationModal
				isOpen={logic.isReconciliationModalOpen}
				selectedDate={logic.selectedDate}
				data={logic.data}
				onClose={() => logic.setIsReconciliationModalOpen(false)}
				onConfirm={logic.handleConfirmReconciliation}
			/>
		</div>
	);
};

export default DoctorPieceRateWalletView;
