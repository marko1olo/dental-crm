/**
 * PatientMedicalFlagsStep.tsx — Layer 2: Медицинские флаги, срочный приём, анонимность по ПП РФ №659 и соматическая норма.
 *
 * КОНТЕКСТ & МАНДАТ:
 * - ⚡ Срочный приём (Острая боль): мгновенная регистрация без блокировки документами.
 * - Анонимный приём (ПП РФ №659): автогенерация кода без паспорта и СНИЛС.
 * - Соматический статус: 1-клик физиологическая норма (Мандат 8e / 8k снижение трения).
 */

import { Check, EyeOff, ShieldCheck, Zap } from "lucide-react";
import React from "react";
import type { PatientMedicalFlagsStepProps } from "./types";

export function PatientMedicalFlagsStep({
	isEmergencyOrPrimary,
	onToggleEmergency,
	isAnonymous,
	onToggleAnonymous,
	isSomaticNorm,
	onToggleSomaticNorm,
}: PatientMedicalFlagsStepProps) {
	return (
		<>
			{/* Quick Mode: Emergency / Primary Intake without documents */}
			<div
				style={{
					marginBottom: "10px",
					padding: "10px 12px",
					borderRadius: "8px",
					border: isEmergencyOrPrimary
						? "1px solid rgba(244, 63, 94, 0.4)"
						: "1px solid var(--glass-border)",
					backgroundColor: isEmergencyOrPrimary
						? "rgba(244, 63, 94, 0.08)"
						: "var(--glass-panel)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						minWidth: 0,
					}}
				>
					<Zap
						size={18}
						style={{
							flexShrink: 0,
							color: isEmergencyOrPrimary
								? "var(--bad-fg, #f43f5e)"
								: "var(--muted)",
						}}
					/>
					<div style={{ fontSize: "12px" }}>
						<div
							style={{
								fontWeight: "bold",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							⚡ Срочный приём (Острая боль)
							{isEmergencyOrPrimary && (
								<span
									style={{
										fontSize: "10px",
										fontWeight: "bold",
										padding: "1px 6px",
										borderRadius: "4px",
										backgroundColor: "var(--bad-fg, #f43f5e)",
										color: "var(--paper-strong, #ffffff)",
									}}
								>
									АКТИВЕН
								</span>
							)}
						</div>
						<div style={{ fontSize: "11px", color: "var(--muted)" }}>
							{isEmergencyOrPrimary
								? "СНИЛС, паспорт и источник обращения не блокируют запись. Документы можно внести позже."
								: "Быстрое создание карты для экстренного пациента без паспорта и СНИЛС"}
						</div>
					</div>
				</div>
				<button
					type="button"
					style={{
						padding: "6px 12px",
						fontSize: "12px",
						fontWeight: 600,
						borderRadius: "6px",
						cursor: "pointer",
						flexShrink: 0,
						backgroundColor: isEmergencyOrPrimary
							? "var(--bad-fg, #f43f5e)"
							: "var(--paper-strong)",
						color: isEmergencyOrPrimary
							? "var(--paper-strong, #ffffff)"
							: "var(--ink)",
						border: "1px solid var(--glass-border)",
						minHeight: "36px",
					}}
					onClick={onToggleEmergency}
					data-testid="patient-create-emergency-toggle"
				>
					{isEmergencyOrPrimary ? "Отключить" : "Включить"}
				</button>
			</div>

			{/* Decree 659: Anonymous Stealth Mode Toggle */}
			<div
				style={{
					marginBottom: "12px",
					padding: "10px 12px",
					borderRadius: "8px",
					border: isAnonymous
						? "1px solid rgba(245, 158, 11, 0.4)"
						: "1px solid var(--glass-border)",
					backgroundColor: isAnonymous
						? "rgba(245, 158, 11, 0.08)"
						: "var(--glass-panel)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						minWidth: 0,
					}}
				>
					<EyeOff
						size={18}
						style={{
							flexShrink: 0,
							color: isAnonymous
								? "var(--warning-fg, #f59e0b)"
								: "var(--muted)",
						}}
					/>
					<div style={{ fontSize: "12px" }}>
						<div
							style={{
								fontWeight: "bold",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							Анонимный приём (ПП РФ №659)
							{isAnonymous && (
								<span
									style={{
										fontSize: "10px",
										fontWeight: "bold",
										padding: "1px 6px",
										borderRadius: "4px",
										backgroundColor: "var(--warning-fg, #b45309)",
										color: "var(--paper-strong, #ffffff)",
									}}
								>
									АКТИВЕН
								</span>
							)}
						</div>
						<div style={{ fontSize: "11px", color: "var(--muted)" }}>
							{isAnonymous
								? "Паспорт и СНИЛС не требуются. Оплата только коммерческая (ОМС запрещён законом)."
								: "Режим создания карты без паспорта с фиксацией со слов пациента"}
						</div>
					</div>
				</div>
				<button
					type="button"
					style={{
						padding: "6px 12px",
						fontSize: "12px",
						fontWeight: 600,
						borderRadius: "6px",
						cursor: "pointer",
						flexShrink: 0,
						backgroundColor: isAnonymous
							? "var(--warning-fg, #b45309)"
							: "var(--paper-strong)",
						color: isAnonymous ? "var(--paper-strong, #ffffff)" : "var(--ink)",
						border: "1px solid var(--glass-border)",
						minHeight: "36px",
					}}
					onClick={onToggleAnonymous}
				>
					{isAnonymous ? "Отключить" : "Включить"}
				</button>
			</div>

			{/* 1-Click Somatic Physiological Norm Fast Action (Mandate 8e) */}
			<div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
				<div
					className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
						isSomaticNorm
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
							: "bg-[var(--paper-soft)] border-[var(--glass-border)] text-[var(--muted)]"
					}`}
					data-testid="patient-creation-somatic-norm-banner"
				>
					<div className="flex items-center gap-2 min-w-0">
						<ShieldCheck
							size={16}
							className={
								isSomaticNorm
									? "text-emerald-600 shrink-0"
									: "text-[var(--muted)] shrink-0"
							}
						/>
						<div className="text-xs font-medium truncate min-w-0">
							<span className="font-bold">Соматический статус:</span>{" "}
							{isSomaticNorm
								? "Физиологическая норма по умолчанию (соматически здоров)"
								: "Требуется ручное заполнение анкеты"}
						</div>
					</div>
					<button
						type="button"
						onClick={onToggleSomaticNorm}
						data-testid="btn-somatic-healthy-norm"
						className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
							isSomaticNorm
								? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
								: "bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] border border-[var(--glass-border)] shadow-2xs"
						}`}
						title="Заполнить нормой (соматически здоров)"
					>
						<Check size={13} className="shrink-0" />
						<span>{isSomaticNorm ? "Норма" : "Применить норму"}</span>
					</button>
				</div>
			</div>
		</>
	);
}
