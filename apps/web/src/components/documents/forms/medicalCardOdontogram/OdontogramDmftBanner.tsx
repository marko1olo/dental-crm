import type React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { FdiToothRecord } from "@dental/shared";
import {
	createIntactOdontogramRecords,
	createSanitizedOdontogramRecords,
	createWisdomExtractedOdontogramRecords,
} from "../../../../lib/clinicalProtocols043";

export interface OdontogramDmftBannerProps {
	readonly dmftResult: {
		decayed: number;
		filled: number;
		missing: number;
		dmftTotal: number;
		intensityLevelLabel: string;
	};
	readonly effectiveDisabled: boolean;
	readonly setOdontogram: React.Dispatch<
		React.SetStateAction<Record<number, FdiToothRecord>>
	>;
}

export const OdontogramDmftBanner: React.FC<OdontogramDmftBannerProps> = ({
	dmftResult,
	effectiveDisabled,
	setOdontogram,
}) => {
	return (
		<div className="flex flex-col gap-2 mb-3">
			<div className="alert alert-info py-2 px-3 m-0 rounded-lg text-sm flex items-center justify-between flex-wrap gap-2">
				<div>
					<strong>Индекс интенсивности кариеса (КПУ): </strong>
					<span>
						К = {dmftResult.decayed}, П = {dmftResult.filled}, У = {dmftResult.missing} |{" "}
						<strong>КПУ(з) = {dmftResult.dmftTotal}</strong> ({dmftResult.intensityLevelLabel})
					</span>
				</div>
			</div>

			<div
				className="odontogram-1click-presets flex items-center gap-2 flex-wrap p-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,rgba(0,0,0,0.02))]"
				data-testid="odontogram-1click-presets-bar"
			>
				<span className="font-semibold text-xs inline-flex items-center gap-1">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					Пресеты формулы:
				</span>
				<button
					type="button"
					data-testid="btn-043-teeth-all-healthy-1click"
					className="btn btn-sm btn-outline-success inline-flex items-center gap-1 text-xs"
					onClick={() => setOdontogram(createIntactOdontogramRecords())}
					disabled={effectiveDisabled}
					title="Все зубы здоровы / интактны (Норма) — КПУ = 0"
				>
					<CheckCircle2 className="w-3.5 h-3.5" />
					Все здоровы (Норма)
				</button>
				<button
					type="button"
					data-testid="btn-043-teeth-sanitized-1click"
					className="btn btn-sm btn-outline-secondary text-xs"
					onClick={() => setOdontogram(createSanitizedOdontogramRecords())}
					disabled={effectiveDisabled}
					title="Санирован (моляры удовлетворительно пломбированы)"
				>
					Санирован
				</button>
				<button
					type="button"
					data-testid="btn-043-teeth-no-wisdom-1click"
					className="btn btn-sm btn-outline-secondary text-xs"
					onClick={() => setOdontogram(createWisdomExtractedOdontogramRecords())}
					disabled={effectiveDisabled}
					title="Зубы мудрости (18, 28, 38, 48) отсутствуют / удалены"
				>
					Без зубов мудрости (8-ки)
				</button>
			</div>
		</div>
	);
};
