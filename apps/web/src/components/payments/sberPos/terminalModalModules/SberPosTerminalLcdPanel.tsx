import { Ban, RefreshCw, Send } from "lucide-react";
import type React from "react";
import {
	SberPosAlternativePaymentOptions,
	type SberPosAlternativePaymentOptionsProps,
} from "./SberPosAlternativePaymentOptions";
import {
	SberPosLcdDisplay,
	type SberPosLcdDisplayProps,
} from "./SberPosLcdDisplay";

export type SberPosTerminalLcdPanelProps = SberPosLcdDisplayProps &
	SberPosAlternativePaymentOptionsProps & {
		readonly onCancelOperation: () => void;
	};

export const SberPosTerminalLcdPanel: React.FC<SberPosTerminalLcdPanelProps> = (
	props,
) => {
	const { status, operation, onStartOperation, onCancelOperation } = props;

	const isExecuting = [
		"card_wait",
		"processing_card",
		"pin_entry",
		"biometry_scan",
		"qr_displayed",
		"connecting",
		"authorizing",
	].includes(status);

	const isFailed = [
		"pin_timeout",
		"card_declined",
		"communication_error",
		"user_cancelled",
	].includes(status);

	return (
		<div className="flex flex-col gap-4">
			<SberPosLcdDisplay {...props} />

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => onStartOperation(operation)}
					className="min-h-[44px] px-4 rounded-xl border border-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,#f0fdfa)] hover:bg-[var(--teal-soft,#f0fdfa)]/80 text-xs font-bold text-[var(--teal,#0d9488)] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
				>
					{isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
					<span>{isExecuting ? "Запрос выполняется..." : "Отправить сумму на терминал"}</span>
				</button>
				{isExecuting && (
					<button
						type="button"
						onClick={onCancelOperation}
						className="min-h-[44px] px-4 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
					>
						<Ban className="w-3.5 h-3.5" />
						<span>Отменить операцию</span>
					</button>
				)}
			</div>

			{isFailed && (
				<SberPosAlternativePaymentOptions
					onStartOperation={props.onStartOperation}
					onSelectAlternativeMethod={props.onSelectAlternativeMethod}
					onClose={props.onClose}
				/>
			)}
		</div>
	);
};
