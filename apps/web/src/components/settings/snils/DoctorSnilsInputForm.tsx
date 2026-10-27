import { CheckCircle2, RefreshCw } from "lucide-react";
import type React from "react";

interface DoctorSnilsInputFormProps {
	readonly snils: string;
	readonly setSnils: (val: string) => void;
	readonly isValidating: boolean;
	readonly onValidate: () => void;
}

export const DoctorSnilsInputForm: React.FC<DoctorSnilsInputFormProps> = ({
	snils,
	setSnils,
	isValidating,
	onValidate,
}) => {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<label
					htmlFor="doctor-snils-input"
					className="text-xs font-semibold text-[var(--ink)]"
				>
					СНИЛС врача (реестр медработников ФРМР)
				</label>
				<span className="text-[11px] text-[var(--muted)]">
					Опционально · сохранение доступно всегда
				</span>
			</div>

			<div className="flex items-center gap-2">
				<input
					id="doctor-snils-input"
					type="text"
					value={snils}
					onChange={(e) => setSnils(e.target.value)}
					placeholder="000-000-000 00"
					className="flex-1 text-xs px-2.5 py-1.5 h-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-colors"
				/>
				<button
					type="button"
					onClick={onValidate}
					className="secondary-button shrink-0 h-9 min-h-[36px] px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer shadow-xs inline-flex items-center gap-1.5"
					data-testid="doctor-snils-validate-btn"
				>
					{isValidating ? (
						<RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--teal)]" />
					) : (
						<CheckCircle2 className="w-3.5 h-3.5 text-[var(--teal)]" />
					)}
					<span>{isValidating ? "Проверка..." : "Проверить"}</span>
				</button>
			</div>
		</div>
	);
};
