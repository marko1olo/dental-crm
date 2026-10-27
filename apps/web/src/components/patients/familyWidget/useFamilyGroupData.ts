import { useCallback, useEffect, useState } from "react";
import { logger } from "../../../utils/logger";
import type { FamilyGroupData } from "./familyWidgetTypes";

export function useFamilyGroupData(patientId?: string | null) {
	const [familyData, setFamilyData] = useState<FamilyGroupData | null>(null);
	const [isLoadingFamily, setIsLoadingFamily] = useState(false);

	const loadFamily = useCallback(() => {
		if (!patientId) {
			setFamilyData(null);
			return;
		}
		setIsLoadingFamily(true);
		fetch(`/api/finance/family/patient/${patientId}`)
			.then(async (res) => {
				if (res.ok) {
					const data = await res.json();
					setFamilyData(data);
				} else {
					setFamilyData(null);
				}
			})
			.catch((err) => {
				logger.warn("Не удалось загрузить данные семейного счёта:", err);
				setFamilyData(null);
			})
			.finally(() => {
				setIsLoadingFamily(false);
			});
	}, [patientId]);

	useEffect(() => {
		loadFamily();
	}, [loadFamily]);

	return { familyData, isLoadingFamily, loadFamily };
}
