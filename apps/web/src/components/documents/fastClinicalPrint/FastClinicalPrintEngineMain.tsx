import React, { useState, useId, useCallback } from "react";
import { Printer } from "lucide-react";
import type { FastClinicalPrintEngineProps, FastPrintDocType, FastPrintClinicInfo, FastPrintPatientInfo } from "./types";
import { DEFAULT_CLINIC, DEFAULT_DOCTOR } from "./types";
import type { InsertCutLayout } from "../partisanMedicalInsertTemplate";
import { FastPrintHeader } from "./FastPrintHeader";
import { FastPrintLandlordDrawer } from "./FastPrintLandlordDrawer";
import { FastPrintSheetArea } from "./FastPrintSheetArea";
import "../fastClinicalPrint.css";

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
		licenseNumber: customClinic?.licenseNumber || clinic?.licenseNumber || DEFAULT_CLINIC.licenseNumber,
	};

	const totalServicesAmount = services.length > 0
		? services.reduce((acc, s) => acc + (s.amount || s.price * s.quantity), 0)
		: 4800;

	return (
		<div className="fast-print-modal-backdrop fast-print-portal" data-testid="fast-clinical-print-engine" role="dialog" aria-modal="true" aria-labelledby={titleId}>
			<div className="fast-print-modal-container">
				<FastPrintHeader
					titleId={titleId}
					activeDocType={activeDocType}
					setActiveDocType={setActiveDocType}
					onPrint={handlePrint}
					onClose={onClose}
				/>

				{activeDocType === "partisan_insert_043u" && (
					<FastPrintLandlordDrawer
						cutLayout={cutLayout}
						setCutLayout={setCutLayout}
						showLandlordEdit={showLandlordEdit}
						setShowLandlordEdit={setShowLandlordEdit}
						effectiveClinic={effectiveClinic}
						setCustomClinic={setCustomClinic}
					/>
				)}

				<FastPrintSheetArea
					activeDocType={activeDocType}
					effectiveClinic={effectiveClinic}
					doctor={doctor}
					effectivePatient={effectivePatient}
					visitData={visitData}
					cutLayout={cutLayout}
					services={services}
					planStages={planStages}
					totalServicesAmount={totalServicesAmount}
					fiscalData={fiscalData}
				/>

				<div className="fast-print-mobile-bottom-bar fast-print-no-print">
					<button
						type="button"
						data-testid="btn-mobile-execute-print"
						onClick={handlePrint}
						className="primary-button w-full min-h-[48px] h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md cursor-pointer"
					>
						<Printer size={18} />
						<span>Распечатать вкладыш в карту</span>
					</button>
				</div>
			</div>
		</div>
	);
};
