/**
 * useTreatmentPlanCompletedActData.ts — Layer 3: Хук подготовки данных,
 * финансовых расчетов и криптографического хеша (SHA-256) Акта выполненных работ.
 */

import React from "react";
import { BRAND_COLOR_PALETTES, useDocumentBrandingStore } from "../../../store/documentBrandingStore";
import type {
	ActPrintActionBarProps,
	ActPrintFinancialSummaryProps,
	ActPrintHeaderProps,
	ActPrintServicesTableProps,
	ActPrintSignaturesAndLegalProps,
	TreatmentPlanCompletedActPrintProps,
} from "./types";
import { resolveActRequisites } from "./actRequisitesResolver";
import { calculateActFinancials } from "./actFinancialCalculations";
import { useActVerificationHash } from "./actVerificationHash";
import { useVisibleActProcedures } from "./useVisibleActProcedures";

export function useTreatmentPlanCompletedActData(props: TreatmentPlanCompletedActPrintProps) {
	const { isOpen, actData, onClose, onConfirmExecuteWriteOff, isExecuting = false } = props;
	const branding = useDocumentBrandingStore();

	React.useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const [showMicroConsumables, setShowMicroConsumables] = React.useState<boolean>(false);
	const { visibleProcedures, microConsumables } = useVisibleActProcedures(actData.completedProcedures, showMicroConsumables);

	const palette = BRAND_COLOR_PALETTES[branding.brandAccentColor] || BRAND_COLOR_PALETTES.deep_teal;
	const req = resolveActRequisites(props, branding);
	const fin = calculateActFinancials(actData);
	const verificationHash = useActVerificationHash(
		actData,
		fin.netServicesRub,
		fin.netServicesKopecks,
		fin.netMaterialRub,
		fin.netMaterialKopecks,
	);

	const headerProps: ActPrintHeaderProps = {
		actData,
		palette,
		headerStyle: branding.headerStyle,
		showClinicLogo: branding.showClinicLogo,
		logoUrl: branding.logoUrl,
		showClinicRequisites: branding.showClinicRequisites,
		clinicName: branding.clinicName,
		slogan: branding.slogan,
		...req,
	};

	const servicesTableProps: ActPrintServicesTableProps = {
		visibleProcedures,
		microConsumables,
		showMicroConsumables,
		palette,
		grossServicesRub: fin.grossServicesRub,
		discountTotalRub: fin.discountTotalRub,
		netServicesRub: fin.netServicesRub,
		netServicesKopecks: fin.netServicesKopecks,
		servicesInWords: fin.servicesInWords,
	};

	const financialSummaryProps: ActPrintFinancialSummaryProps = {
		netServicesRub: fin.netServicesRub,
		netServicesKopecks: fin.netServicesKopecks,
		netMaterialRub: fin.netMaterialRub,
		netMaterialKopecks: fin.netMaterialKopecks,
		marginRub: actData.marginRub,
		marginPercent: actData.marginPercent,
		palette,
	};

	const signaturesProps: ActPrintSignaturesAndLegalProps = {
		actData,
		palette,
		legalName: req.legalName,
		patientPassport: props.patientPassport,
		showDoctorStampFrame: branding.showDoctorStampFrame,
		showQrVerification: branding.showQrVerification,
		verificationHash,
		customDisclaimer: branding.customDisclaimer,
	};

	const actionBarProps: ActPrintActionBarProps = {
		actData,
		palette,
		hasDeficit: fin.hasDeficit,
		isExecuting,
		showMicroConsumables,
		microConsumablesCount: microConsumables.length,
		onConfirmExecuteWriteOff,
		onToggleMicroConsumables: () => setShowMicroConsumables((prev) => !prev),
		onPrint: () => window.print(),
		onClose,
	};

	return {
		branding,
		palette,
		hasDeficit: fin.hasDeficit,
		netMaterialRub: fin.netMaterialRub,
		netMaterialKopecks: fin.netMaterialKopecks,
		materialsInWords: fin.materialsInWords,
		headerProps,
		servicesTableProps,
		financialSummaryProps,
		signaturesProps,
		actionBarProps,
	};
}
