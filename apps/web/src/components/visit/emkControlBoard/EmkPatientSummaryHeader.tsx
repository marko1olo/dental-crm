import React from "react";
import { Clock, User } from "lucide-react";
import { formatShortDate } from "../../../AppHelpers";
import { getCompletenessColor } from "./constants";

export interface EmkPatientSummaryHeaderProps {
	readonly patientFullName: string;
	readonly patientCardCode: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly visitDateIso: string;
	readonly chairName: string;
	readonly diagnosisTooth?: string | null;
	readonly allergies?: readonly string[] | null;
	readonly completenessScore?: number;
}

export function EmkPatientSummaryHeader({
	patientFullName,
	patientCardCode,
	doctorFullName,
	doctorSpecialty,
	visitDateIso,
	chairName,
	diagnosisTooth,
	allergies,
	completenessScore,
}: EmkPatientSummaryHeaderProps) {
	const scoreColor =
		typeof completenessScore === "number"
			? getCompletenessColor(completenessScore)
			: "var(--teal, #0d9488)";

	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: "12px",
			}}
		>
			<div style={{ flex: "1 1 320px" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						marginBottom: "4px",
						flexWrap: "wrap",
					}}
				>
					<span
						style={{
							fontSize: "15px",
							fontWeight: 700,
							color: "var(--ink, #0f172a)",
						}}
					>
						{patientFullName}
					</span>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 600,
							padding: "2px 6px",
							borderRadius: "4px",
							background: "var(--paper-strong, #f1f5f9)",
							color: "var(--ink-2, #64748b)",
						}}
					>
						{patientCardCode}
					</span>
					{diagnosisTooth && (
						<span
							style={{
								fontSize: "11px",
								fontWeight: 700,
								padding: "2px 6px",
								borderRadius: "4px",
								background: "rgba(13, 148, 136, 0.12)",
								color: "var(--teal, #0d9488)",
							}}
						>
							Зуб {diagnosisTooth}
						</span>
					)}
					{allergies && allergies.length > 0 && (
						<span
							style={{
								fontSize: "11px",
								fontWeight: 700,
								padding: "2px 6px",
								borderRadius: "4px",
								background: "rgba(239, 68, 68, 0.12)",
								color: "var(--bad, #ef4444)",
							}}
						>
							Аллергия: {allergies.join(", ")}
						</span>
					)}
				</div>

				<div
					style={{
						fontSize: "12px",
						color: "var(--ink-2, #64748b)",
						display: "flex",
						alignItems: "center",
						gap: "12px",
						flexWrap: "wrap",
					}}
				>
					<span
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<User size={13} /> {doctorFullName} ({doctorSpecialty})
					</span>
					<span
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Clock size={13} /> {formatShortDate(visitDateIso)} | {chairName}
					</span>
				</div>
			</div>

			{typeof completenessScore === "number" && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						padding: "6px 12px",
						borderRadius: "8px",
						background: "var(--paper-strong, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div
						style={{
							fontSize: "16px",
							fontWeight: 800,
							color: scoreColor,
						}}
					>
						{completenessScore}%
					</div>
					<div
						style={{ fontSize: "10px", color: "var(--ink-2, #64748b)" }}
					>
						Полнота карты
					</div>
				</div>
			)}
		</div>
	);
}
