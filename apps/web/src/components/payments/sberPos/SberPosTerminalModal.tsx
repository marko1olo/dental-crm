import React from "react";
import { AlertCircle } from "lucide-react";
import { buildPilotNtCommandPacket } from "@dental/shared";
import {
	type SberPosTerminalModalProps,
	useSberPosTerminalLogic,
	SberPosTerminalHeader,
	SberPosTerminalSettingsPanel,
	SberPosTerminalOperationsBar,
	SberPosTerminalLcdPanel,
	SberPosTerminalSlipPanel,
} from "./terminalModalModules/index.js";

if (typeof window !== "undefined") {
	void import("./sberPos.css");
}

export type { SberPosTerminalModalProps };

export const SberPosTerminalModal: React.FC<SberPosTerminalModalProps> = (props) => {
	const {
		isOpen, onClose, totalBillKop = 0, patientName = "Пациент", orderId = "",
		onSelectAlternativeMethod,
	} = props;

	const ctrl = useSberPosTerminalLogic(props);

	if (!isOpen) return null;

	const pilotCommandText = buildPilotNtCommandPacket(ctrl.config, {
		operation: ctrl.operation, amountKop: totalBillKop, orderId,
		originalRrn: ctrl.originalRrnInput, originalAuthCode: ctrl.originalAuthInput,
	});

	return (
		<div className="sber-pos-modal-overlay" data-testid="sber-pos-terminal-modal">
			<div className="sber-pos-modal-container">
				<SberPosTerminalHeader
					patientName={patientName} orderId={orderId} totalBillKop={totalBillKop}
					isConfigured={ctrl.isConfigured} isSettingsOpen={ctrl.isSettingsOpen}
					onToggleSettings={() => ctrl.setIsSettingsOpen(!ctrl.isSettingsOpen)} onClose={onClose}
				/>

				{ctrl.isSettingsOpen && (
					<SberPosTerminalSettingsPanel
						config={ctrl.config} setConfig={ctrl.setConfig} setSavedConfig={ctrl.setSavedConfig}
					/>
				)}

				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{!ctrl.isConfigured && (
						<div
							className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
							data-testid="sber-pos-unconfigured-notice"
						>
							<div className="flex items-start gap-2.5">
								<AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
								<div>
									<p className="font-bold text-sm">Терминал Сбербанк POS не настроен</p>
									<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
										В промышленном контуре клиники необходимо указать IP-адрес драйвера Pilot-NT, порт (по умолч. 4000) и TID эквайринга.
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => ctrl.setIsSettingsOpen(true)}
								className="min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 transition-colors cursor-pointer"
							>
								Настроить параметры
							</button>
						</div>
					)}

					<SberPosTerminalOperationsBar
						operation={ctrl.operation} status={ctrl.status}
						onStartOperation={ctrl.handleStartOperation}
						originalRrnInput={ctrl.originalRrnInput} setOriginalRrnInput={ctrl.setOriginalRrnInput}
						originalAuthInput={ctrl.originalAuthInput} setOriginalAuthInput={ctrl.setOriginalAuthInput}
					/>

					<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
						<div className="lg:col-span-7">
							<SberPosTerminalLcdPanel
								activeModelName={ctrl.activeProfile?.modelName || "SBER-POS"}
								terminalId={ctrl.config.terminalId} isConfigured={ctrl.isConfigured}
								timerSeconds={ctrl.timerSeconds} status={ctrl.status} statusMessage={ctrl.statusMessage}
								totalBillKop={totalBillKop} operation={ctrl.operation} pilotCommandText={pilotCommandText}
								onStartOperation={ctrl.handleStartOperation} onCancelOperation={ctrl.handleCancelOperation}
								onSelectAlternativeMethod={onSelectAlternativeMethod} onClose={onClose}
							/>
						</div>
						<div className="lg:col-span-5">
							<SberPosTerminalSlipPanel lastResponse={ctrl.lastResponse} />
						</div>
					</div>
				</div>

				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Банковский терминал • Безналичная оплата
					</div>
					<button
						type="button"
						onClick={onClose}
						className="secondary-button min-h-[44px] h-11 px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
					>
						<span>Закрыть</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default SberPosTerminalModal;
