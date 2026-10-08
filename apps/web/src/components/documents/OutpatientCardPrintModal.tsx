/**
 * OutpatientCardPrintModal.tsx
 *
 * Каноническое модальное окно просмотра, печати и экспорта
 * Медицинской карты стоматологического пациента / выписки из формы 043/у.
 * Соответствует стандартам СтАР и Приказу Минздрава РФ.
 *
 * Мандат 8e: Печать в любой момент со статусом «ЧЕРНОВИК» или «ПОДПИСАНО ВРАЧОМ».
 * Никаких эмодзи, только векторные иконки Lucide.
 */

import React, { useMemo, useState } from "react";
import { X, Printer, Download, FileText, CheckCircle2, Shield } from "lucide-react";
import type { Patient, A4DocumentMedicalCardData } from "@dental/shared";
import { ProfessionalDocumentA4Sheet } from "./ProfessionalDocumentA4Sheet";

export interface OutpatientCardPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly medicalCardData?: Partial<A4DocumentMedicalCardData>;
	readonly isClosedOrSigned?: boolean;
	readonly onPrint?: () => void;
	readonly onDownloadPdf?: () => void;
}

export const OutpatientCardPrintModal: React.FC<OutpatientCardPrintModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	clinicProfileDraft,
	medicalCardData: customCardData,
	isClosedOrSigned = false,
	onPrint,
	onDownloadPdf,
}) => {
	const [isPrinting, setIsPrinting] = useState(false);

	const todayRu = useMemo(() => {
		const d = new Date();
		const day = String(d.getDate()).padStart(2, "0");
		const months = [
			"января", "февраля", "марта", "апреля", "мая", "июня",
			"июля", "августа", "сентября", "октября", "ноября", "декабря",
		];
		const month = months[d.getMonth()] || "января";
		const year = d.getFullYear();
		return `${day} ${month} ${year}`;
	}, []);

	const cl = useMemo(() => {
		const draft = clinicProfileDraft || {};
		return {
			name: draft.clinicName || draft.name || 'ООО "Стоматологическая клиника ДЕНТЕ"',
			legalName: draft.legalName || draft.clinicName || 'ООО "Стоматологическая клиника ДЕНТЕ"',
			shortName: draft.shortName || 'ООО "ДЕНТЕ"',
			address: draft.legalAddress || draft.address || "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
			inn: draft.inn || "7710984521",
			kpp: draft.kpp || "771001001",
			ogrn: draft.ogrn || "1217700456123",
			licenseNumber: draft.medicalLicenseNumber || draft.licenseNumber || "ЛО41-01137-77/00645892",
			phone: draft.phone || "+7 (495) 123-45-67",
			directorFullName: draft.directorFullName || "Воронов Алексей Владимирович",
		};
	}, [clinicProfileDraft]);

	const pt = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: patient profile extraction
		const pAny = (patient || {}) as any;
		const admin = pAny.administrativeProfile || {};
		return {
			fullName: patient?.fullName || "Пациент клиники",
			birthDate: patient?.birthDate
				? new Date(patient.birthDate).toLocaleDateString("ru-RU")
				: "01.01.1990",
			gender: (patient?.gender as "male" | "female") || "male",
			phone: patient?.phone || "+7 (999) 000-00-00",
			cardNumber: pAny.medicalCardNumber || pAny.cardNumber || "МК-2026/043",
		};
	}, [patient]);

	const doctor = doctorFullName || cl.directorFullName || "Лечащий врач";

	const cardData: A4DocumentMedicalCardData = useMemo(() => {
		return {
			clinic: {
				name: cl.name,
				legalName: cl.legalName,
				shortName: cl.shortName,
				address: cl.address,
				inn: cl.inn,
				kpp: cl.kpp,
				ogrn: cl.ogrn,
				licenseNumber: cl.licenseNumber,
				phone: cl.phone,
				directorFullName: cl.directorFullName,
			},
			patient: {
				fullName: pt.fullName,
				birthDate: pt.birthDate,
				gender: pt.gender,
				phone: pt.phone,
				cardNumber: pt.cardNumber,
			},
			cardNumber: pt.cardNumber,
			visitDate: todayRu,
			doctorFullName: doctor,
			doctorSpecialty: "Врач-стоматолог",
			allergyStatus: "Соматически сохранен. Лекарственные аллергии со слов пациента отрицает.",
			somaticStatus: "Соматически здоров. Физиологическая норма.",
			complaints: "Плановый осмотр и санация полости рта.",
			anamnesisMorbi: "Обратился в плановом порядке для стоматологического лечения.",
			statusLocalis: "Слизистая оболочка полости рта бледно-розовая, влажная. Прикус ортогнатический.",
			teethFormulaSummary: "Зубная формула санирована.",
			teethFormulaMap: {
				18: { state: "—" }, 17: { state: "—" }, 16: { state: "—" }, 15: { state: "—" },
				14: { state: "—" }, 13: { state: "—" }, 12: { state: "—" }, 11: { state: "—" },
				21: { state: "—" }, 22: { state: "—" }, 23: { state: "—" }, 24: { state: "—" },
				25: { state: "—" }, 26: { state: "—" }, 27: { state: "—" }, 28: { state: "—" },
				48: { state: "—" }, 47: { state: "—" }, 46: { state: "—" }, 45: { state: "—" },
				44: { state: "—" }, 43: { state: "—" }, 42: { state: "—" }, 41: { state: "—" },
				31: { state: "—" }, 32: { state: "—" }, 33: { state: "—" }, 34: { state: "—" },
				35: { state: "—" }, 36: { state: "—" }, 37: { state: "—" }, 38: { state: "—" },
			},
			diagnosisIcd10: "K02.1",
			diagnosisDescription: "Кариес дентина",
			diagnosisTooth: "16",
			treatmentProtocol: "Проведено стоматологическое лечение по клиническому протоколу.",
			materialsUsed: "Стоматологические материалы по стандарту СтАР.",
			recommendations: "Соблюдать гигиену полости рта. Плановый контрольный осмотр через 6 месяцев.",
			...customCardData,
		};
	}, [cl, pt, doctor, todayRu, customCardData]);

	const handlePrint = () => {
		setIsPrinting(true);
		try {
			if (onPrint) {
				onPrint();
			} else if (typeof window !== "undefined") {
				window.print();
			}
		} finally {
			setIsPrinting(false);
		}
	};

	const handleDownloadPdf = () => {
		if (onDownloadPdf) {
			onDownloadPdf();
			return;
		}
		// Fallback to window.print for printing/PDF export via browser printer
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col justify-start items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="outpatient-card-print-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Печать амбулаторной карты 043/у"
		>
			<div className="relative w-full max-w-[1020px] bg-[var(--paper)] text-[var(--ink)] rounded-none sm:rounded-xl shadow-2xl border border-[var(--line)] flex flex-col my-auto overflow-hidden">
				{/* Header */}
				<header className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
							<FileText size={18} />
						</div>
						<div>
							<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight flex items-center gap-2">
								<span>Медицинская карта пациента (Форма 043/у)</span>
								<span
									className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
										isClosedOrSigned
											? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
											: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
									}`}
								>
									{isClosedOrSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК"}
								</span>
							</h2>
							<p className="text-[12px] text-[var(--muted)]">
								Пациент: <strong>{pt.fullName}</strong> · Карта: <strong>{pt.cardNumber}</strong> · {todayRu}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							disabled={isPrinting}
							className="primary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
							data-testid="outpatient-card-print-btn"
							title="Распечатать карту 043/у"
						>
							<Printer size={15} />
							<span>Печать карты</span>
						</button>

						<button
							type="button"
							onClick={handleDownloadPdf}
							className="secondary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
							data-testid="outpatient-card-pdf-btn"
							title="Сохранить в PDF"
						>
							<Download size={15} />
							<span>Экспорт PDF</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
							data-testid="outpatient-card-close-btn"
							aria-label="Закрыть окно"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Modal Body */}
				<main className="p-0 sm:p-4 max-h-[85vh] overflow-y-auto bg-[var(--paper-soft)] flex justify-center">
					<ProfessionalDocumentA4Sheet
						activeTab="medical_card"
						onTabChange={() => {}}
						medicalCardData={cardData}
						contractData={{
							clinic: cardData.clinic,
							patient: cardData.patient,
							contractNumber: `Д-043/${pt.cardNumber}`,
							contractDate: todayRu,
							estimatedTotalRub: 0,
							services: [],
						}}
						actData={{
							clinic: cardData.clinic,
							patient: cardData.patient,
							actNumber: `А-043/${pt.cardNumber}`,
							actDate: todayRu,
							contractNumber: `Д-043/${pt.cardNumber}`,
							contractDate: todayRu,
							doctorFullName: doctor,
							services: [],
							totalAmountRub: 0,
						}}
						treatmentPlanData={{
							clinic: cardData.clinic,
							patient: cardData.patient,
							planNumber: `П-043/${pt.cardNumber}`,
							planDate: todayRu,
							doctorFullName: doctor,
							stages: [],
							totalCostWithoutDiscountRub: 0,
							totalCostWithDiscountRub: 0,
						}}
						onPrint={handlePrint}
					/>
				</main>
			</div>
		</div>
	);
};

OutpatientCardPrintModal.displayName = "OutpatientCardPrintModal";
