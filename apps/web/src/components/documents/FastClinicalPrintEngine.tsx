import React, { useState, useId, useCallback } from "react";
import {
	Printer,
	X,
	FileText,
	ShieldCheck,
	Receipt,
	Scissors,
	Building2,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import {
	RenderForm043u,
	RenderActAndReceipt,
	RenderTreatmentEstimate,
} from "./fastClinicalPrintTemplates";
import {
	RenderPartisanInsert043u,
	type InsertCutLayout,
} from "./partisanMedicalInsertTemplate";
import "./fastClinicalPrint.css";

export type FastPrintDocType =
	| "partisan_insert_043u"
	| "form043u"
	| "act_and_receipt"
	| "treatment_estimate";

export interface FastPrintPatientInfo {
	id?: string | undefined;
	fullName?: string | undefined;
	birthDate?: string | null | undefined;
	phone?: string | null | undefined;
	address?: string | null | undefined;
	cardNumber?: string | undefined;
	allergies?: string | null | undefined;
	somaticNotes?: string | null | undefined;
}

export interface FastPrintClinicInfo {
	name?: string | undefined;
	legalName?: string | undefined;
	inn?: string | null | undefined;
	ogrn?: string | null | undefined;
	address?: string | null | undefined;
	phone?: string | null | undefined;
	licenseNumber?: string | null | undefined;
}

export interface FastPrintDoctorInfo {
	fullName?: string | undefined;
	specialty?: string | null | undefined;
}

export interface FastPrintServiceItem {
	code?: string | undefined;
	name: string;
	tooth?: string | undefined;
	quantity: number;
	price: number;
	amount: number;
}

export interface FastPrintPlanStage {
	title: string;
	services: Array<{ name: string; tooth?: string | undefined; price: number }>;
	total: number;
	dueDate?: string | undefined;
}

export interface FastClinicalPrintEngineProps {
	isOpen: boolean;
	onClose: () => void;
	initialDocType?: FastPrintDocType | undefined;
	patient?: FastPrintPatientInfo | undefined;
	clinic?: FastPrintClinicInfo | undefined;
	doctor?: FastPrintDoctorInfo | undefined;
	visitData?: {
		date?: string | undefined;
		time?: string | undefined;
		toothNumber?: string | undefined;
		cavityLocalization?: string | undefined;
		diagnosis?: string | undefined;
		complaints?: string | undefined;
		objective?: string | undefined;
		treatment?: string | undefined;
		recommendations?: string | undefined;
		warrantyPeriod?: string | undefined;
	} | undefined;
	services?: FastPrintServiceItem[] | undefined;
	planStages?: FastPrintPlanStage[] | undefined;
	fiscalData?: {
		receiptNumber?: string | undefined;
		paymentType?: ("card" | "cash" | "sbp") | undefined;
		totalRub?: number | undefined;
		fiscalSign?: string | undefined;
		dateTime?: string | undefined;
	} | undefined;
	onAfterPrint?: (() => void) | undefined;
}

const DEFAULT_CLINIC: FastPrintClinicInfo = {
	name: "Стоматологическая клиника «DENTE»",
	legalName: 'ООО "ДЕНТЕ МЕДИКАЛ ГРУПП"',
	inn: "7704123456",
	ogrn: "1237700123456",
	address: "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
	phone: "+7 (495) 777-88-99",
	licenseNumber: "ЛО41-01137-77/00368421 от 14.02.2023 г.",
};

const DEFAULT_DOCTOR: FastPrintDoctorInfo = {
	fullName: "Смирнова Елена Александровна",
	specialty: "Врач-стоматолог терапевт",
};

export const FastClinicalPrintEngine: React.FC<FastClinicalPrintEngineProps> = ({
	isOpen,
	onClose,
	initialDocType = "partisan_insert_043u",
	patient,
	clinic = DEFAULT_CLINIC,
	doctor = DEFAULT_DOCTOR,
	visitData,
	services = [],
	planStages = [],
	fiscalData,
	onAfterPrint,
}) => {
	const [activeDocType, setActiveDocType] = useState<FastPrintDocType>(initialDocType);
	const [cutLayout, setCutLayout] = useState<InsertCutLayout>("a4_cut");
	const [showLandlordEdit, setShowLandlordEdit] = useState<boolean>(false);
	const [customClinic, setCustomClinic] = useState<FastPrintClinicInfo>(clinic);
	const titleId = useId();

	const handlePrint = useCallback(() => {
		if (typeof window !== "undefined") {
			window.print();
			onAfterPrint?.();
		}
	}, [onAfterPrint]);

	if (!isOpen) return null;

	const effectivePatient: FastPrintPatientInfo = {
		fullName: patient?.fullName || "Пациент Неуказанный",
		birthDate: patient?.birthDate || "15.05.1988",
		phone: patient?.phone || "+7 (900) 000-00-00",
		address: patient?.address || "г. Москва",
		cardNumber: patient?.cardNumber || "043/2026-01",
		allergies: patient?.allergies || "Не отягощен (отрицает)",
		somaticNotes: patient?.somaticNotes || "Соматически здоров",
	};

	const effectiveClinic: FastPrintClinicInfo = {
		name: customClinic?.name || clinic?.name || DEFAULT_CLINIC.name,
		legalName: customClinic?.legalName || clinic?.legalName || DEFAULT_CLINIC.legalName,
		inn: customClinic?.inn || clinic?.inn || DEFAULT_CLINIC.inn,
		ogrn: customClinic?.ogrn || clinic?.ogrn || DEFAULT_CLINIC.ogrn,
		address: customClinic?.address || clinic?.address || DEFAULT_CLINIC.address,
		phone: customClinic?.phone || clinic?.phone || DEFAULT_CLINIC.phone,
		licenseNumber:
			customClinic?.licenseNumber || clinic?.licenseNumber || DEFAULT_CLINIC.licenseNumber,
	};

	const totalServicesAmount =
		services.length > 0
			? services.reduce((acc, s) => acc + (s.amount || s.price * s.quantity), 0)
			: 4800;

	return (
		<div
			className="fast-print-modal-backdrop fast-print-portal"
			data-testid="fast-clinical-print-engine"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
		>
			<div className="fast-print-modal-container">
				{/* Тактильный хэндл шторки для мобильных экранов (Apple HIG Bottom Sheet) */}
				<div className="fast-print-mobile-handle-wrap fast-print-no-print" aria-hidden="true">
					<div className="fast-print-mobile-handle" />
				</div>

				{/* ── Главная шапка управления (1 компактный этаж) ── */}
				<div className="fast-print-header fast-print-no-print">
					<div className="fast-print-brand-group">
						<Printer size={16} className="fast-print-brand-icon" />
						<span id={titleId} className="fast-print-title">
							Печать 043/у (Приказ 834н)
						</span>
					</div>

					{/* Сегментированный переключатель документов */}
					<div className="fast-print-tabs-strip" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={activeDocType === "partisan_insert_043u"}
							data-testid="print-tab-insert043u"
							onClick={() => setActiveDocType("partisan_insert_043u")}
							className={`fast-print-tab-btn ${activeDocType === "partisan_insert_043u" ? "active" : ""}`}
						>
							<Scissors size={13} />
							<span>Вкладыш 043/у</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeDocType === "form043u"}
							data-testid="print-tab-form043u"
							onClick={() => setActiveDocType("form043u")}
							className={`fast-print-tab-btn ${activeDocType === "form043u" ? "active" : ""}`}
						>
							<FileText size={13} />
							<span>Карта 043/у</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeDocType === "act_and_receipt"}
							data-testid="print-tab-act"
							onClick={() => setActiveDocType("act_and_receipt")}
							className={`fast-print-tab-btn ${activeDocType === "act_and_receipt" ? "active" : ""}`}
						>
							<Receipt size={13} />
							<span>Акт и чек</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeDocType === "treatment_estimate"}
							data-testid="print-tab-estimate"
							onClick={() => setActiveDocType("treatment_estimate")}
							className={`fast-print-tab-btn ${activeDocType === "treatment_estimate" ? "active" : ""}`}
						>
							<ShieldCheck size={13} />
							<span>Смета</span>
						</button>
					</div>

					{/* Кнопки действий (ПК + Закрытие) */}
					<div className="fast-print-actions-group">
						<button
							type="button"
							data-testid="btn-execute-fast-print"
							onClick={handlePrint}
							className="fast-print-primary-btn fast-print-desktop-only"
							title="Мгновенный вывод на принтер (0 мс)"
						>
							<Printer size={14} />
							<span>Печать</span>
						</button>
						<button
							type="button"
							data-testid="btn-close-fast-print"
							onClick={onClose}
							className="fast-print-close-btn"
							aria-label="Закрыть окно печати"
							title="Закрыть предпросмотр"
						>
							<X size={16} />
						</button>
					</div>
				</div>

				{/* ── Контекстная панель вкладыша 043/у: формат отреза и реквизиты клиники-арендодателя ── */}
				{activeDocType === "partisan_insert_043u" && (
					<div className="fast-print-subbar fast-print-no-print">
						<div className="fast-print-format-group">
							<span className="fast-print-subbar-label">Формат:</span>
							<div className="fast-print-format-pills">
								<button
									type="button"
									data-testid="btn-format-a4-cut"
									onClick={() => setCutLayout("a4_cut")}
									className={`fast-print-pill-btn ${cutLayout === "a4_cut" ? "active" : ""}`}
								>
									<Scissors size={12} />
									<span>А4 с отрезом</span>
								</button>
								<button
									type="button"
									data-testid="btn-format-a5-direct"
									onClick={() => setCutLayout("a5_direct")}
									className={`fast-print-pill-btn ${cutLayout === "a5_direct" ? "active" : ""}`}
								>
									<FileText size={12} />
									<span>А5 вклейка</span>
								</button>
							</div>
						</div>

						<button
							type="button"
							data-testid="btn-toggle-landlord-override"
							onClick={() => setShowLandlordEdit(!showLandlordEdit)}
							className="fast-print-landlord-btn"
						>
							<Building2 size={13} className="fast-print-brand-icon" />
							<span>Клиника-арендодатель</span>
							{showLandlordEdit ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
						</button>
					</div>
				)}

				{/* Выдвижная панель настройки реквизитов клиники-арендодателя */}
				{activeDocType === "partisan_insert_043u" && showLandlordEdit && (
					<div
						className="fast-print-landlord-drawer fast-print-no-print"
						data-testid="landlord-override-drawer"
					>
						<div className="fast-print-landlord-grid">
							<div className="fast-print-field">
								<label className="fast-print-field-label">Название клиники в шапке 043/у</label>
								<input
									type="text"
									data-testid="input-landlord-name"
									value={effectiveClinic.name}
									onChange={(e) =>
										setCustomClinic((prev) => ({ ...prev, name: e.target.value }))
									}
									className="fast-print-input"
								/>
							</div>
							<div className="fast-print-field">
								<label className="fast-print-field-label">ИНН организации</label>
								<input
									type="text"
									data-testid="input-landlord-inn"
									value={effectiveClinic.inn || ""}
									onChange={(e) =>
										setCustomClinic((prev) => ({ ...prev, inn: e.target.value }))
									}
									className="fast-print-input"
								/>
							</div>
							<div className="fast-print-field">
								<label className="fast-print-field-label">Номер медицинской лицензии</label>
								<input
									type="text"
									data-testid="input-landlord-license"
									value={effectiveClinic.licenseNumber || ""}
									onChange={(e) =>
										setCustomClinic((prev) => ({
											...prev,
											licenseNumber: e.target.value,
										}))
									}
									className="fast-print-input"
								/>
							</div>
						</div>
					</div>
				)}

				{/* ── Область холста документа ── */}
				<div className="fast-print-preview-scroll">
					<div
						className="fast-print-a4-sheet"
						data-testid="fast-print-active-sheet"
					>
						{activeDocType === "partisan_insert_043u" && (
							<RenderPartisanInsert043u
								clinic={effectiveClinic}
								doctor={doctor}
								patient={effectivePatient}
								visitData={visitData}
								cutLayout={cutLayout}
							/>
						)}
						{activeDocType === "form043u" && (
							<RenderForm043u
								clinic={effectiveClinic}
								doctor={doctor}
								patient={effectivePatient}
								visitData={visitData}
							/>
						)}
						{activeDocType === "act_and_receipt" && (
							<RenderActAndReceipt
								clinic={effectiveClinic}
								doctor={doctor}
								patient={effectivePatient}
								services={services}
								totalAmount={totalServicesAmount}
								fiscalData={fiscalData}
							/>
						)}
						{activeDocType === "treatment_estimate" && (
							<RenderTreatmentEstimate
								clinic={effectiveClinic}
								doctor={doctor}
								patient={effectivePatient}
								planStages={planStages}
								totalAmount={totalServicesAmount}
							/>
						)}
					</div>
				</div>

				{/* ── Нижняя панель действия для смартфона (Apple HIG Natural Thumb Zone) ── */}
				<div className="fast-print-mobile-bottom-bar fast-print-no-print">
					<button
						type="button"
						data-testid="btn-mobile-execute-print"
						onClick={handlePrint}
						className="fast-print-mobile-cta-btn"
					>
						<Printer size={16} />
						<span>Распечатать вкладыш 043/у</span>
					</button>
				</div>
			</div>
		</div>
	);
};
