import type React from "react";
import { createPortal } from "react-dom";
import { PricelistManagerDialogContainer } from "./PricelistManagerDialogContainer";
import type { ServicePricelistManagerModalProps } from "./ServicePricelistManagerModalProps";
import { CANONICAL_SERVICE_PRESETS } from "./servicePricelistPresets";
import { useServicePricelistManager } from "./useServicePricelistManager";

export type { ServicePricelistManagerModalProps };

export const ServicePricelistManagerModal: React.FC<
	ServicePricelistManagerModalProps
> = (props) => {
	const {
		isOpen,
		onClose,
		initialItems = CANONICAL_SERVICE_PRESETS,
		onSaveCatalog,
		clinicName = "Стоматологическая клиника «DENTE»",
		clinicAddress = "г. Москва, ул. Медицинская, д. 12",
		clinicPhone = "",
		clinicLicense = "ЛО-77-01-012345 от 12.04.2021",
		chiefDoctorName = "Петров А. В.",
		adminSecret,
	} = props;
	const mgr = useServicePricelistManager(initialItems, onSaveCatalog, isOpen);

	if (!isOpen) return null;
	const clinicMeta = {
		clinicName,
		clinicAddress,
		clinicPhone,
		clinicLicense,
		chiefDoctorName,
	};

	const modalContent = (
		<PricelistManagerDialogContainer
			mgr={mgr}
			clinicMeta={clinicMeta}
			adminSecret={adminSecret}
			onSaveCatalog={onSaveCatalog}
			onClose={onClose}
		/>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
