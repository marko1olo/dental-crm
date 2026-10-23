import React, { useEffect, useState } from "react";
import {
	type LegalRepresentativeData,
	type PediatricSomaticAndLegalRepProps,
	type PediatricSomaticStatus,
	DEFAULT_LEGAL_REPRESENTATIVE,
	DEFAULT_PEDIATRIC_SOMATIC_NORM,
	formatPediatricRepresentativeText,
} from "./somatic/pediatricSomaticTypes";
import { PediatricLegalRepresentativeSection } from "./somatic/PediatricLegalRepresentativeSection";
import { PediatricSomaticNormSection } from "./somatic/PediatricSomaticNormSection";

export * from "./somatic/pediatricSomaticTypes";

export const PediatricSomaticAndLegalRep: React.FC<PediatricSomaticAndLegalRepProps> = ({
	initialSomatic,
	onSomaticChange,
	initialRepresentative,
	defaultRepresentativeFullName = "",
	defaultRepresentativePhone = "",
	defaultRepresentativeRole,
	onRepresentativeChange,
	patientAge,
	className = "",
}) => {
	const [somaticStatus, setSomaticStatus] = useState<PediatricSomaticStatus>({
		...DEFAULT_PEDIATRIC_SOMATIC_NORM,
		...initialSomatic,
	});

	useEffect(() => {
		const formatted = somaticStatus.isNormal
			? somaticStatus.summaryRu
			: `${somaticStatus.summaryRu}. Аллергии: ${somaticStatus.allergiesRu}. Соматика: ${somaticStatus.chronicDiseasesRu}.`;
		onSomaticChange?.(somaticStatus, formatted);
	}, [somaticStatus, onSomaticChange]);

	const [representative, setRepresentative] = useState<LegalRepresentativeData>(() => ({
		...DEFAULT_LEGAL_REPRESENTATIVE,
		...initialRepresentative,
		fullName: initialRepresentative?.fullName || defaultRepresentativeFullName,
		phone: initialRepresentative?.phone || defaultRepresentativePhone,
		role: (initialRepresentative?.role || defaultRepresentativeRole || "Мать") as any,
	}));

	useEffect(() => {
		const formatted = formatPediatricRepresentativeText(representative, patientAge);
		onRepresentativeChange?.(representative, formatted);
	}, [representative, patientAge, onRepresentativeChange]);

	return (
		<div
			className={`pediatric-somatic-legal-rep rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3 sm:p-4 space-y-3 ${className}`.trim()}
			data-testid="pediatric-somatic-legal-rep"
		>
			<PediatricSomaticNormSection somaticStatus={somaticStatus} setSomaticStatus={setSomaticStatus} />
			<PediatricLegalRepresentativeSection representative={representative} setRepresentative={setRepresentative} patientAge={patientAge} />
		</div>
	);
};

export default PediatricSomaticAndLegalRep;
