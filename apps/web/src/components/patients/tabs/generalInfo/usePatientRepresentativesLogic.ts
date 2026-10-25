import { useEffect, useMemo, useState } from "react";
import { REPRESENTATIVE_RELATIONSHIP_CATALOG } from "./constants";
import type { PatientGeneralInfo } from "./types";

export interface FamilyRelationshipItem {
	id: string;
	relatedPatientName: string;
	relationshipLabelRu?: string;
	relatedPatientPhone?: string;
	documentProofNumber?: string;
}

export function usePatientRepresentativesLogic(patient?: PatientGeneralInfo | null) {
	const [familyRelationships, setFamilyRelationships] = useState<FamilyRelationshipItem[]>([]);

	useEffect(() => {
		if (!patient?.id) {
			setFamilyRelationships([]);
			return;
		}
		let cancelled = false;
		fetch(`/api/patients/${patient.id}/relationships`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!cancelled && Array.isArray(data?.relationships)) {
					setFamilyRelationships(data.relationships);
				}
			})
			.catch(() => {
				// silent fallback
			});
		return () => {
			cancelled = true;
		};
	}, [patient?.id]);

	const isMinorChild = useMemo(() => {
		if (!patient?.birthDate) return false;
		const birth = new Date(patient.birthDate);
		if (Number.isNaN(birth.getTime())) return false;
		const today = new Date();
		let age = today.getFullYear() - birth.getFullYear();
		const m = today.getMonth() - birth.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
			age--;
		}
		return age < 15;
	}, [patient?.birthDate]);

	const selectedRep = useMemo(() => {
		if (!patient?.representativeType) return null;
		return (
			REPRESENTATIVE_RELATIONSHIP_CATALOG.find(
				(r) => r.nameRu === patient.representativeType || r.code === patient.representativeType,
			) ?? null
		);
	}, [patient?.representativeType]);

	return {
		familyRelationships,
		isMinorChild,
		selectedRep,
	};
}
