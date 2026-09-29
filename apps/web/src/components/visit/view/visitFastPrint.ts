import { renderForm043uHtml } from "@dental/shared";
import { generateInformedConsent1051nHtml } from "../../../lib/clinicalProtocols043";
import { showToast } from "../../GlobalToast";

export interface FastPrint043Params {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: form
	visitNoteForm: any;
	isClosed: boolean;
	watermarkText: string;
}

export function executeFastPrint043u({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	isClosed,
	watermarkText,
}: FastPrint043Params) {
	if (typeof window === "undefined") return;

	const revisionCount = Number(
		visitNoteForm?.revisionCount ??
			activeAppointment?.revisionCount ??
			0,
	);
	const effectiveWatermark =
		revisionCount > 0
			? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount})`
			: (isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");

	const cardHtml = renderForm043uHtml({
		medicalCardNumber:
			activePatient?.cardNumber ||
			activePatient?.medicalCardNumber ||
			"__________",
		cardOpenedDate:
			activePatient?.cardOpenedAt ||
			new Date().toISOString().slice(0, 10),
		patientFullName:
			activePatient?.fullName ||
			activePatient?.name ||
			"________________________",
		patientBirthDate: activePatient?.birthDate || "—",
		patientSex: activePatient?.gender === "female" ? "female" : "male",
		patientPhone: activePatient?.phone || "—",
		patientAddressRegistration: activePatient?.address || "—",
		chiefComplaint:
			visitNoteForm?.complaint || "Жалоб на момент осмотра не предъявляет.",
		historyOfPresentIllness:
			visitNoteForm?.anamnesis ||
			"Ранее лечился по поводу кариеса и его осложнений.",
		allergologicalHistory:
			activePatient?.allergies || "Аллергологический анамнез не отягощен.",
		concomitantDiseases:
			visitNoteForm?.anamnesis || "Хронические заболевания отрицает.",
		attendingDoctorFullName:
			activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог",
		attendingDoctorSpecialty:
			activeDoctor?.specialty ||
			activeDoctor?.specialtyRu ||
			"Врач-стоматолог",
		diaries: [
			{
				entryDate: new Date().toISOString().slice(0, 10),
				doctorFullName:
					activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог",
				doctorSpecialty:
					activeDoctor?.specialty ||
					activeDoctor?.specialtyRu ||
					"Врач-стоматолог",
				clinicalDiagnosisIcd10:
					visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование",
				complaints: visitNoteForm?.complaint || "Плановый осмотр.",
				objectiveStatus:
					visitNoteForm?.objectiveInspection ||
					"Слизистая полости рта без патологических изменений.",
				treatmentProtocol:
					visitNoteForm?.treatmentPlan ||
					"Консультация и профилактический осмотр проведены.",
			},
		],
		isClosed,
		watermarkText: effectiveWatermark,
	});

	const printFrame = document.createElement("iframe");
	printFrame.style.position = "fixed";
	printFrame.style.right = "0";
	printFrame.style.bottom = "0";
	printFrame.style.width = "0";
	printFrame.style.height = "0";
	printFrame.style.border = "0";
	document.body.appendChild(printFrame);

	const frameDoc =
		printFrame.contentWindow?.document || printFrame.contentDocument;
	if (frameDoc) {
		frameDoc.write(cardHtml);
		frameDoc.close();
		setTimeout(() => {
			printFrame.contentWindow?.focus();
			printFrame.contentWindow?.print();
			setTimeout(() => {
				if (document.body.contains(printFrame)) {
					document.body.removeChild(printFrame);
				}
			}, 1000);
		}, 150);
	} else {
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(cardHtml);
			printWindow.document.close();
			printWindow.focus();
			printWindow.print();
		} else {
			window.print();
		}
	}

	showToast(
		`Медицинская карта отправлена на печать (${watermarkText})`,
		"success",
		6000,
	);
}

export interface FastPrintConsentParams {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: form
	visitNoteForm: any;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard: any;
	// biome-ignore lint/suspicious/noExplicitAny: tooth
	selectedToothForMenu: any;
}

export function executeFastPrintInformedConsent({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	dashboard,
	selectedToothForMenu,
}: FastPrintConsentParams) {
	if (typeof window === "undefined") return;

	const isClosed =
		activeAppointment?.status === "completed" ||
		activeAppointment?.status === "signed" ||
		activeAppointment?.status === "closed" ||
		visitNoteForm?.status === "completed" ||
		visitNoteForm?.status === "signed";
	const watermarkText = isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК";

	const consentHtml = generateInformedConsent1051nHtml({
		patientFullName:
			activePatient?.fullName ||
			activePatient?.name ||
			"________________________",
		patientBirthDate: activePatient?.birthDate || "—",
		patientAddress: activePatient?.address || "—",
		doctorFullName:
			activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог",
		doctorSpecialty:
			activeDoctor?.specialty ||
			activeDoctor?.specialtyRu ||
			"Врач-стоматолог",
		clinicName:
			dashboard?.clinicSettings?.profile?.brandName ||
			"Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)",
		clinicLicense:
			dashboard?.clinicSettings?.profile?.medicalLicenseNumber ||
			"№ ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения города Москвы",
		diagnosisIcd: visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование",
		toothNumbers: typeof selectedToothForMenu === "number" ? String(selectedToothForMenu) : undefined,
		isClosed,
		watermarkText,
	});

	const printFrame = document.createElement("iframe");
	printFrame.style.position = "fixed";
	printFrame.style.right = "0";
	printFrame.style.bottom = "0";
	printFrame.style.width = "0";
	printFrame.style.height = "0";
	printFrame.style.border = "0";
	document.body.appendChild(printFrame);

	const frameDoc =
		printFrame.contentWindow?.document || printFrame.contentDocument;
	if (frameDoc) {
		frameDoc.write(consentHtml);
		frameDoc.close();
		setTimeout(() => {
			printFrame.contentWindow?.focus();
			printFrame.contentWindow?.print();
			setTimeout(() => {
				if (document.body.contains(printFrame)) {
					document.body.removeChild(printFrame);
				}
			}, 1000);
		}, 150);
	}
	showToast(`Согласие на лечение отправлено на печать (${watermarkText})`, "success", 4000);
}
