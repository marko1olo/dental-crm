/**
 * DmsRegistryExportModal.tsx — Модальное окно экспорта реестра ДМС
 * Фасад декомпозированного модуля (Мандат 8b: <= 120 строк)
 */

import { FileText, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import "./insurance.css";
import {
	DmsRegistryActParametersSection,
	DmsRegistryFiltersSection,
	DmsRegistryModalFooter,
	DmsRegistrySummaryCards,
	DmsRegistryTableSection,
	useDmsRegistryExportState,
	type DmsRegistryExportModalProps,
} from "./dmsRegistryExport/index.js";
import {
	handleExportRegistryCsv,
	handleExportRegistryXml,
} from "./dmsRegistryExport/exportRegistryFileHandlers.js";
import {
	handlePrintRegistryAct,
	handlePrintRegistryMeeAct,
} from "./dmsRegistryExport/exportRegistryPrintHandlers.js";

export type { DmsRegistryExportModalProps } from "./dmsRegistryExport/types.js";

export function DmsRegistryExportModal(props: DmsRegistryExportModalProps) {
	const { isOpen, onClose, patientId, patientName } = props;
	const state = useDmsRegistryExportState(props);

	if (!isOpen) return null;

	return createPortal(
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div className="dms-modal-card dms-modal-xl" onClick={(e) => e.stopPropagation()}>
				<div className="dms-modal-header">
					<div className="dms-modal-title">
						<FileText size={20} className="text-teal-600" />
						<span>Экспорт реестра ДМС и формирование акта приема-передачи</span>
					</div>
					<button type="button" onClick={onClose} className="dms-modal-close-btn" aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>
				<div className="dms-modal-body">
					<DmsRegistryFiltersSection
						selectedInsurer={state.selectedInsurer} onSelectInsurer={state.setSelectedInsurer}
						periodFilter={state.periodFilter} onSelectPeriod={state.setPeriodFilter}
						searchFilter={state.searchFilter} onSearchChange={state.setSearchFilter}
						patientId={patientId} patientName={patientName}
						scopePatientOnly={state.scopePatientOnly} onToggleScopePatientOnly={state.setScopePatientOnly}
						isLoading={state.isLoading} currentMonthName={state.currentMonthName}
						prevMonthName={state.prevMonthName} prevMonthDate={state.prevMonthDate}
						currentQuarter={state.currentQuarter} now={state.now}
					/>
					<DmsRegistrySummaryCards summary={state.totals} periodDisplay={state.periodDisplay} />
					<DmsRegistryTableSection records={state.filteredRecords} summary={state.totals} isLoading={state.isLoading} />
					<DmsRegistryActParametersSection
						actNumber={state.actNumber} onActNumberChange={state.setActNumber}
						contractNumber={state.contractNumber} onContractNumberChange={state.setContractNumber}
						contractDate={state.contractDate} onContractDateChange={state.setContractDate}
						representative={state.representative} onRepresentativeChange={state.setRepresentative}
						activeClinic={state.effectiveClinic}
					/>
				</div>
				<DmsRegistryModalFooter
					totalRows={state.filteredRecords.length} onClose={onClose}
					onExportCsv={() => handleExportRegistryCsv(state.filteredRecords, state.effectiveClinic, state.selectedInsurer, state.periodDisplay)}
					onExportXml={() => handleExportRegistryXml(state.filteredRecords, state.effectiveClinic, state.selectedInsurer, state.actNumber, state.contractNumber, state.contractDate)}
					onPrintMeeAct={() => handlePrintRegistryMeeAct(state.filteredRecords, state.totals, state.effectiveClinic, state.selectedInsurer, state.contractNumber, state.contractDate, state.representative, state.actNumber, state.actDate)}
					onPrintAct={() => handlePrintRegistryAct(state.filteredRecords, state.totals, state.effectiveClinic, state.selectedInsurer, state.contractNumber, state.contractDate, state.representative, state.actNumber, state.actDate)}
				/>
			</div>
		</div>,
		document.body,
	);
}
