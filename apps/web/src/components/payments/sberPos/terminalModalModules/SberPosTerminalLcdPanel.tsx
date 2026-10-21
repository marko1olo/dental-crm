import { Ban, RefreshCw } from "lucide-react";
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
	].includes(status);

	return (
		<div className="flex flex-col gap-4">
			<SberPosLcdDisplay {...props} />

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => onStartOperation(operation)}
					disabled={status === "connecting" || status === "authorizing"}
					className="min-h-[44px] px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
				>
					<RefreshCw className="w-3.5 h-3.5" />
					<span>Повторить запрос (Retry)</span>
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
