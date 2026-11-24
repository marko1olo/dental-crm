import { useCallback } from "react";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
import { FDI_TOOTH_NAMES } from "../radiologyMath";
import type { RadiologyStudy } from "../types";
import type { HotFolderItem } from "../hotFolderTypes";
import { useVisitStore } from "../../../store/visitStore";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
			tags: ["HotFolder", "Медицинская карта", `Зуб_${selectedTeeth.join("_")}`],
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
			UUID_REGEX.test(patientId) &&
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
					const response = await fetch("/api/imaging/studies", {
						method: "POST",
						headers: denteClinicalMutationHeaders({
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
						}),
						body: JSON.stringify({
							patientId,
							imageBase64,
							title: activeItem.filename || `Снимок Hot Folder ${selectedTeeth.join(", ")}`,
							kind: activeItem.detectedModality === "optg_panoramic" ? "opg" : "periapical",
							sourceKind: "hot_folder",
							sourceName: (activeItem.filename || activeItem.sourceLabel || "hot_folder").slice(0, 160),
							toothCode: selectedTeeth[0] || null,
							aiSummary: protocolNote ? protocolNote.slice(0, 2000) : null,
						}),
					});
					if (!response.ok) {
						clientLogger.warn(
							"[HotFolderEmrDispatcher] Не удалось сохранить снимок на сервере",
							{ status: response.status },
							{ module: "HotFolderEmrDispatcher" },
						);
						showToast(
							"Снимок прикреплён к карте локально, но не удалось сохранить на сервере",
							"warning",
						);
					}
				} catch (uploadErr) {
					clientLogger.warn(
						"[HotFolderEmrDispatcher] Ошибка при сохранении снимка из HotFolder",
						uploadErr,
						{ module: "HotFolderEmrDispatcher" },
					);
					showToast("Ошибка сети при сохранении снимка на сервер", "error");
				}
			})();
		}

		// Update visit store & reactive tooth state
		let localDispatchFailed = false;
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
			localDispatchFailed = true;
			clientLogger.warn("[HotFolderIntakeModal] Failed to update visit store", err, {
				module: "HotFolderEmrDispatcher",
			});
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
		} catch (eventErr) {
			localDispatchFailed = true;
			clientLogger.warn("[HotFolderEmrDispatcher] Ошибка при отправке клинического события", eventErr, {
				module: "HotFolderEmrDispatcher",
			});
		}

		if (localDispatchFailed) {
			showToast(
				`Снимок (${activeItem.filename}) загружен, но возник сбой обновления карты приёма`,
				"warning",
			);
		} else {
			showToast(
				`Снимок (${activeItem.filename}) успешно прикреплен к медицинской карте пациента ${patientName}!`,
				"success",
			);
		}
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
