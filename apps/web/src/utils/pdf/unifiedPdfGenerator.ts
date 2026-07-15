import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface PatientPdfInfo {
	fullName: string;
	studyId?: string;
	date: string;
	birthDate?: string;
}

export interface ImplantInfo {
	brand: string;
	diameter: number;
	length: number;
	densityScore?: number;
	densityZone?: string;
	collisionWarning?: boolean;
}

export interface TreatmentPhase {
	name: string;
	price: number;
	discount?: number;
}

/**
 * Capture an HTMLElement as a base64 PNG using html2canvas
 */
export async function captureElementAsImage(
	element: HTMLElement,
): Promise<{ dataUrl: string; width: number; height: number }> {
	const canvas = await html2canvas(element, {
		useCORS: true,
		scale: 2, // High resolution for print
		logging: false,
		backgroundColor: "#ffffff", // Force white background for print unless overridden
	});
	return {
		dataUrl: canvas.toDataURL("image/png"),
		width: canvas.width,
		height: canvas.height,
	};
}

/**
 * Generates the Clinical Surgical Report (CBCT Guide)
 */
export async function generateSurgicalReportPdf({
	patientInfo,
	implants,
	containerElement,
}: {
	patientInfo: PatientPdfInfo;
	implants: ImplantInfo[];
	containerElement: HTMLElement | null;
}) {
	if (!containerElement)
		throw new Error("No container element provided for Surgical Report");

	const { dataUrl, width, height } =
		await captureElementAsImage(containerElement);

	const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();

	// Header
	pdf.setFillColor(15, 23, 42); // slate-900
	pdf.rect(0, 0, pageWidth, 25, "F");
	pdf.setTextColor(255, 255, 255);
	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(18);
	pdf.text("DENTE CBCT CLINICAL REPORT", 10, 15);

	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(10);
	pdf.text(`Patient: ${patientInfo.fullName}`, pageWidth - 100, 10);
	pdf.text(`Date: ${patientInfo.date}`, pageWidth - 100, 16);
	if (patientInfo.studyId) {
		pdf.text(`Study ID: ${patientInfo.studyId}`, pageWidth - 100, 22);
	}

	// Image layout
	const imgWidth = pageWidth - 20;
	const imgHeight = (height * imgWidth) / width;
	const finalImgHeight = Math.min(imgHeight, pageHeight - 60);
	const finalImgWidth = (width * finalImgHeight) / height;
	const xOffset = (pageWidth - finalImgWidth) / 2;

	pdf.addImage(dataUrl, "PNG", xOffset, 30, finalImgWidth, finalImgHeight);

	// Footer: Implants & Safety
	let yCursor = 30 + finalImgHeight + 10;
	pdf.setTextColor(0, 0, 0);
	pdf.setFontSize(12);
	pdf.setFont("helvetica", "bold");
	pdf.text("Planned Implants:", 10, yCursor);
	yCursor += 6;

	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(9);
	if (implants.length === 0) {
		pdf.text("No implants placed.", 10, yCursor);
		yCursor += 5;
	} else {
		implants.forEach((imp, i) => {
			pdf.text(
				`${i + 1}. Brand: ${imp.brand} | Size: ${imp.diameter} x ${imp.length}mm | HU Score: ${imp.densityScore || "N/A"} (Zone: ${imp.densityZone || "N/A"})`,
				10,
				yCursor,
			);
			yCursor += 5;
		});
	}

	// Safety Status
	const hasCollision = implants.some((i) => i.collisionWarning);
	pdf.setFont("helvetica", "bold");
	if (hasCollision) {
		pdf.setTextColor(220, 38, 38); // red-600
		pdf.text(
			"WARNING: Critical proximity to nerve canal detected in planning!",
			10,
			yCursor + 5,
		);
	} else {
		pdf.setTextColor(22, 163, 74); // green-600
		pdf.text(
			"Safety Status: Clear (No immediate nerve collisions detected)",
			10,
			yCursor + 5,
		);
	}

	pdf.save(`CBCT_Report_${patientInfo.fullName.replace(/\s+/g, "_")}.pdf`);
}

