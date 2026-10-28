import { useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { FDI_TOOTH_NAMES } from "../radiologyMath";
import type { RadiologyStudy } from "../types";
import type { HotFolderItem } from "../hotFolderTypes";
import { useVisitStore } from "../../../store/visitStore";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export interface UseHotFolderEmrDispatcherProps {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientCardNumber: string;
	readonly doctorName: string;
	readonly activeItem: HotFolderItem | null;
	readonly selectedTeeth: string[];
	readonly protocolNote: string;
	readonly clinicalPurpose: string;
	readonly onAttachToEmr?: ((payload: {
		study: RadiologyStudy;
		teethFdi: string[];
		protocolNote: string;
		clinicalPurpose: string;
		doseMicrosv: number;
	}) => void) | undefined;
	readonly setHotFolderItems: React.Dispatch<React.SetStateAction<HotFolderItem[]>>;
}

export function useHotFolderEmrDispatcher({
	patientId,
	patientName,
	patientCardNumber,
	doctorName,
	activeItem,
	selectedTeeth,
	protocolNote,
	clinicalPurpose,
	onAttachToEmr,
	setHotFolderItems,
}: UseHotFolderEmrDispatcherProps) {
	const handleAttachToEmr = useCallback(() => {
		if (!activeItem) return;

		const doseMicrosv = activeItem.detectedModality === "optg_panoramic" ? 13.0 : 2.5;
		const singleTooth = selectedTeeth.length === 1 && selectedTeeth[0] ? selectedTeeth[0] : null;
		const singleToothName = singleTooth ? FDI_TOOTH_NAMES[singleTooth] ?? "" : "";
		const anatomicalArea = singleTooth
			? `Зуб ${singleTooth} (${singleToothName})`
			: `Зубы: ${selectedTeeth.join(", ")}`;

		const study: RadiologyStudy = {
			id: `study-${Date.now()}`,
			patientId,
			patientName,
			medicalCardNumber: patientCardNumber,
			studyDate: new Date().toISOString().slice(0, 16).replace("T", " "),
			studyType:
				activeItem.detectedModality === "optg_panoramic"
					? "optg_digital_panoramic"
					: "intraoral_radiovisiography",
			modality: activeItem.detectedModality,
			modalityLabel: activeItem.modalityLabel,
			anatomicalArea,
			teethFdi: selectedTeeth,
			effectiveDoseMicrosv: doseMicrosv,
			effectiveDoseMsv: doseMicrosv / 1000,
			imageUrl: activeItem.imageUrl,
			doctorName,
			doctorSpecialty: "Врач-стоматолог терапевт-эндодонтист",
			clinicName: "ООО «Денте Стоматология»",
			status: "completed",
			diagnosisIcd10: "K04.0",
			diagnosticNotes: protocolNote,
			metadata: {
				kv: activeItem.metadata.kv,
				ma: activeItem.metadata.ma,
				exposureSec: activeItem.metadata.exposureSec,
				pixelSpacingMm: activeItem.metadata.pixelSpacingMm,
				apparatusModel: activeItem.metadata.apparatusModel,
			},
			tags: ["HotFolder", "043/у", `Зуб_${selectedTeeth.join("_")}`],
		};

		// Mark item as imported
		setHotFolderItems((prev) =>
			prev.map((i) => (i.id === activeItem.id ? { ...i, status: "imported" } : i)),
		);

		onAttachToEmr?.({
			study,
			teethFdi: selectedTeeth,
			protocolNote,
			clinicalPurpose,
			doseMicrosv,
		});

		// Persist scan to server
		if (
			patientId &&
			activeItem.imageUrl &&
			(activeItem.imageUrl.startsWith("data:image/") || activeItem.imageUrl.startsWith("blob:"))
		) {
			void (async () => {
				try {
					let imageBase64 = activeItem.imageUrl;
					if (activeItem.imageUrl.startsWith("blob:")) {
						const blob = await fetch(activeItem.imageUrl).then((r) => r.blob());
						imageBase64 = await new Promise<string>((resolve) => {
							const reader = new FileReader();
							reader.onloadend = () => resolve(reader.result as string);
							reader.readAsDataURL(blob);
						});
					}
					await fetch("/api/xray/scans", {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							patientId,
							imageBase64,
							originalFilename:
								activeItem.filename || `hf_tooth_${selectedTeeth.join("_")}_${Date.now()}.jpg`,
							mimeType: "image/jpeg",
							kind: activeItem.detectedModality === "optg_panoramic" ? "panoramic" : "periapical",
							toothCode: selectedTeeth[0] || null,
							notes: protocolNote,
							status: "done",
						}),
					}).catch(() => {});
				} catch {}
			})();
		}

		// Update visit store & reactive tooth state
		try {
			const primaryToothCode = selectedTeeth[0] || "16";
			const rvgDiaryStatement = `[Автозахват снимка ${activeItem.modalityLabel}] Зуб #${selectedTeeth.join(", ")}: доза ${doseMicrosv} мкЗв. ${protocolNote}`;

			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim()
					? `${current.trim()}\n${rvgDiaryStatement}`
					: rvgDiaryStatement;
				return { ...prev, objectiveStatus: updated };
			});

			if (primaryToothCode) {
				const store = useVisitStore.getState();
				const currentState = store.visitToothStateByCode[primaryToothCode];
				if (!currentState || currentState === "idle") {
					store.setToothState(primaryToothCode, "treatment");
				}
			}
		} catch (err) {
			console.warn("[HotFolderIntakeModal] Failed to update visit store:", err);
		}

		// Dispatch global SOAP event & reactive scan event
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							objectiveStatus: `[Автозахват снимка ${activeItem.modalityLabel}] Зуб #${selectedTeeth.join(", ")}: доза ${doseMicrosv} мкЗв. ${protocolNote}`,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-rvg-scan-saved", {
					detail: { study, toothFdi: selectedTeeth[0] || "16", teethFdi: selectedTeeth },
				}),
			);
		} catch {
			// ignore
		}

		showToast(
			`Снимок (${activeItem.filename}) успешно прикреплен к карте пациента ${patientName} и протоколу ф. 043/у!`,
			"success",
		);
	}, [
		activeItem,
		patientId,
		patientCardNumber,
		patientName,
		selectedTeeth,
		doctorName,
		protocolNote,
		clinicalPurpose,
		onAttachToEmr,
		setHotFolderItems,
	]);

	return {
		handleAttachToEmr,
	};
}
