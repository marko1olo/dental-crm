import { AlertTriangle, ShieldAlert } from "lucide-react";
import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
} from "../anesthesiaCatalog";
import { AllergyBannerItem } from "./AllergyBannerItem";

export interface AnesthesiaAllergyAlertBannersProps {
	isCardioRisk: boolean;
	takesBetaBlockers?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	hasLidocaineAllergy?: boolean | undefined;
	hasArticaineAllergy?: boolean | undefined;
	selectedDrugId: AnestheticDrugId;
	selectedDrugInfo: AnestheticDrugInfo;
	onSelectDrug: (drugId: AnestheticDrugId) => void;
}

export function AnesthesiaAllergyAlertBanners({
	isCardioRisk,
	takesBetaBlockers,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasLidocaineAllergy = false,
	hasArticaineAllergy = false,
	selectedDrugId,
	selectedDrugInfo,
	onSelectDrug,
}: AnesthesiaAllergyAlertBannersProps) {
	const onSelectScandonest = () => onSelectDrug("mepivacaine_plain");
	const isLidoSelected =
		selectedDrugId === "lidocaine_1_100k" ||
		selectedDrugId === "lidocaine_plain";
	const isArticaineSelected =
		selectedDrugId === "articaine_1_100k" ||
		selectedDrugId === "articaine_1_200k" ||
		selectedDrugId === "septanest_1_100k";
	const isCardio100kSelected =
		(isCardioRisk || takesBetaBlockers) &&
		(selectedDrugId === "articaine_1_100k" ||
			selectedDrugId === "septanest_1_100k" ||
			selectedDrugId === "lidocaine_1_100k");
	const isSulfiteRisk =
		(hasSulfiteAllergy || hasBronchialAsthma) &&
		!selectedDrugInfo.isAdrenalineFree;

	return (
		<>
			{hasLidocaineAllergy && isLidoSelected && (
				<AllergyBannerItem
					variant="rose"
					testId="anesthesia-lidocaine-allergy-warning-badge"
					buttonTestId="btn-switch-to-scandonest-safe"
					buttonTitle="Переключиться на Мепивакаин 3% (Скандонест без адреналина)"
					Icon={ShieldAlert}
					onSwitchToScandonest={onSelectScandonest}
				>
					<strong>Внимание! Аллергия на Лидокаин!</strong> Высокий риск
					анафилаксии. Рекомендован{" "}
					<strong>Мепивакаин 3% (Скандонест) без адреналина</strong>.
				</AllergyBannerItem>
			)}
			{hasArticaineAllergy && isArticaineSelected && (
				<AllergyBannerItem
					variant="rose"
					testId="anesthesia-articaine-allergy-warning-badge"
					buttonTestId="btn-switch-to-mepivacaine-articaine-safe"
					buttonTitle="Переключиться на Мепивакаин 3% (Скандонест)"
					Icon={ShieldAlert}
					onSwitchToScandonest={onSelectScandonest}
				>
					<strong>Внимание! Аллергия на Артикаин!</strong> Риск анафилаксии.
					Рекомендован{" "}
					<strong>Мепивакаин 3% (Скандонест) без адреналина</strong>.
				</AllergyBannerItem>
			)}
			{isCardio100kSelected && (
				<AllergyBannerItem
					variant="amber"
					testId="anesthesia-cardio-100k-warning-badge"
					buttonTestId="btn-switch-to-mepivacaine"
					buttonTitle="Переключиться на Мепивакаин 3% (Скандонест без адреналина)"
					Icon={AlertTriangle}
					onSwitchToScandonest={onSelectScandonest}
				>
					<strong>Внимание, кардио-риск!</strong> Адреналин 1:100 000.
					Рекомендован Скандонест (Мепивакаин 3% без адреналина). Решение
					принимает лечащий врач.
				</AllergyBannerItem>
			)}
			{isSulfiteRisk && (
				<AllergyBannerItem
					variant="rose"
					testId="anesthesia-sulfite-allergy-warning-badge"
					buttonTestId="btn-switch-to-mepivacaine-sulfite-safe"
					buttonTitle="Переключиться на Мепивакаин 3% (Скандонест без адреналина)"
					Icon={ShieldAlert}
					onSwitchToScandonest={onSelectScandonest}
				>
					<strong>Внимание! Аллергия на сульфиты (E223) / астма.</strong> В
					растворах с адреналином содержится метабисульфит. Рекомендован{" "}
					<strong>Мепивакаин 3% без адреналина</strong>.
				</AllergyBannerItem>
			)}
		</>
	);
}
