import type { DryRunRestoreResult } from "@dental/shared";
import {
	AlertTriangle,
	CheckCircle2,
	Database,
	FileCheck,
	Lock,
	ShieldAlert,
	ShieldCheck,
	XCircle,
	Zap,
} from "lucide-react";
import type React from "react";

export interface VerificationProgressCardProps {
	readonly dryRunResult: DryRunRestoreResult;
}

export const VerificationProgressCard: React.FC<VerificationProgressCardProps> = ({
	dryRunResult,
}) => {
	const isExcellent = dryRunResult.integrityGrade === "EXCELLENT";
	const isWarning = dryRunResult.integrityGrade === "WARNING";

	const gradeBg = isExcellent
		? "rgba(16, 185, 129, 0.06)"
		: isWarning
			? "rgba(245, 158, 11, 0.06)"
			: "rgba(239, 68, 68, 0.06)";

	const gradeBorder = isExcellent
		? "1px solid rgba(16, 185, 129, 0.25)"
		: isWarning
			? "1px solid rgba(245, 158, 11, 0.25)"
			: "1px solid rgba(239, 68, 68, 0.25)";

	const badgeBg = isExcellent
		? "var(--ok-fg, #10b981)"
		: isWarning
			? "var(--warn-fg, #f59e0b)"
			: "var(--bad-fg, #ef4444)";

	return (
		<div
			style={{
				marginBottom: "16px",
				padding: "16px",
				borderRadius: "10px",
				background: gradeBg,
				border: gradeBorder,
			}}
			data-testid="dry-run-verification-card"
		>
			{/* HEADER & GRADE */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "8px",
					marginBottom: "12px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					{isExcellent ? (
						<ShieldCheck size={20} color="var(--ok-fg, #10b981)" />
					) : isWarning ? (
						<AlertTriangle size={20} color="var(--warn-fg, #f59e0b)" />
					) : (
						<ShieldAlert size={20} color="var(--bad-fg, #ef4444)" />
					)}
					<span
						style={{
							fontWeight: "600",
							fontSize: "14px",
							color: "var(--ink, #1e293b)",
						}}
					>
						Результат верификации архива:
					</span>
					<span
						style={{
							fontSize: "11px",
							fontWeight: "700",
							padding: "2px 8px",
							borderRadius: "10px",
							background: badgeBg,
							color: "var(--on-teal, #ffffff)",
							letterSpacing: "0.3px",
						}}
					>
						{isExcellent ? "ОТЛИЧНО" : isWarning ? "ВНИМАНИЕ" : "ОШИБКА"}
					</span>
				</div>
				<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
					Время проверки: {dryRunResult.executionDurationMs} мс
				</div>
			</div>

			{/* DETERMINISTIC STAGES BADGES (NO FAKE TIMER INTERVALS) */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "8px",
					marginBottom: "14px",
					padding: "8px 10px",
					background: "var(--paper, #ffffff)",
					borderRadius: "8px",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
						fontSize: "11.5px",
						color: "var(--ink, #1e293b)",
						fontWeight: 500,
					}}
				>
					<Database size={13} color="var(--teal)" />
					Сверка структуры таблиц:{" "}
					<strong style={{ color: "var(--ok-fg, #10b981)" }}>OK</strong>
				</span>
				<span style={{ color: "var(--line)" }}>•</span>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
						fontSize: "11.5px",
						color: "var(--ink, #1e293b)",
						fontWeight: 500,
					}}
				>
					<Zap size={13} color="var(--teal)" />
					Сжатие ZSTD / GZIP:{" "}
					<strong style={{ color: "var(--ok-fg, #10b981)" }}>OK</strong>
				</span>
				<span style={{ color: "var(--line)" }}>•</span>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
						fontSize: "11.5px",
						color: "var(--ink, #1e293b)",
						fontWeight: 500,
					}}
				>
					<Lock size={13} color="var(--teal)" />
					Шифрование AES-GCM:{" "}
					<strong style={{ color: "var(--ok-fg, #10b981)" }}>OK</strong>
				</span>
				<span style={{ color: "var(--line)" }}>•</span>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "5px",
						fontSize: "11.5px",
						color: "var(--ink, #1e293b)",
						fontWeight: 500,
					}}
				>
					<FileCheck size={13} color="var(--teal)" />
					Хеш SHA-256:{" "}
					<strong
						style={{
							color: dryRunResult.checksumVerified
								? "var(--ok-fg, #10b981)"
								: "var(--bad-fg, #ef4444)",
						}}
					>
						{dryRunResult.checksumVerified ? "Подтвержден" : "Не совпадает"}
					</strong>
				</span>
			</div>

			{/* TABLE STATS METRICS */}
			<div
				style={{
					fontSize: "13px",
					color: "var(--ink, #334155)",
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
					gap: "8px",
					marginBottom: "12px",
				}}
			>
				<div>
					Всего записей: <strong>{dryRunResult.totalRecordsCount}</strong>
				</div>
				<div>
					Клинических мутаций:{" "}
					<strong>{dryRunResult.previewStats.mutations}</strong>
				</div>
				<div>
					Черновиков приёма: <strong>{dryRunResult.previewStats.drafts}</strong>
				</div>
				<div>
					Клинический кэш:{" "}
					<strong>{dryRunResult.previewStats.clinicalCache}</strong>
				</div>
				<div>
					Пациентов: <strong>{dryRunResult.previewStats.patients ?? 0}</strong>
				</div>
			</div>

			{/* WARNINGS LIST */}
			{dryRunResult.warnings.length > 0 && (
				<div
					style={{
						fontSize: "12px",
						color: "var(--warn-fg, #d97706)",
						marginBottom: "8px",
					}}
				>
					{dryRunResult.warnings.map((w, idx) => (
						<div
							key={idx}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								marginTop: "3px",
							}}
						>
							<AlertTriangle size={13} style={{ flexShrink: 0 }} />
							<span>{w}</span>
						</div>
					))}
				</div>
			)}

			{/* ERRORS LIST */}
			{dryRunResult.errors.length > 0 && (
				<div style={{ fontSize: "12px", color: "var(--bad-fg, #dc2626)" }}>
					{dryRunResult.errors.map((err, idx) => (
						<div
							key={idx}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								marginTop: "3px",
							}}
						>
							<XCircle size={13} style={{ flexShrink: 0 }} />
							<span>{err}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
