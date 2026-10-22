import React, { useState } from "react";
import { type BactericidalDeviceType, type CreateBactericidalEquipmentDto } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";

export function useNewEquipmentForm({
	onSuccess,
}: {
	onSuccess: () => void;
}) {
	const [newRoomName, setNewRoomName] = useState("Кабинет терапевтической стоматологии №1");
	const [newRoomVolume, setNewRoomVolume] = useState<number>(45.0);
	const [newDeviceBrand, setNewDeviceBrand] = useState("Дезар-4 (ОРУБн-3-3-«КРОНТ»)");
	const [newSerialNumber, setNewSerialNumber] = useState("DZ-004812");
	const [newDeviceType, setNewDeviceType] = useState<BactericidalDeviceType>("recirculator_closed");
	const [newMaxHours, setNewMaxHours] = useState<number>(8000);
	const [submitting, setSubmitting] = useState(false);

	const handleAddEquipment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const payload: CreateBactericidalEquipmentDto = {
				roomName: newRoomName,
				roomVolumeM3: Number(newRoomVolume),
				deviceBrand: newDeviceBrand,
				serialNumber: newSerialNumber,
				deviceType: newDeviceType,
				maxLampHours: Number(newMaxHours),
			};
			const res = await fetch("/api/registers/bactericidal/equipments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});
			if (res.ok) {
				showToast("Облучатель/рециркулятор успешно поставлен на учет", "success");
				onSuccess();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при регистрации прибора", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return {
		newRoomName, setNewRoomName,
		newRoomVolume, setNewRoomVolume,
		newDeviceBrand, setNewDeviceBrand,
		newSerialNumber, setNewSerialNumber,
		newDeviceType, setNewDeviceType,
		newMaxHours, setNewMaxHours,
		handleAddEquipment,
		isSubmitting: submitting,
	};
}
