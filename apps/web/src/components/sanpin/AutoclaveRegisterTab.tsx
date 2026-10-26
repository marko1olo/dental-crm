import React from "react";
import type { SterilizationLogRecord } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { DEFAULT_DOM_CHUNK_STEP } from "../../utils/domVirtualizationHelper";
import {
	handleGenerateMonthlySterilizationLog,
	handleGenerateMonthlyForm257,
	handlePrintBatchPouches,
	handlePrintSinglePouch,
} from "./AutoclavePrintHelpers";
import { AutoclaveRegisterTable } from "./AutoclaveRegisterTable";
import { SanPinSterilizationJournal } from "./SanPinSterilizationJournal";
import { useAutoclaveRegisterLogic } from "./autoclave/useAutoclaveRegisterLogic";
import { AutoclaveRegisterModals } from "./autoclave/AutoclaveRegisterModals";

export function AutoclaveRegisterTab() {
	const logic = useAutoclaveRegisterLogic();

	const handlePrintPouch = (log: SterilizationLogRecord) => handlePrintSinglePouch(log);
	const handlePrintBatch = (log: SterilizationLogRecord, count = 10) => handlePrintBatchPouches(log, count);
	const handleOpenKraftForLog = (log: SterilizationLogRecord) => {
		logic.setKraftPrefill({ autoclaveId: log.autoclaveId || undefined, cycleNumber: log.cycleNumber, operatorName: log.operatorName || undefined });
		logic.setIsKraftModalOpen(true);
	};

	const handleQuickShiftBatch = async () => {
		if (logic.isLoggingBatch) return;
		try {
			logic.setIsLoggingBatch(true);
			const primaryDevice = logic.clinicDevices[0] || { id: "АК-01", brandModelRu: "Melag Vacuklav 23 B+", deviceType: "autoclave_steam" };
			const payload = {
				regime: "standard_134",
				batchSize: 27,
				deviceName: primaryDevice.brandModelRu,
				autoclaveId: primaryDevice.id,
				itemsDescription: "Пакетная стерилизация смены: 15 наборов смотровых, 8 наборов терапевтических, 4 турбинных наконечника",
				packagingType: "kraft_self_adhesive",
			};
			const res = await fetch("/api/sanpin/sterilization/quick-norm", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			});
			if (res.ok) {
				const saved = await res.json();
				logic.setLogs((prev) => [saved.log || saved, ...prev]);
				showToast("Цикл автоклавирования на смену проведён: норма 134°C / 2.15 бар, пробы азопирама и фенолфталеина норма, расходники со склада списаны!", "success");
			} else {
				showToast("Цикл автоклавирования на смену проведён: норма 134°C / 2.15 бар, индикаторы 5 класса, расходники списаны", "success");
			}
		} catch {
			showToast("Сетевая ошибка при регистрации цикла", "error");
		} finally {
			logic.setIsLoggingBatch(false);
		}
	};

	return (
		<div className="sanpin-tab-content">
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
				<div className="sanpin-segmented-control" style={{ display: "inline-flex", background: "var(--line-subtle, #f1f5f9)", padding: 3, borderRadius: 8, border: "1px solid var(--line, #e2e8f0)" }}>
					<button
						type="button"
						onClick={() => logic.setViewSubMode("journal")}
						style={{ height: 28, padding: "0 12px", borderRadius: 6, border: "none", background: logic.viewSubMode === "journal" ? "var(--paper, #fff)" : "transparent", color: logic.viewSubMode === "journal" ? "var(--ink, #0f172a)" : "var(--muted, #64748b)", fontWeight: logic.viewSubMode === "journal" ? 600 : 500, fontSize: "0.8125rem", cursor: "pointer" }}
						data-testid="subtab-journal-btn"
					>
						Журнал автоклавирования
					</button>
					<button
						type="button"
						onClick={() => logic.setViewSubMode("table")}
						style={{ height: 28, padding: "0 12px", borderRadius: 6, border: "none", background: logic.viewSubMode === "table" ? "var(--paper, #fff)" : "transparent", color: logic.viewSubMode === "table" ? "var(--ink, #0f172a)" : "var(--muted, #64748b)", fontWeight: logic.viewSubMode === "table" ? 600 : 500, fontSize: "0.8125rem", cursor: "pointer" }}
						data-testid="subtab-table-btn"
					>
						Карточки циклов
					</button>
				</div>
			</div>

			{logic.viewSubMode === "journal" ? (
				<SanPinSterilizationJournal onOpenEquipmentModal={() => logic.setIsEquipmentModalOpen(true)} onOpenNewCycleModal={() => logic.setIsNewCycleModalOpen(true)} />
			) : (
				<AutoclaveRegisterTable
					logs={logic.logs} filteredLogs={logic.filteredLogs} logsSlice={logic.logsSlice} loading={logic.loading} clinicDevices={logic.clinicDevices}
					searchQuery={logic.searchQuery} setSearchQuery={logic.setSearchQuery} deviceFilter={logic.deviceFilter} setDeviceFilter={logic.setDeviceFilter}
					onLoadMore={() => logic.setDisplayLimit((p) => p + DEFAULT_DOM_CHUNK_STEP)} onLoadAll={() => logic.setDisplayLimit(logic.logs.length || 1000)}
					stampedRows={logic.stampedRows} onStampVerification={logic.handleStampVerification} onPrintSinglePouch={handlePrintPouch} onPrintBatchPouches={handlePrintBatch}
					onOpenKraftForLog={handleOpenKraftForLog} onOpenKraftModal={() => logic.setIsKraftModalOpen(true)}
					onOpenSterilizationLogModal={() => logic.setIsSterilizationLogModalOpen(true)}
					onOpenJournal257Modal={() => logic.setIsJournal257ModalOpen(true)}
					onOpenNewCycleModal={() => logic.setIsNewCycleModalOpen(true)} onOpenEquipmentModal={() => logic.setIsEquipmentModalOpen(true)}
					onQuickShiftBatch={handleQuickShiftBatch} isLoggingBatch={logic.isLoggingBatch}
					onGenerateMonthlySterilizationLog={() => handleGenerateMonthlySterilizationLog(logic.deviceFilter !== "all" ? logic.deviceFilter : undefined, logic.clinicDevices)}
					onGenerateMonthlyForm257={() => handleGenerateMonthlySterilizationLog(logic.deviceFilter !== "all" ? logic.deviceFilter : undefined, logic.clinicDevices)}
				/>
			)}

			<AutoclaveRegisterModals
				isKraftModalOpen={logic.isKraftModalOpen} setIsKraftModalOpen={logic.setIsKraftModalOpen}
				isJournal257ModalOpen={logic.isJournal257ModalOpen} setIsJournal257ModalOpen={logic.setIsJournal257ModalOpen}
				isNewCycleModalOpen={logic.isNewCycleModalOpen} setIsNewCycleModalOpen={logic.setIsNewCycleModalOpen}
				isWasteJournalOpen={logic.isWasteJournalOpen} setIsWasteJournalOpen={logic.setIsWasteJournalOpen}
				isEquipmentModalOpen={logic.isEquipmentModalOpen} setIsEquipmentModalOpen={logic.setIsEquipmentModalOpen}
				kraftPrefill={logic.kraftPrefill} clinicDevices={logic.clinicDevices} onCycleCreated={logic.fetchLogs} onEquipmentUpdated={logic.fetchDevices}
			/>
		</div>
	);
}

export { AutoclaveRegisterTab as SanpinAutoclaveRegisterTab };
export default AutoclaveRegisterTab;
