/**
 * apps/web/src/components/visit/anamnesisTab/useAnamnesisAllergies.ts
 *
 * Хук реактивного управления аллергологическим статусом пациента.
 * Обеспечивает контроль критических аллергий на анестетики и медикаменты.
 */

import { useCallback, useMemo, useState } from "react";
import { DENTAL_ALLERGENS } from "./types";

export function useAnamnesisAllergies(initialAllergies: Record<string, string> = {}) {
	const [selectedAllergies, setSelectedAllergies] = useState<Record<string, string>>(initialAllergies);

	const toggleAllergen = useCallback((name: string) => {
		setSelectedAllergies((prev) => {
			const next = { ...prev };
			if (next[name]) {
				delete next[name];
			} else {
				next[name] = "Крапивница / кожный зуд";
			}
			return next;
		});
	}, []);

	const setAllergyReaction = useCallback((allergenName: string, reaction: string) => {
		setSelectedAllergies((prev) => ({
			...prev,
			[allergenName]: reaction,
		}));
	}, []);

	const hasCriticalAllergies = useMemo(() => {
		const keys = Object.keys(selectedAllergies);
		return keys.some((k) =>
			DENTAL_ALLERGENS.some((item) => item.name === k && item.isCritical),
		);
	}, [selectedAllergies]);

	const selectedAllergyCount = useMemo(() => {
		return Object.keys(selectedAllergies).length;
	}, [selectedAllergies]);

	return {
		selectedAllergies,
		setSelectedAllergies,
		toggleAllergen,
		setAllergyReaction,
		hasCriticalAllergies,
		selectedAllergyCount,
	};
}
