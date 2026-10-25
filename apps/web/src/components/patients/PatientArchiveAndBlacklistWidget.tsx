import React from "react";
import { ShieldAlert } from "lucide-react";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { panelStateText } from "../../lib/panelStateText";
import { BLACKLIST_SUBJECT, type ArchiveReasonItem } from "./patientArchive/archiveTypes";
import { usePatientArchiveAndBlacklistLogic } from "./patientArchive/usePatientArchiveAndBlacklistLogic";
import { EmergencyCareAlertBanner } from "./patientArchive/EmergencyCareAlertBanner";
import { ArchiveConfirmModal } from "./patientArchive/ArchiveConfirmModal";

export type { ArchiveReasonItem };

export const PatientArchiveAndBlacklistWidget: React.FC<{
	patientId: string;
}> = ({ patientId }) => {
	const logic = usePatientArchiveAndBlacklistLogic(patientId);

	return (
		<div
			data-testid="patient-archive-blacklist-widget"
			className={`p-4 rounded-xl border my-4 shadow-sm transition-all duration-200 text-[var(--ink)] ${
				logic.isBlacklisted && !logic.statusUnknown
					? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800"
					: "bg-[var(--paper)] border-[var(--line)]"
			}`}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center space-x-2">
					<ShieldAlert
						className={`w-5 h-5 ${logic.isBlacklisted && !logic.statusUnknown ? "text-rose-600 dark:text-rose-400" : "text-amber-500"}`}
					/>
					<h3 className="font-semibold text-sm">
						Блокировка записи и черный список
					</h3>
				</div>
			</div>

			<div className="space-y-3">
				{logic.statusUnknown ? (
					<PanelLoadFailure
						subject={BLACKLIST_SUBJECT}
						status={logic.failureStatus}
						onRetry={logic.reload}
					/>
				) : (
					<>
						<p className="text-xs text-[var(--muted)] leading-relaxed break-words">
							{logic.isBlacklisted
								? "Запись на прием заблокирована во всех клиниках сети. Снимите блокировку, если причина больше не действует."
								: panelStateText(BLACKLIST_SUBJECT, { phase: "empty" }).hint}
						</p>
						<div className="flex items-center space-x-2">
							<button
								type="button"
								onClick={() => {
									if (logic.isBlacklisted) {
										void logic.handleApplyStatus();
									} else {
										logic.setModalIsBlacklisted(true);
										logic.setConfirmModalOpen(true);
									}
								}}
								disabled={logic.loading || logic.isApplying}
								title={
									logic.isBlacklisted
										? "Снять блокировку записи"
										: "Заблокировать запись и добавить в ЧС"
								}
								className={`px-4 py-2 min-h-[44px] sm:min-h-[32px] rounded-xl text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center ${
									logic.isBlacklisted
										? "bg-emerald-600 hover:bg-emerald-700 text-white"
										: "bg-rose-600 hover:bg-rose-700 text-white"
								}`}
							>
								{logic.loading
									? "Читаем статус…"
									: logic.isBlacklisted
										? "Восстановить из черного списка"
										: "Добавить в черный список"}
							</button>
						</div>

						{logic.isBlacklisted && <EmergencyCareAlertBanner />}
					</>
				)}
			</div>

			{logic.confirmModalOpen && (
				<ArchiveConfirmModal
					isBlacklisted={logic.isBlacklisted}
					patientName={logic.patientName}
					archiveReason={logic.archiveReason}
					setArchiveReason={logic.setArchiveReason}
					modalIsBlacklisted={logic.modalIsBlacklisted}
					setModalIsBlacklisted={logic.setModalIsBlacklisted}
					blacklistReason={logic.blacklistReason}
					setBlacklistReason={logic.setBlacklistReason}
					isApplying={logic.isApplying}
					onConfirm={logic.handleApplyStatus}
					onCancel={() => logic.setConfirmModalOpen(false)}
				/>
			)}
		</div>
	);
};

export default PatientArchiveAndBlacklistWidget;
