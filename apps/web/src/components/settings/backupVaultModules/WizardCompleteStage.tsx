import { CheckCircle2 } from "lucide-react";
import type React from "react";
import type { RestoreBackupResult } from "../../../services/offline/offlineBackupService";

export interface WizardCompleteStageProps {
	readonly restoreResult: RestoreBackupResult;
	readonly onComplete: () => void;
}

export const WizardCompleteStage: React.FC<WizardCompleteStageProps> = ({
	restoreResult,
	onComplete,
}) => {
	return (
		<div>
			<div
				style={{
					padding: "16px",
					borderRadius: "8px",
					background: "rgba(16, 185, 129, 0.08)",
					border: "1px solid rgba(16, 185, 129, 0.25)",
					marginBottom: "16px",
					textAlign: "center",
				}}
			>
				<CheckCircle2
					size={36}
					color="var(--ok-fg, #10b981)"
					style={{ margin: "0 auto 8px" }}
				/>
				<h5
					style={{
						margin: "0 0 4px",
						fontSize: "15px",
						fontWeight: 600,
						color: "var(--ink)",
					}}
				>
					База данных успешно восстановлена
				</h5>
				<p
					style={{
						margin: 0,
						fontSize: "12.5px",
						color: "var(--muted)",
					}}
				>
					Восстановлено: {restoreResult.restoredCount.mutations} мутаций,{" "}
					{restoreResult.restoredCount.patients} пациентов,{" "}
					{restoreResult.restoredCount.schedules} записей расписания.
				</p>
			</div>

			<div style={{ display: "flex", justifyContent: "flex-end" }}>
				<button
					type="button"
					onClick={onComplete}
					style={{
						minHeight: "36px",
						padding: "0 18px",
						borderRadius: "8px",
						background: "var(--teal)",
						color: "#ffffff",
						border: "none",
						fontWeight: 600,
						fontSize: "13px",
						cursor: "pointer",
					}}
				>
					Завершить работу визарда
				</button>
			</div>
		</div>
	);
};
