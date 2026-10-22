import { useState, useEffect, useMemo, useRef } from "react";
import {
	type DentalLabConstructionType, type DentalLabOrderStatus,
	toIsoDate, addWorkingDaysRu, checkFittingAppointmentCollision,
} from "../dentalLabOrderEngine";
import type { DentalLabOrderDrawerProps } from "../DentalLabOrderDrawer";
import { executeDrawerOrderSubmit, executeDrawerMarkReadyInClinic } from "./dentalLabDrawerSubmit";
import { computeConstructionDefaults } from "./dentalLabConstructionDefaults";

export function useDentalLabOrderDrawerForm(props: DentalLabOrderDrawerProps) {
	const inFlightRef = useRef(false);
	const editingOrder = props.editingOrder ?? props.initialOrder ?? null;
	const resolvedPatient = editingOrder?.patientName ?? props.patientName ?? props.currentPatientName ?? "";
	const resolvedDoctor = editingOrder?.doctorName ?? props.doctorName ?? props.currentDoctorName ?? "Д-р Орлов А.В. (Ортопед)";
	const resolvedTooth = editingOrder
		? (Array.isArray(editingOrder.teethFdi) ? editingOrder.teethFdi.join(", ") : String(editingOrder.teethFdi || "16"))
		: props.currentToothNumber ?? props.initialToothFdi ?? (props.initialTeeth && props.initialTeeth.length > 0 ? props.initialTeeth.join(", ") : "16");

	const [patientName, setPatientName] = useState(resolvedPatient);
	const [doctorName, setDoctorName] = useState(resolvedDoctor);
	const [labName, setLabName] = useState(editingOrder?.labName || "Основная лаборатория");
	const [technicianName, setTechnicianName] = useState("");
	const [teethInput, setTeethInput] = useState(String(resolvedTooth));
	const [construction, setConstruction] = useState<DentalLabConstructionType>("crown_zirconia");
	const [vitaShade, setVitaShade] = useState("A2");
	const [translucency, setTranslucency] = useState<"HT" | "MT" | "LT" | "MO" | "HO">("MT");
	const [stumpShade, setStumpShade] = useState("ND2");
	const [sentDate, setSentDate] = useState(() => toIsoDate(new Date()));
	const [deadlineDate, setDeadlineDate] = useState(() => toIsoDate(addWorkingDaysRu(new Date(), 5)));
	const [scheduledVisit, setScheduledVisit] = useState(props.scheduledVisitDate || "");
	const [patientPriceRub, setPatientPriceRub] = useState(24000);
	const [ztlCostRub, setZtlCostRub] = useState(7500);
	const [doctorPercent, setDoctorPercent] = useState(20);
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [attachedScanUrl, setAttachedScanUrl] = useState("");
	const [status, setStatus] = useState<DentalLabOrderStatus>("sent_to_lab");

	useEffect(() => {
		const now = new Date();
		setPatientName(editingOrder?.patientName ?? props.patientName ?? props.currentPatientName ?? "");
		setDoctorName(editingOrder?.doctorName ?? props.doctorName ?? props.currentDoctorName ?? "Д-р Орлов А.В. (Ортопед)");
		setLabName(editingOrder?.labName || "Основная лаборатория");
		setTechnicianName(editingOrder?.technicianName ?? "");
		setTeethInput(
			editingOrder
				? (Array.isArray(editingOrder.teethFdi) ? editingOrder.teethFdi.join(", ") : String(editingOrder.teethFdi || "16"))
				: String(props.currentToothNumber ?? props.initialToothFdi ?? (props.initialTeeth && props.initialTeeth.length > 0 ? props.initialTeeth.join(", ") : "16")),
		);
		setConstruction(editingOrder?.constructionType ?? "crown_zirconia");
		setVitaShade(editingOrder?.vitaShade ?? editingOrder?.colorVita ?? "A2");
		setTranslucency((editingOrder?.translucency as any) || "MT");
		setStumpShade(editingOrder?.stumpShade ?? "ND2");
		setSentDate(editingOrder?.sentDate ?? toIsoDate(now));
		setDeadlineDate(editingOrder?.deadlineDate ?? editingOrder?.dueDate ?? toIsoDate(addWorkingDaysRu(now, 5)));
		setScheduledVisit(editingOrder?.scheduledVisitDate ?? props.scheduledVisitDate ?? "");
		setPatientPriceRub(editingOrder ? (editingOrder.patientPriceKopecks ? editingOrder.patientPriceKopecks / 100 : editingOrder.priceRub ?? 24000) : 24000);
		setZtlCostRub(editingOrder ? (editingOrder.ztlCostKopecks ? editingOrder.ztlCostKopecks / 100 : editingOrder.costRub ?? 7500) : 7500);
		setDoctorPercent(editingOrder?.doctorSharePercent ?? 20);
		setClinicalNotes(editingOrder?.clinicalNotes ?? "");
		setAttachedScanUrl(editingOrder?.attachedScanUrl ?? editingOrder?.attachedImageUrl ?? "");
		setStatus(editingOrder?.status === "delivered_to_patient" ? "delivered_to_patient" : editingOrder?.status === "ready_in_clinic" ? "ready_in_clinic" : editingOrder?.status === "in_progress" ? "in_progress" : "sent_to_lab");
	}, [editingOrder, props.isOpen]);

	const collision = useMemo(() => checkFittingAppointmentCollision(deadlineDate, scheduledVisit), [deadlineDate, scheduledVisit]);

	const handleSelectConstruction = (val: string) => {
		setConstruction(val as DentalLabConstructionType);
		const def = computeConstructionDefaults(val, sentDate);
		if (def) {
			setPatientPriceRub(def.patientPriceRub);
			setZtlCostRub(def.ztlCostRub);
			setDeadlineDate(def.deadlineDate);
		}
	};

	const ctx = {
		props, editingOrder, patientName, doctorName, labName, technicianName,
		teethInput, construction, vitaShade, translucency, stumpShade, sentDate,
		deadlineDate, scheduledVisit, patientPriceRub, ztlCostRub, doctorPercent,
		clinicalNotes, attachedScanUrl, status,
	};

	const handleSubmit = (e?: React.FormEvent) => {
		e?.preventDefault?.();
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			executeDrawerOrderSubmit(ctx);
		} finally {
			setTimeout(() => { inFlightRef.current = false; }, 300);
		}
	};

	const handleMarkReadyInClinic = () => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			setStatus("ready_in_clinic");
			executeDrawerMarkReadyInClinic({ ...ctx, status: "ready_in_clinic" });
		} finally {
			setTimeout(() => { inFlightRef.current = false; }, 300);
		}
	};

	return {
		patientName, setPatientName, doctorName, setDoctorName, labName, setLabName,
		technicianName, setTechnicianName, teethInput, setTeethInput, construction,
		handleSelectConstruction, vitaShade, setVitaShade, translucency, setTranslucency,
		stumpShade, setStumpShade, sentDate, setSentDate, deadlineDate, setDeadlineDate,
		scheduledVisit, setScheduledVisit, patientPriceRub, setPatientPriceRub, ztlCostRub,
		setZtlCostRub, doctorPercent, setDoctorPercent, clinicalNotes, setClinicalNotes,
		attachedScanUrl, setAttachedScanUrl, status, setStatus, collision, handleSubmit,
		handleMarkReadyInClinic,
		setWorkingDays: (d: number) => setDeadlineDate(toIsoDate(addWorkingDaysRu(sentDate, d))),
		autoBookFitting: () => setScheduledVisit(toIsoDate(addWorkingDaysRu(deadlineDate, 1))),
		editingOrder,
	};
}
