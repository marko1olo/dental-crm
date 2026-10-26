/**
 * DicomImportManagerModal.tsx — Модальное окно автодетекта КТ и очередей томографов (Мандат 8b <= 120 строк).
 */

import React from "react";
import { RefreshCw } from "lucide-react";
import {
	type PendingStudyItem,
	type DicomImportManagerModalProps,
	useDicomImportManager,
	DicomImportHeader,
	DicomImportTabs,
	DicomStudiesList,
	DicomImportSettingsTab,
} from "./dicomImportModal";

export type { PendingStudyItem, DicomImportManagerModalProps };

export const DicomImportManagerModal: React.FC<DicomImportManagerModalProps> = ({
	isOpen,
	onClose,
	onStudyBound,
}) => {
	const {
		activeTab, setActiveTab, studies, daemonStatus, isLoading, isScanning,
		actionPendingId, handleScanNow, handleBindPatient, handleDismiss,
	} = useDicomImportManager(isOpen, onStudyBound);

	if (!isOpen) return null;

	const pendingStudies = studies.filter((s) => s.bindingStatus === "pending_review");
	const unassignedStudies = studies.filter((s) => s.bindingStatus === "unassigned");

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border"
				style={{ background: "var(--paper, #ffffff)", borderColor: "var(--line, #e2e8f0)", color: "var(--ink, #0f172a)" }}
			>
				<DicomImportHeader isScanning={isScanning} onScanNow={handleScanNow} onClose={onClose} />
				<DicomImportTabs
					activeTab={activeTab}
					onTabChange={setActiveTab}
					pendingCount={pendingStudies.length}
					unassignedCount={unassignedStudies.length}
				/>

				<div className="flex-1 overflow-y-auto p-6 space-y-4">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-12 space-y-2 opacity-60">
							<RefreshCw className="w-6 h-6 animate-spin" />
							<span className="text-xs">Загрузка очереди КТ...</span>
						</div>
					) : activeTab === "pending" ? (
						<DicomStudiesList mode="pending" studies={pendingStudies} actionPendingId={actionPendingId} onBind={handleBindPatient} onDismiss={handleDismiss} />
					) : activeTab === "unassigned" ? (
						<DicomStudiesList mode="unassigned" studies={unassignedStudies} actionPendingId={actionPendingId} onBind={handleBindPatient} onDismiss={handleDismiss} />
					) : (
						<DicomImportSettingsTab daemonStatus={daemonStatus} />
					)}
				</div>

				<div className="flex items-center justify-between px-6 py-3 border-t text-xs opacity-75" style={{ borderColor: "var(--line, #e2e8f0)" }}>
					<span>Последнее сканирование: {daemonStatus?.lastScanAt ? new Date(daemonStatus.lastScanAt).toLocaleTimeString() : "Не проводилось"}</span>
					<button type="button" onClick={onClose} className="h-8 px-4 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer shadow-2xs">
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
