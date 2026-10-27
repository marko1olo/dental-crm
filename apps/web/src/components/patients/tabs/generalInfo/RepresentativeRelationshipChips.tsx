import React from "react";
import { Users } from "lucide-react";
import { REPRESENTATIVE_RELATIONSHIP_CATALOG } from "./constants";
import type { PatientGeneralInfo } from "./types";

interface RepresentativeRelationshipChipsProps {
	patient?: PatientGeneralInfo | null | undefined;
	disabled?: boolean;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
}

export const RepresentativeRelationshipChips: React.FC<RepresentativeRelationshipChipsProps> = ({
	patient,
	disabled = false,
	onUpdatePatient,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<Users className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
					<span className="font-bold text-xs text-[var(--ink)]">
						Статус представителя / Член семьи:
					</span>
				</div>
				{patient?.representativeType && (
					<span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--teal)]">
						{patient.representativeType}
					</span>
				)}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap py-1 min-w-0">
				{REPRESENTATIVE_RELATIONSHIP_CATALOG.map((rep) => {
					const isSelected =
						patient?.representativeType === rep.nameRu ||
						patient?.representativeType === rep.code;
					return (
						<button
							key={rep.code}
							type="button"
							data-testid={`chip-representative-${rep.code}`}
							className={`min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap select-none ${
								isSelected
									? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
									: "border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]"
							}`}
							style={{
								height: "28px",
								padding: "0 10px",
								borderRadius: "8px",
								border: isSelected
									? "1px solid var(--teal)"
									: "1px solid var(--line-strong, var(--line))",
								background: isSelected ? "var(--teal)" : "var(--paper-soft)",
								color: isSelected ? "var(--on-teal, #ffffff)" : "var(--ink)",
							}}
							onClick={() => {
								if (disabled) return;
								onUpdatePatient?.("representativeType", isSelected ? "" : rep.nameRu);
							}}
							disabled={disabled}
							title={
								rep.isLegalRepresentative
									? `${rep.nameRu}: Законный представитель ребёнка (Право подписи согласий)`
									: `${rep.nameRu}: Член семьи (Для подписи согласий требуется доверенность)`
							}
						>
							<span>{rep.nameRu}</span>
							{rep.isLegalRepresentative && (
								<span
									className={`px-1 py-0.2 rounded text-[9px] font-bold ${
										isSelected
											? "bg-white/20 text-white"
											: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
									}`}
								>
									согласие
								</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
};
