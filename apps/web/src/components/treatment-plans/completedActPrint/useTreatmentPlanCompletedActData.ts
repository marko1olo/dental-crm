/**
 * useTreatmentPlanCompletedActData.ts — Layer 3: Хук подготовки данных,
 * финансовых расчетов и криптографического хеша (SHA-256) Акта выполненных работ.
 */

import { type Kopecks, rublesToKopecks, sha256Hex } from "@dental/shared";
import React, { useEffect, useMemo, useState } from "react";
import {
	BRAND_COLOR_PALETTES,
	useDocumentBrandingStore,
} from "../../../store/documentBrandingStore";
import { isMicroConsumable } from "../TreatmentPlanPresenterModal";
import {
	formatMoneyExact,
	numberToWordsRu,
} from "../treatmentPlanActFormatters";
import type {
	ActPrintActionBarProps,
	ActPrintFinancialSummaryProps,
	ActPrintHeaderProps,
	ActPrintServicesTableProps,
	ActPrintSignaturesAndLegalProps,
	TreatmentPlanCompletedActPrintProps,
} from "./types";

export function useTreatmentPlanCompletedActData(
	props: TreatmentPlanCompletedActPrintProps,
) {
	const {
		isOpen,
		actData,
		clinicLegalName,
		clinicInn,
		clinicOgrn,
		clinicKpp,
		clinicAddress,
		clinicLicense,
		clinicPhone,
		clinicWebsite,
		clinicEmail,
		patientPassport,
		patientBirthDate,
		patientGender,
		patientPhone,
		patientAddress,
		patientSnils,
		patientOmsPolis,
		patientMedicalCardNumber,
		doctorSpecialty,
		doctorSnils,
		contractDate,
		onClose,
		onConfirmExecuteWriteOff,
		isExecuting = false,
	} = props;

	const branding = useDocumentBrandingStore();

	React.useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const [showMicroConsumables, setShowMicroConsumables] =
		React.useState<boolean>(false);

	const { visibleProcedures, microConsumables } = React.useMemo(() => {
		const regular = actData.completedProcedures.filter(
			(it) => !isMicroConsumable(it),
		);
		const micro = actData.completedProcedures.filter((it) =>
			isMicroConsumable(it),
		);
		return {
			visibleProcedures: showMicroConsumables
				? actData.completedProcedures
				: regular,
			microConsumables: micro,
		};
	}, [actData.completedProcedures, showMicroConsumables]);

	const palette =
		BRAND_COLOR_PALETTES[branding.brandAccentColor] ||
		BRAND_COLOR_PALETTES.deep_teal;

	// Legal Clinic Requisites
	const legalName =
		clinicLegalName || branding.clinicLegalName || "Стоматологическая клиника";
	const inn = clinicInn || branding.clinicInn || "";
	const kpp = clinicKpp || "";
	const ogrn = clinicOgrn || branding.clinicOgrn || "";
	const address = clinicAddress || branding.clinicAddress || "";
	const license = clinicLicense || branding.licenseNumber || "";
	const phone = clinicPhone || branding.clinicPhone || "";
	const website = clinicWebsite || branding.clinicWebsite || "";
	const email = clinicEmail || "";

	// Patient Requisites
	const patientDob = patientBirthDate || "____________";
	const patientGenderText = patientGender
		? patientGender === "female"
			? "Женский"
			: "Мужской"
		: "—";
	const patientPass =
		patientPassport ||
		"Паспорт РФ: серия _____ № _______, выдан ____________________, дата: __________, код: ________";
	const patientRegAddress =
		patientAddress ||
		"________________________________________________________";
	const patientContactPhone = patientPhone || "____________________";
	const patientSnilsVal = patientSnils || "—";
	const patientOmsVal = patientOmsPolis || "—";
	const patientMedCard =
		patientMedicalCardNumber ||
		(actData.patientId.replace(/\D/g, "")
			? `МК-${actData.patientId.replace(/\D/g, "")}`
			: "б/н");

	// Doctor Requisites
	const doctorSpec = doctorSpecialty || "Врач-стоматолог";
	const doctorSnilsVal = doctorSnils || "—";

	// Contract Date
	const contractDateFormatted =
		contractDate ||
		(actData.createdAtIso
			? new Date(actData.createdAtIso).toLocaleDateString("ru-RU")
			: actData.actDate);

	// Calculated totals with exact kopecks
	const grossServicesRub = actData.completedProcedures.reduce(
		(acc, it) => acc + it.unitPriceRub * it.quantity,
		0,
	);
	const discountTotalRub = actData.completedProcedures.reduce(
		(acc, it) => acc + (it.discountRub || 0),
		0,
	);
	const netServicesRub = actData.totalServiceRub;
	const netServicesKopecks =
		actData.totalServiceKopecks || (rublesToKopecks(netServicesRub) as Kopecks);

	const netMaterialRub = actData.totalMaterialCostRub;
	const netMaterialKopecks =
		actData.totalMaterialCostKopecks ||
		(rublesToKopecks(netMaterialRub) as Kopecks);

	const servicesInWords = numberToWordsRu(
		netServicesRub,
		netServicesKopecks ? netServicesKopecks % 100 : 0,
	);
	const materialsInWords = numberToWordsRu(
		netMaterialRub,
		netMaterialKopecks ? netMaterialKopecks % 100 : 0,
	);

	const hasDeficit = actData.writtenOffMaterials.some((m) => m.isDeficit);

	// Canonical representation of completed act body for cryptographic verification
	const canonicalActPayload = useMemo(() => {
		return JSON.stringify({
			actNumber: actData.actNumber,
			actDate: actData.actDate,
			contractNumber: actData.contractNumber,
			patientId: actData.patientId,
			patientName: actData.patientName,
			doctorFullName: actData.doctorFullName,
			stageNumber: actData.stageNumber,
			stageTitle: actData.stageTitle,
			totalServiceRub: netServicesRub,
			totalServiceKopecks: netServicesKopecks,
			totalMaterialCostRub: netMaterialRub,
			totalMaterialCostKopecks: netMaterialKopecks,
			completedProcedures: actData.completedProcedures.map((p) => ({
				id: p.id,
				procedureName: p.name,
				code804n: p.code804n,
				toothNumber: p.toothNumber,
				quantity: p.quantity,
				unitPriceRub: p.unitPriceRub,
				discountRub: p.discountRub,
				totalRub: p.priceRub,
			})),
			writtenOffMaterials: actData.writtenOffMaterials.map((m) => ({
				id: m.id,
				materialName: m.materialName,
				order804nCode: m.order804nCode,
				quantityRequired: m.quantityRequired,
				unitCostRub: m.unitCostRub,
				totalCostRub: m.totalCostRub,
			})),
		});
	}, [
		actData,
		netServicesRub,
		netServicesKopecks,
		netMaterialRub,
		netMaterialKopecks,
	]);

	// Cryptographic verification hash (SHA-256 compliant with GOST R 7.0.97-2016)
	const [verificationHash, setVerificationHash] = useState<string>(() => {
		return `SHA-256: ${sha256Hex(canonicalActPayload)}`;
	});

	useEffect(() => {
		let isCancelled = false;
		async function updateHashWithWebCrypto() {
			try {
				if (typeof window !== "undefined" && window.crypto?.subtle?.digest) {
					const encoder = new TextEncoder();
					const data = encoder.encode(canonicalActPayload);
					const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
					const hashArray = Array.from(new Uint8Array(hashBuffer));
					const hex = hashArray
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
					if (!isCancelled) {
						setVerificationHash(`SHA-256: ${hex}`);
					}
					return;
				}
			} catch (e) {
				console.warn(
					"[TreatmentPlanCompletedActPrint] Web Crypto API calculation failed, using fallback:",
					e,
				);
			}
			if (!isCancelled) {
				setVerificationHash(`SHA-256: ${sha256Hex(canonicalActPayload)}`);
			}
		}
		updateHashWithWebCrypto();
		return () => {
			isCancelled = true;
		};
	}, [canonicalActPayload]);

	const handlePrint = () => {
		window.print();
	};

	const headerProps: ActPrintHeaderProps = {
		actData,
		palette,
		headerStyle: branding.headerStyle,
		showClinicLogo: branding.showClinicLogo,
		logoUrl: branding.logoUrl,
		showClinicRequisites: branding.showClinicRequisites,
		clinicName: branding.clinicName,
		slogan: branding.slogan,
		legalName,
		inn,
		kpp,
		ogrn,
		address,
		license,
		phone,
		website,
		email,
		patientDob,
		patientGenderText,
		patientPass,
		patientRegAddress,
		patientContactPhone,
		patientSnilsVal,
		patientOmsVal,
		patientMedCard,
		doctorSpec,
		doctorSnilsVal,
		contractDateFormatted,
	};

	const servicesTableProps: ActPrintServicesTableProps = {
		visibleProcedures,
		microConsumables,
		showMicroConsumables,
		palette,
		grossServicesRub,
		discountTotalRub,
		netServicesRub,
		netServicesKopecks,
		servicesInWords,
	};

	const financialSummaryProps: ActPrintFinancialSummaryProps = {
		netServicesRub,
		netServicesKopecks,
		netMaterialRub,
		netMaterialKopecks,
		marginRub: actData.marginRub,
		marginPercent: actData.marginPercent,
		palette,
	};

	const signaturesProps: ActPrintSignaturesAndLegalProps = {
		actData,
		palette,
		legalName,
		patientPassport,
		showDoctorStampFrame: branding.showDoctorStampFrame,
		showQrVerification: branding.showQrVerification,
		verificationHash,
		customDisclaimer: branding.customDisclaimer,
	};

	const actionBarProps: ActPrintActionBarProps = {
		actData,
		palette,
		hasDeficit,
		isExecuting,
		showMicroConsumables,
		microConsumablesCount: microConsumables.length,
		onConfirmExecuteWriteOff,
		onToggleMicroConsumables: () => setShowMicroConsumables((prev) => !prev),
		onPrint: handlePrint,
		onClose,
	};

	return {
		branding,
		palette,
		hasDeficit,
		netMaterialRub,
		netMaterialKopecks,
		materialsInWords,
		headerProps,
		servicesTableProps,
		financialSummaryProps,
		signaturesProps,
		actionBarProps,
	};
}
