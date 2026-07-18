import { useCallback, useEffect, useState } from "react";
import { type ToothStatus, usePatientStore } from "../../store/patientStore";

export function useOdontogramLogic() {
	const {
		odontogramState,
		setToothStatus,
		loadOdontogram,
		saveToothStatus,
		selectedPatientId,
	} = usePatientStore();

	useEffect(() => {
		if (selectedPatientId) {
			void loadOdontogram(selectedPatientId);
		}
	}, [selectedPatientId, loadOdontogram]);

	const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
	const [radialMenuOpen, setRadialMenuOpen] = useState<number | null>(null);
	const [multiSelectMode, setMultiSelectMode] = useState(false);
	const [selectedTeeth, setSelectedTeeth] = useState<Set<number>>(new Set());
	const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

	const toggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) => {
			const next = new Set(prev);
			next.has(tooth) ? next.delete(tooth) : next.add(tooth);
			return next;
		});
	}, []);

	const handleToothClick = useCallback(
		(tooth: number, shiftKey: boolean) => {
			if (multiSelectMode || shiftKey) {
				toggleTooth(tooth);
				setBulkMenuOpen(false);
				return;
			}
			setRadialMenuOpen((prev) => (prev === tooth ? null : tooth));
		},
		[multiSelectMode, toggleTooth],
	);

	const applyBulkStatus = useCallback(
		(status: ToothStatus) => {
			if (selectedPatientId && selectedTeeth.size > 0) {
				void saveToothStatus(
					selectedPatientId,
					Array.from(selectedTeeth),
					status,
				);
			} else {
				selectedTeeth.forEach((t) => setToothStatus(t, status));
			}
			setSelectedTeeth(new Set());
			setBulkMenuOpen(false);
			setMultiSelectMode(false);
		},
		[selectedTeeth, setToothStatus, saveToothStatus, selectedPatientId],
	);

	return {
		odontogramState,
		selectedPatientId,
		setToothStatus,
		saveToothStatus,
		hoveredTooth,
		setHoveredTooth,
		radialMenuOpen,
		setRadialMenuOpen,
		multiSelectMode,
		setMultiSelectMode,
		selectedTeeth,
		setSelectedTeeth,
		bulkMenuOpen,
		setBulkMenuOpen,
		handleToothClick,
		applyBulkStatus,
	};
}
