import { useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { LOYALTY_CONFIG, type LoyaltyTier } from "./loyaltyConfig";

export function usePatientLoyalty(patientId: string) {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const [isOpen, setIsOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	const adminProfile = (patient?.administrativeProfile as any) || {};
	const currentTier: LoyaltyTier =
		adminProfile.loyaltyTier === "silver" ||
		adminProfile.loyaltyTier === "gold" ||
		adminProfile.loyaltyTier === "platinum" ||
		adminProfile.loyaltyTier === "standard"
			? adminProfile.loyaltyTier
			: "standard";
	const currentLoyalty = LOYALTY_CONFIG[currentTier];

	const handleSetTier = async (tier: LoyaltyTier) => {
		setIsOpen(false);
		if (tier === currentTier) return;
		setSaving(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/administrative-profile`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ ...adminProfile, loyaltyTier: tier }),
			});
			if (!res.ok) throw new Error("Failed to save loyalty tier");

			const saved = await res.json().catch((err: any) => {
				logger.error(err);
				showToast(actionFailureToast("Ошибка чтения ответа", (err as { status?: number })?.status ?? null), "error");
				return null;
			});
			const savedTier = saved?.administrativeProfile?.loyaltyTier ?? null;
			if (savedTier !== tier) {
				showToast(
					`Статус «${LOYALTY_CONFIG[tier].label}» не сохранён: программа пока не хранит это поле, и в карточке останется «${currentLoyalty.label}». Скидку назначьте вручную при оплате.`,
					"error",
				);
				await loadDashboard();
				return;
			}
			showToast("Статус лояльности обновлен", "success");
			await loadDashboard();
		} catch (_err) {
			showToast("Ошибка при сохранении", "error");
		} finally {
			setSaving(false);
		}
	};

	return { patient, isOpen, setIsOpen, saving, currentTier, currentLoyalty, handleSetTier };
}
