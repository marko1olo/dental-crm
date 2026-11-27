/**
 * CashFlowModal.tsx — Модальное окно кассовых операций (Внесение наличных в кассу / Инкассация / Выемка).
 * Полностью декомпозирован согласно Мандату 8b (<= 120 строк).
 */

import React from "react";
import { createPortal } from "react-dom";
import {
	CashFlowCatalogPresets,
	CashFlowFormInputs,
	CashFlowModalFooter,
	CashFlowModalHeader,
	type CashFlowModalProps,
	CashFlowModeTabs,
	useCashFlowLogic,
} from "./cashFlowModalModules";

export type { CashFlowModalProps };

export const CashFlowModal: React.FC<CashFlowModalProps> = (props) => {
	const { isOpen, onClose, cashInDrawerRub = 0 } = props;
	const {
		cashFlowMode,
		setCashFlowMode,
		selectedTypeAlias,
		setSelectedTypeAlias,
		cashFlowAmount,
		setCashFlowAmount,
		cashFlowBasis,
		setCashFlowBasis,
		cashFlowPerson,
		setCashFlowPerson,
		cashBoxes,
		fromCashBoxId,
		setFromCashBoxId,
		toCashBoxId,
		setToCashBoxId,
		isProcessing,
		handleSelectReceiptPreset,
		handleSelectExpensePreset,
		handleSubmit,
	} = useCashFlowLogic(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(15,23,42,0.52)] backdrop-blur-xs"
			data-testid="cash-flow-modal"
			role="dialog"
			aria-modal="true"
		>
			<div className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
				<CashFlowModalHeader cashFlowMode={cashFlowMode} onClose={onClose} />

				<div className="p-6 overflow-y-auto flex-1 space-y-4">
					<CashFlowModeTabs
						cashFlowMode={cashFlowMode}
						onSelectMode={(mode) => {
							setCashFlowMode(mode);
							if (mode === "transfer") {
								setCashFlowBasis("Межкассовое перемещение средств");
							} else {
								setSelectedTypeAlias(
									mode === "cash_in" ? "cash_deposit" : "collection",
								);
								setCashFlowBasis(
									mode === "cash_in"
										? "Внесение разменной монеты"
										: "Инкассация выручки в банк",
								);
							}
						}}
					/>

					<CashFlowCatalogPresets
						cashFlowMode={cashFlowMode}
						selectedTypeAlias={selectedTypeAlias}
						onSelectReceiptPreset={handleSelectReceiptPreset}
						onSelectExpensePreset={handleSelectExpensePreset}
					/>

					<CashFlowFormInputs
						cashFlowMode={cashFlowMode}
						cashFlowAmount={cashFlowAmount}
						setCashFlowAmount={setCashFlowAmount}
						cashInDrawerRub={cashInDrawerRub}
						cashFlowBasis={cashFlowBasis}
						setCashFlowBasis={setCashFlowBasis}
						cashFlowPerson={cashFlowPerson}
						setCashFlowPerson={setCashFlowPerson}
						cashBoxes={cashBoxes}
						fromCashBoxId={fromCashBoxId}
						setFromCashBoxId={setFromCashBoxId}
						toCashBoxId={toCashBoxId}
						setToCashBoxId={setToCashBoxId}
					/>
				</div>

				<CashFlowModalFooter
					cashFlowMode={cashFlowMode}
					isProcessing={isProcessing}
					onClose={onClose}
					onSubmit={handleSubmit}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
