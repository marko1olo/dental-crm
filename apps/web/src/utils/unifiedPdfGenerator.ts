// @ts-nocheck

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type PdfReportType = "surgical" | "financial";

export interface SurgicalReportData {
	patientName: string;
	patientAge: string;
	doctorName: string;
	axialViewId: string;
	coronalViewId: string;
	sagittalViewId: string;
	crossSectionId: string;
	boneDensity: string; // e.g. "D2 (850 HU)"
	implantSystem: string;
	sleeveDiameter: string;
	aiSafetyVerdict: "SAFE" | "WARNING" | "DANGER";
}

export interface FinancialEstimateData {
	patientName: string;
	doctorName: string;
	odontogramViewId: string; // ID of the odontogram DOM element
	phases: {
		name: string;
		items: { title: string; price: number }[];
		total: number;
	}[];
	totalPrice: number;
	discount: number;
	finalPrice: number;
}

export const unifiedPdfGenerator = {
	/**
	 * Generates a surgical report PDF containing CBCT screenshots and implant details.
	 */
	async generateSurgicalReport(data: SurgicalReportData): Promise<void> {
		const doc = new jsPDF({ format: "a4", unit: "mm" });
		const pageWidth = doc.internal.pageSize.getWidth();

		// Header
		doc.setFontSize(22);
		doc.setTextColor(30, 41, 59);
		doc.text("DENTE CLINIC", 20, 20);

		doc.setFontSize(14);
		doc.setTextColor(71, 85, 105);
		doc.text("Хирургический Протокол CBCT (Surgical Guide Report)", 20, 30);

		// Patient Info
		doc.setFontSize(11);
		doc.setTextColor(15, 23, 42);
		doc.text(`Пациент: ${data.patientName} (${data.patientAge})`, 20, 45);
		doc.text(`Лечащий врач: ${data.doctorName}`, 20, 52);

		// Capture Views
		const views = [
			{ id: data.axialViewId, label: "Axial View" },
			{ id: data.coronalViewId, label: "Coronal View" },
			{ id: data.sagittalViewId, label: "Sagittal View" },
			{ id: data.crossSectionId, label: "Cross-Section (Implant)" },
		];

		let currentY = 65;

		for (let i = 0; i < views.length; i++) {
			const el = document.getElementById(views[i].id);
			if (el) {
				try {
					const canvas = await html2canvas(el, {
						scale: 2,
						useCORS: true,
						logging: false,
					});
					const imgData = canvas.toDataURL("image/jpeg", 0.9);

					// Layout 2x2 grid
					const isRightColumn = i % 2 !== 0;
					const x = isRightColumn ? pageWidth / 2 + 5 : 20;
					const w = pageWidth / 2 - 25;
					const h = (canvas.height * w) / canvas.width;

					doc.setFontSize(10);
					doc.text(views[i].label, x, currentY);
					doc.addImage(imgData, "JPEG", x, currentY + 3, w, h);

					if (isRightColumn) {
						currentY += h + 15;
					}
				} catch (e) {
					console.error(`Failed to capture ${views[i].id}`, e);
				}
			}
		}

		// Ensure we have space for footer
		if (currentY > 220) {
			doc.addPage();
			currentY = 20;
		} else {
			currentY += 10; // offset if loop ended on left column
		}

		// Implant & Safety Data
		doc.setFontSize(14);
		doc.setTextColor(30, 41, 59);
		doc.text("Параметры операции", 20, currentY);

		doc.setFontSize(11);
		currentY += 10;
		doc.text(`Система имплантатов: ${data.implantSystem}`, 20, currentY);
		doc.text(`Плотность кости (Misch): ${data.boneDensity}`, 20, currentY + 8);
		doc.text(`Втулка (Sleeve Ø): ${data.sleeveDiameter} мм`, 20, currentY + 16);

		// Safety Status
		currentY += 30;
		doc.setFontSize(12);
		if (data.aiSafetyVerdict === "SAFE") {
			doc.setTextColor(22, 163, 74); // Green
			doc.text("AI Статус: БЕЗОПАСНО (Коллизий не обнаружено)", 20, currentY);
		} else if (data.aiSafetyVerdict === "WARNING") {
			doc.setTextColor(234, 179, 8); // Yellow
			doc.text(
				"AI Статус: ПРЕДУПРЕЖДЕНИЕ (Возможное коаксиальное расхождение)",
				20,
				currentY,
			);
		} else {
			doc.setTextColor(220, 38, 38); // Red
			doc.text(
				"AI Статус: ОПАСНОСТЬ (Риск повреждения нижнечелюстного нерва)",
				20,
				currentY,
			);
		}

		doc.save(`Surgical_Report_${data.patientName.replace(/\s+/g, "_")}.pdf`);
	},

	/**
	 * Generates a Financial Estimate PDF.
	 */
	async generateFinancialEstimate(data: FinancialEstimateData): Promise<void> {
		const doc = new jsPDF({ format: "a4", unit: "mm" });
		const pageWidth = doc.internal.pageSize.getWidth();

		// Header
		doc.setFontSize(22);
		doc.setTextColor(30, 41, 59);
		doc.text("DENTE CLINIC", 20, 20);

		doc.setFontSize(14);
		doc.setTextColor(71, 85, 105);
		doc.text("Комплексный План Лечения (Смета)", 20, 30);

		// Patient Info
		doc.setFontSize(11);
		doc.setTextColor(15, 23, 42);
		doc.text(`Пациент: ${data.patientName}`, 20, 45);
		doc.text(`Лечащий врач: ${data.doctorName}`, 20, 52);
		doc.text(`Дата: ${new Date().toLocaleDateString("ru-RU")}`, 20, 59);

		let currentY = 70;

		// Capture Odontogram
		const odontogramEl = document.getElementById(data.odontogramViewId);
		if (odontogramEl) {
			try {
				const canvas = await html2canvas(odontogramEl, {
					scale: 2,
					useCORS: true,
					logging: false,
				});
				const imgData = canvas.toDataURL("image/jpeg", 0.9);
				const w = pageWidth - 40;
				const h = (canvas.height * w) / canvas.width;

				doc.addImage(imgData, "JPEG", 20, currentY, w, h);
				currentY += h + 15;
			} catch (e) {
				console.error("Failed to capture odontogram", e);
			}
		}

		// Phases Table
		data.phases.forEach((phase) => {
			if (currentY > 250) {
				doc.addPage();
				currentY = 20;
			}

			doc.setFontSize(12);
			doc.setTextColor(15, 23, 42);
			doc.text(`Этап: ${phase.name}`, 20, currentY);
			currentY += 8;

			doc.setFontSize(10);
			phase.items.forEach((item) => {
				doc.setTextColor(71, 85, 105);
				doc.text(item.title, 25, currentY);
				doc.text(
					`${item.price.toLocaleString("ru-RU")} ₽`,
					pageWidth - 40,
					currentY,
					{ align: "right" },
				);
				currentY += 6;
			});

			currentY += 2;
			doc.setTextColor(15, 23, 42);
			doc.text(`Итого по этапу:`, 25, currentY);
			doc.text(
				`${phase.total.toLocaleString("ru-RU")} ₽`,
				pageWidth - 40,
				currentY,
				{ align: "right" },
			);
			currentY += 12;
		});

		// Totals
		if (currentY > 230) {
			doc.addPage();
			currentY = 20;
		}

		doc.line(20, currentY, pageWidth - 20, currentY);
		currentY += 10;

		doc.setFontSize(14);
		doc.text("Итоговая стоимость:", 20, currentY);
		doc.text(
			`${data.totalPrice.toLocaleString("ru-RU")} ₽`,
			pageWidth - 40,
			currentY,
			{ align: "right" },
		);

		if (data.discount > 0) {
			currentY += 8;
			doc.setFontSize(12);
			doc.setTextColor(220, 38, 38);
			doc.text("Скидка:", 20, currentY);
			doc.text(
				`-${data.discount.toLocaleString("ru-RU")} ₽`,
				pageWidth - 40,
				currentY,
				{ align: "right" },
			);
		}

		currentY += 10;
		doc.setFontSize(16);
		doc.setTextColor(22, 163, 74);
		doc.text("К ОПЛАТЕ:", 20, currentY);
		doc.text(
			`${data.finalPrice.toLocaleString("ru-RU")} ₽`,
			pageWidth - 40,
			currentY,
			{ align: "right" },
		);

		// Signatures
		currentY += 30;
		doc.setFontSize(11);
		doc.setTextColor(15, 23, 42);
		doc.text("Лечащий врач: ______________________", 20, currentY);
		doc.text("Пациент: ______________________", pageWidth / 2, currentY);

		doc.save(`Treatment_Plan_${data.patientName.replace(/\s+/g, "_")}.pdf`);
	},
};
