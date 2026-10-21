import { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import { submitChairData } from "./quickAddChairApi";
import type {
	ChairArchetypePreset,
	QuickAddChairData,
	QuickAddChairModalProps,
} from "./types";

export function useQuickAddChairForm(props: QuickAddChairModalProps) {
	const {
		isOpen,
		onClose,
		existingChairsCount = 0,
		onAddChair,
		initialData,
		onUpdateChair,
	} = props;
	const isEditMode = Boolean(initialData?.id);
	const defaultChairName = isEditMode ? initialData?.name || `Кресло ${existingChairsCount + 1}` : `Кресло ${existingChairsCount + 1}`;
	const defaultRoomName = isEditMode ? initialData?.room || `Кабинет ${existingChairsCount + 1}` : `Кабинет ${existingChairsCount + 1}`;

	const [chairName, setChairName] = useState("");
	const [roomNumber, setRoomNumber] = useState("");
	const [selectedSpecialty, setSelectedSpecialty] = useState<string>("therapist");
	const [selectedColor, setSelectedColor] = useState<string>("#0d9488");
	const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
	const [isActive, setIsActive] = useState<boolean>(true);
	const [branchId, setBranchId] = useState<string>("");
	const [defaultDoctorId, setDefaultDoctorId] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSelectArchetype = (archetype: ChairArchetypePreset) => {
		setSelectedArchetypeId(archetype.id);
		setSelectedSpecialty(archetype.specialty);
		setSelectedColor(archetype.colorHex);
		const chairNumber = existingChairsCount + 1;
		setChairName(`Кресло ${chairNumber}`);
		if (!roomNumber) setRoomNumber(`Кабинет ${chairNumber}`);
		showToast(`Применен архетип «${archetype.label}» (${archetype.colorHex})`, "info", 2500);
	};

	useEffect(() => {
		if (isOpen) {
			setSelectedArchetypeId(null);
			if (initialData) {
				setChairName(initialData.name || "");
				setRoomNumber(initialData.room || "");
				setSelectedSpecialty(initialData.specialization || "therapist");
				setSelectedColor(initialData.color || "#0d9488");
				setIsActive(initialData.isActive !== false);
				setBranchId(initialData.branchId || "");
				setDefaultDoctorId((initialData as any).defaultDoctorId || "");
			} else {
				setChairName("");
				setRoomNumber("");
				setSelectedSpecialty("therapist");
				setSelectedColor("#0d9488");
				setIsActive(true);
				setBranchId("");
				setDefaultDoctorId("");
			}
			setIsSubmitting(false);
		}
	}, [isOpen, initialData]);

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (isSubmitting) return;
		const finalName = chairName.trim() || defaultChairName;
		const finalRoom = roomNumber.trim() || defaultRoomName;

		if (!chairName.trim() && !isEditMode) {
			showToast(`Название не указано. Создано «${finalName}» (${finalRoom})`, "info", 4000);
		}

		setIsSubmitting(true);
		try {
			const payload: QuickAddChairData = {
				...(initialData?.id ? { id: initialData.id } : {}),
				name: finalName,
				room: finalRoom,
				specialization: selectedSpecialty,
				color: selectedColor,
				isActive,
				defaultDoctorId: defaultDoctorId.trim() || null,
				...(branchId ? { branchId } : {}),
			};
			await submitChairData({ isEditMode, finalName, payload, initialData, onUpdateChair, onAddChair, onClose });
			setChairName("");
			setRoomNumber("");
		} catch {
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		isEditMode, defaultChairName, defaultRoomName,
		chairName, setChairName, roomNumber, setRoomNumber,
		selectedSpecialty, setSelectedSpecialty, selectedColor, setSelectedColor,
		selectedArchetypeId, setSelectedArchetypeId, isActive, setIsActive,
		branchId, setBranchId, defaultDoctorId, setDefaultDoctorId,
		isSubmitting, handleSelectArchetype, handleSubmit,
	};
}
