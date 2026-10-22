/**
 * PrescriptionDocumentFooter.tsx — Signatures and Stamps for Prescription Blank
 * Decomposed module <= 120 lines (Mandate 8b).
 */

import type React from "react";
import type { PrescriptionFormType } from "./prescriptionPreviewTypes";
import { PrescriptionStampsRow } from "./PrescriptionStampsRow";

export interface PrescriptionDocumentFooterProps {
	readonly activeForm: PrescriptionFormType;
	readonly validityDays: string;
	readonly isChronicSpecialCare: boolean;
	readonly chronicPeriodicity: string;
	readonly withStampAndSignature: boolean;
	readonly docName: string;
}

function formatDoctorHandwrittenInitials(fullName: string): string {
	const cleaned = fullName.replace(/^(Д-р|Доктор|Врач)\s+/i, "").trim();
	if (!cleaned) return "";
	const parts = cleaned.split(/\s+/);
	const surname = parts[0] ?? "";
	const firstInitial = parts[1]?.[0] ? `${parts[1][0]}.` : "";
	return [surname, firstInitial].filter(Boolean).join(" ");
}

export const PrescriptionDocumentFooter: React.FC<
	PrescriptionDocumentFooterProps
> = ({
	activeForm,
	validityDays,
	isChronicSpecialCare,
	chronicPeriodicity,
	withStampAndSignature,
	docName,
}) => {
	const isSpecial = activeForm === "special" || activeForm === "148-1u-88";

	return (
		<div className="border-t-2 border-[var(--line)] pt-2 text-[10px] flex flex-col gap-2 text-[var(--ink)]">
			<div className="flex justify-between items-end">
				<div className="flex flex-col gap-1 text-[var(--ink)]">
					<div>
						Срок действия рецепта:{" "}
						<u>
							<strong className="text-[var(--ink)]">
								{isSpecial
									? "15 дней (учетный)"
									: validityDays === "365"
										? "До 1 года (По специальному назначению)"
										: `${validityDays} дней`}
							</strong>
						</u>
					</div>
					{isChronicSpecialCare && (
						<div className="text-[9px] font-bold text-teal-700 dark:text-teal-400">
							По специальному назначению ({chronicPeriodicity})
						</div>
					)}
					<div className="mt-1 relative text-[var(--ink)] flex flex-wrap items-baseline gap-x-1">
						<span>Подпись врача:</span>
						<span className="relative inline-block min-w-[96px] text-center">
							{withStampAndSignature && (
								<span
									className="absolute -top-3 left-2 text-blue-700 dark:text-blue-400 font-serif italic text-sm select-none pointer-events-none whitespace-nowrap"
									style={{
										fontFamily:
											"'Brush Script MT', 'Segoe Script', cursive, serif",
										transform: "rotate(-3deg)",
									}}
								>
									{formatDoctorHandwrittenInitials(docName)}
								</span>
							)}
							____________________
						</span>
						<span>/ {docName}</span>
					</div>
					{isSpecial && (
						<div className="text-[var(--ink)]">
							Подпись зав. отделением: ____________________
						</div>
					)}
				</div>

				<PrescriptionStampsRow
					withStampAndSignature={withStampAndSignature}
					activeForm={activeForm}
				/>
			</div>
		</div>
	);
};
