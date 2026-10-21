/**
 * CashFlowModal.tsx — Модальное окно кассовых операций (Внесение наличных в кассу / Инкассация / Выемка).
 * Полностью декомпозирован согласно Мандату 8b (<= 120 строк).
 */

import type React from "react";
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
		isProcessing,
		handleSelectReceiptPreset,
		handleSelectExpensePreset,
		handleSubmit,
	} = useCashFlowLogic(props);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
			data-testid="cash-flow-modal"
			role="dialog"
			aria-modal="true"
		>
			<div className="bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,rgba(0,0,0,0.1))] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
				<CashFlowModalHeader cashFlowMode={cashFlowMode} onClose={onClose} />

				<div className="p-6 overflow-y-auto flex-1 space-y-5">
					<CashFlowModeTabs
						cashFlowMode={cashFlowMode}
						onSelectMode={(mode) => {
							setCashFlowMode(mode);
							setSelectedTypeAlias(
								mode === "cash_in" ? "cash_deposit" : "collection",
							);
							setCashFlowBasis(
								mode === "cash_in"
									? "Внесение разменной монеты"
									: "Инкассация выручки в банк",
							);
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
};
