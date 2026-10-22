import { useState } from "react";
import { POPULAR_STERILIZER_BRAND_PRESETS, type SterilizerEquipment } from "@dental/shared";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { loadSavedClinicAutoclaves } from "../autoclave/autoclaveDeviceTypes";

export function useRetroactiveSterilizers() {
	const [sterilizerModel, setSterilizerModel] = useState("Melag Vacuklav 23B+ (B-класс)");
	const [availableSterilizers, setAvailableSterilizers] = useState<Array<{ id: string; label: string; modelName: string }>>([]);
	const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);

	const fetchSterilizers = async () => {
		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/sterilizers/equipments", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			}).catch(() => null);

			if (res && res.ok) {
				const data: SterilizerEquipment[] = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					const activeList = data.filter((d) => d.status === "active");
					const mapped = (activeList.length > 0 ? activeList : data).map((d) => ({
						id: d.id,
						label: `${d.name} (${d.chamberVolumeLiters} л, Зав. №${d.serialNumber})`,
						modelName: d.brandModel || d.name,
					}));
					setAvailableSterilizers(mapped);
					if (mapped[0]) setSterilizerModel(mapped[0].modelName);
					return;
				}
			}
		} catch (err) {
			console.error("Failed to load sterilizers for batch tab", err);
		}

		const localDevs = loadSavedClinicAutoclaves();
		if (localDevs.length > 0) {
			const mapped = localDevs.map((d) => ({
				id: d.id,
				label: `${d.brandModelRu} (${d.chamberVolumeLiters} л, Зав. №${d.serialNumber})`,
				modelName: d.brandModelRu,
			}));
			setAvailableSterilizers(mapped);
			if (mapped[0]) setSterilizerModel(mapped[0].modelName);
		} else {
			const mapped = POPULAR_STERILIZER_BRAND_PRESETS.map((p) => ({
				id: p.id,
				label: `${p.brandModel} (${p.chamberVolumeLiters} л — ${p.descriptionRu})`,
				modelName: `${p.brandModel} (${p.deviceClass === "autoclave_class_b" ? "B-класс" : "Сухожар"})`,
			}));
			setAvailableSterilizers(mapped);
			if (mapped[0]) setSterilizerModel(mapped[0].modelName);
		}
	};

	return {
		sterilizerModel, setSterilizerModel,
		availableSterilizers, isEquipmentModalOpen,
		setIsEquipmentModalOpen, fetchSterilizers,
	};
}
