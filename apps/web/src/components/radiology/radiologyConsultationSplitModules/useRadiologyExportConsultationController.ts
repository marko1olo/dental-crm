/**
 * DENTE CRM — Radiology Consultation Split: Export & Consilium Protocol Controller
 * Subcontroller for composite comparison snapshots, consilium notes, and Form 043/u protocol export.
 * Strictly <= 500 lines (Mandate 8b, 8e, 8k, 8n).
 */

import { useCallback, useState } from "react";
import { applyRadiologyProtocolToForm043 } from "../radiologyProtocols.js";
import { showToast } from "../../GlobalToast.js";
import {
	type ViewportState,
	captureCompositeSnapshot,
} from "../consultationCanvasRenderers.js";
import type { ConsultationSplitMode } from "../ConsultationTopToolbar.js";
import type {
	ConsultationParticipant,
	ConsultationNoteItem,
} from "./types.js";
import { DEFAULT_CONSULTATION_PARTICIPANTS } from "./consultationConstants.js";
import {
	buildForm043ConsultationStatement,
	formatConsultationTimestamp,
} from "./consultationUtils.js";
import { createInitialConsiliumNotes } from "./consultationInitialState.js";

export interface UseRadiologyExportConsultationControllerProps {
	readonly leftCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly rightCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly leftViewport: ViewportState;
	readonly rightViewport: ViewportState;
	readonly splitMode: ConsultationSplitMode;
	readonly patientName?: string | undefined;
	readonly patientCardNumber?: string | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly onInsertProtocol?: ((note: string) => void) | undefined;
	readonly onSaveSnapshot?: ((dataUrl: string) => void) | undefined;
}

export function useRadiologyExportConsultationController({
	leftCanvasRef,
	rightCanvasRef,
	leftViewport,
	rightViewport,
	splitMode,
	patientName = "Чухрова Лариса",
	patientCardNumber = "20190621_101042",
	activeToothFdi,
	onInsertProtocol,
	onSaveSnapshot,
}: UseRadiologyExportConsultationControllerProps) {
	// Consilium participants state
	const [participants, setParticipants] = useState<readonly ConsultationParticipant[]>(
		DEFAULT_CONSULTATION_PARTICIPANTS,
	);
	const [isParticipantsBarOpen, setIsParticipantsBarOpen] = useState<boolean>(false);

	// Consilium notes & treatment protocol
	const [notes, setNotes] = useState<readonly ConsultationNoteItem[]>(() =>
		createInitialConsiliumNotes(activeToothFdi),
	);
	const [isNotesPanelOpen, setIsNotesPanelOpen] = useState<boolean>(false);

	// Snapshot (Camera) Action — Captures composite comparison card
	const handleTakeSnapshot = useCallback(() => {
		const snapshotDataUrl = captureCompositeSnapshot({
			leftCanvas: leftCanvasRef.current,
			rightCanvas: rightCanvasRef.current,
			leftTitle: leftViewport.title,
			rightTitle: rightViewport.title,
			patientName,
			patientCardNumber,
		});

		if (snapshotDataUrl) {
			if (onSaveSnapshot) {
				onSaveSnapshot(snapshotDataUrl);
			}
			showToast("Снимок консультации (Сплит) успешно сохранён в карту пациента", "success");
		} else {
			showToast("Не удалось сформировать снимок экрана", "error");
		}
	}, [leftCanvasRef, rightCanvasRef, leftViewport.title, rightViewport.title, patientName, patientCardNumber, onSaveSnapshot]);

	// 1-Click Form 043/u Consultation Protocol Injection
	const handleInsertConsultationNote = useCallback(() => {
		const isAtlas = splitMode === "atlas";
		const targetTooth = leftViewport.toothCode || activeToothFdi;
		const note = buildForm043ConsultationStatement({
			isAtlas,
			targetTooth,
			leftTitle: leftViewport.title,
			leftSubtitle: leftViewport.subtitle,
			rightTitle: rightViewport.title,
			rightSubtitle: rightViewport.subtitle,
		});

		applyRadiologyProtocolToForm043({
			protocol: note,
			options: {
				toothFdi:
					leftViewport.toothCode || activeToothFdi
						? String(leftViewport.toothCode || activeToothFdi)
						: undefined,
				modalityLabel: isAtlas ? "Консультация (Атлас)" : "Сплит «До / После»",
			},
			onInsertToProtocol: onInsertProtocol,
			showNotification: true,
			copyToClipboard: true,
		});
	}, [splitMode, leftViewport.toothCode, leftViewport.title, leftViewport.subtitle, rightViewport.title, rightViewport.subtitle, activeToothFdi, onInsertProtocol]);

	// Add note to consilium log
	const handleAddNote = useCallback(
		(text: string) => {
			if (!text.trim()) return;
			const newNote: ConsultationNoteItem = {
				id: `note-${Date.now()}`,
				authorRole: "surgeon",
				authorName: "Д-р Романенко А. И.",
				text: text.trim(),
				timestamp: formatConsultationTimestamp(),
				targetTooth: activeToothFdi ? String(activeToothFdi) : "16",
			};
			setNotes((prev) => [...prev, newNote]);
			showToast("Заметка консилиума добавлена", "success");
		},
		[activeToothFdi],
	);

	return {
		participants,
		setParticipants,
		isParticipantsBarOpen,
		setIsParticipantsBarOpen,
		notes,
		setNotes,
		isNotesPanelOpen,
		setIsNotesPanelOpen,
		handleTakeSnapshot,
		handleInsertConsultationNote,
		handleAddNote,
	};
}