/**
 * Generates the Commercial Treatment Plan (Financial Estimate)
 */
export async function generateTreatmentPlanPdf({
	patientInfo,
	phases,
	odontogramElement,
}: {
	patientInfo: PatientPdfInfo;
	phases: TreatmentPhase[];
	odontogramElement?: HTMLElement | null;
}) {
	const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const pageWidth = pdf.internal.pageSize.getWidth();

	// Header
	pdf.setFillColor(13, 148, 136); // teal-600
	pdf.rect(0, 0, pageWidth, 30, "F");
	pdf.setTextColor(255, 255, 255);
	pdf.setFont("helvetica", "bold");
	pdf.setFontSize(22);
	pdf.text("TREATMENT PLAN ESTIMATE", 15, 20);

	pdf.setFont("helvetica", "normal");
	pdf.setFontSize(11);
	pdf.text(`Patient: ${patientInfo.fullName}`, pageWidth - 90, 15);
	pdf.text(`Date: ${patientInfo.date}`, pageWidth - 90, 22);

	let yCursor = 40;

	// Render Odontogram if provided
	if (odontogramElement) {
		const { dataUrl, width, height } =
			await captureElementAsImage(odontogramElement);
		const imgWidth = pageWidth - 30;
		const imgHeight = (height * imgWidth) / width;
		pdf.addImage(dataUrl, "PNG", 15, yCursor, imgWidth, imgHeight);
		yCursor += imgHeight + 10;
	}

	// Financial Breakdown
	pdf.setTextColor(0, 0, 0);
	pdf.setFontSize(16);
	pdf.setFont("helvetica", "bold");
	pdf.text("Phased Breakdown", 15, yCursor);
	yCursor += 10;

	pdf.setFontSize(12);
	let total = 0;

	phases.forEach((phase, index) => {
		pdf.setFont("helvetica", "bold");
		pdf.text(`Phase ${index + 1}: ${phase.name}`, 15, yCursor);

		pdf.setFont("helvetica", "normal");
		const priceText = `${phase.price.toLocaleString("ru-RU")} RUB`;
		pdf.text(priceText, pageWidth - 15 - pdf.getTextWidth(priceText), yCursor);

		if (phase.discount && phase.discount > 0) {
			yCursor += 6;
			pdf.setTextColor(220, 38, 38);
			const discountText = `Discount: -${phase.discount.toLocaleString("ru-RU")} RUB`;
			pdf.text(
				discountText,
				pageWidth - 15 - pdf.getTextWidth(discountText),
				yCursor,
			);
			pdf.setTextColor(0, 0, 0);
			total += phase.price - phase.discount;
		} else {
			total += phase.price;
		}
		yCursor += 10;
	});

	// Total
	yCursor += 5;
	pdf.line(15, yCursor, pageWidth - 15, yCursor);
	yCursor += 10;
	pdf.setFontSize(16);
	pdf.setFont("helvetica", "bold");
	pdf.text("Estimated Total:", 15, yCursor);
	const totalText = `${total.toLocaleString("ru-RU")} RUB`;
	pdf.text(totalText, pageWidth - 15 - pdf.getTextWidth(totalText), yCursor);

	// Signatures
	yCursor += 40;
	pdf.setFontSize(10);
	pdf.setFont("helvetica", "normal");
	pdf.line(15, yCursor, 80, yCursor);
	pdf.text("Doctor Signature", 15, yCursor + 5);

	pdf.line(pageWidth - 80, yCursor, pageWidth - 15, yCursor);
	pdf.text("Patient Signature", pageWidth - 80, yCursor + 5);

	pdf.save(`Treatment_Plan_${patientInfo.fullName.replace(/\s+/g, "_")}.pdf`);
}
