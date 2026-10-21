import { useEffect, useState } from "react";
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
import { useDocumentBrandingStore } from "../../../../store/documentBrandingStore";
import { logger } from "../../../../utils/logger";
import type { ClinicRequisites } from "./presenterLauncherTypes";

export const DEFAULT_CLINIC_REQUISITES: ClinicRequisites = {
	clinicName: "Стоматологическая клиника",
	clinicLegalName: "",
	clinicInn: "",
	clinicOgrn: "",
	clinicAddress: "",
	clinicPhone: "",
	clinicLicense: "",
};

export function useClinicRequisitesLoader(isOpen: boolean): ClinicRequisites {
	const [requisites, setRequisites] = useState<ClinicRequisites>(
		DEFAULT_CLINIC_REQUISITES,
	);

	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;

		async function fetchRequisites() {
			try {
				const profRes = await fetch("/api/settings/clinic-profile", {
					headers: getDenteAuthHeaders(),
				});
				if (profRes.ok) {
					const p = await profRes.json();
					if (isMounted) {
						setRequisites({
							clinicName:
								p.clinicName || p.legalName || "Стоматологическая клиника",
							clinicLegalName: p.legalName || p.clinicName || "",
							clinicInn: p.inn || "",
							clinicOgrn: p.ogrn || "",
							clinicAddress: p.address || "",
							clinicPhone: p.phone || "",
							clinicLicense: p.medicalLicenseNumber || "",
						});
					}
					return;
				}
				const clinicRes = await fetch("/api/settings/clinic", {
					headers: getDenteAuthHeaders(),
				});
				if (clinicRes.ok) {
					const s = await clinicRes.json();
					const p = s.profile || {};
					if (isMounted) {
						setRequisites({
							clinicName:
								p.clinicName || p.legalName || "Стоматологическая клиника",
							clinicLegalName: p.legalName || p.clinicName || "",
							clinicInn: p.inn || "",
							clinicOgrn: p.ogrn || "",
							clinicAddress: p.address || "",
							clinicPhone: p.phone || "",
							clinicLicense: p.medicalLicenseNumber || "",
						});
					}
					return;
				}
			} catch (err) {
				logger.warn("Не удалось загрузить реквизиты клиники из настроек:", err);
			}

			const branding = useDocumentBrandingStore.getState();
			if (isMounted) {
				setRequisites({
					clinicName: branding.clinicName || "Стоматологическая клиника",
					clinicLegalName: branding.clinicLegalName || "",
					clinicInn: branding.clinicInn || "",
					clinicOgrn: branding.clinicOgrn || "",
					clinicAddress: branding.clinicAddress || "",
					clinicPhone: branding.clinicPhone || "",
					clinicLicense: branding.licenseNumber || "",
				});
			}
		}

		void fetchRequisites();
		return () => {
			isMounted = false;
		};
	}, [isOpen]);

	return requisites;
}
