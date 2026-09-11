import {
	DENTAL_PRESCRIPTION_EXPRESS_BUNDLES,
	type DentalPrescriptionExpressBundle,
	createPrescriptionDrugItemsFromBundle,
	evaluatePrescriptionPharmacologicalSafety,
	generatePrescriptionPayloadFromBundle,
	getDentalPrescriptionExpressBundle,
	renderForm107_1uHtml,
} from "@dental/shared";
import {
	AlertCircle,
	AlertTriangle,
	ArrowRightLeft,
	CheckCircle2,
	Clock,
	FileText,
	HeartPulse,
	Pill,
	Plus,
	Printer,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	type PrescriptionFormType,
	PrescriptionPrintModal,
} from "../prescriptions/PrescriptionPrintModal";
import {
	POST_OP_CARE_SHEETS,
	type PostOpCareSheetType,
	PostOpCareSheetModal,
} from "./PostOpCareSheetModal";

export interface PrescriptionsWidgetProps {
	readonly patient: {
		readonly id?: string | null;
		readonly fullName?: string | null;
		readonly birthDate?: string | null;
		readonly cardNumber?: string | null;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly snils?: string | null;
		readonly omsPolicy?: string | null;
	} | null;
	readonly diagnosisIcd10?: string | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
	readonly doctorSnils?: string | null;
	readonly clinicName?: string | null;
	readonly clinicAddress?: string | null;
	readonly clinicPhone?: string | null;
	readonly clinicOgrn?: string | null;
	readonly clinicInn?: string | null;
	readonly medicalLicenseNumber?: string | null;
	readonly initialDrugs?: readonly string[];
}

export const PrescriptionsWidget: React.FC<PrescriptionsWidgetProps> = ({
	patient,
	diagnosisIcd10 = "K08.1",
	doctorName = "Д-р Смирнова Анна Сергеевна",
	doctorSpecialty = "Врач-стоматолог-терапевт",
	doctorSnils,
	clinicName = "ООО «ДЕНТЕ» / Стоматологическая клиника",
	clinicAddress = "г. Москва, ул. Клиническая, д. 10",
	clinicPhone = "",
	clinicOgrn = "1157746123456",
	clinicInn = "7701123456",
	medicalLicenseNumber = "ЛО-77-01-019842",
	initialDrugs = ["nimesulide_100"],
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeFormType, setActiveFormType] = useState<PrescriptionFormType>("107-1u");

	// Express bundle state
	const [activeBundleId, setActiveBundleId] = useState<string>("surgical");
	const [penicillinAllergy, setPenicillinAllergy] = useState<boolean>(false);
	const [useAlternative, setUseAlternative] = useState<boolean>(false);

	// Post-Op Care sheet modal state
	const [isPostOpModalOpen, setIsPostOpModalOpen] = useState<boolean>(false);
	const [postOpSheetType, setPostOpSheetType] = useState<PostOpCareSheetType>("surgical");

	const activeBundle = useMemo(
		() => getDentalPrescriptionExpressBundle(activeBundleId),
		[activeBundleId],
	);

	// Effective alternative flag
	const isAltActive = activeBundleId === "surgical" ? penicillinAllergy : useAlternative;

	const bundleDrugItems = useMemo(() => {
		return createPrescriptionDrugItemsFromBundle(activeBundleId, {
			penicillinAllergy,
			useAlternative: isAltActive,
		});
	}, [activeBundleId, penicillinAllergy, isAltActive]);

	const patientAgeYears = useMemo(() => {
		if (!patient?.birthDate) return 30;
		const birth = new Date(patient.birthDate);
		const diff = Date.now() - birth.getTime();
		const ageDate = new Date(diff);
		return Math.abs(ageDate.getUTCFullYear() - 1970);
	}, [patient?.birthDate]);

	const safetyReport = useMemo(() => {
		// Evaluate safety for the active bundle items
		const drugIds = bundleDrugItems.map((item) => {
			const id = item.id.replace(/^bundle-[^-]+-/, "");
			return id;
		});
		return evaluatePrescriptionPharmacologicalSafety({
			drugIds,
			patientAgeYears,
		});
	}, [bundleDrugItems, patientAgeYears]);

	const handleOpenModal = (formType: PrescriptionFormType) => {
		setActiveFormType(formType);
		setIsModalOpen(true);
	};

	const handleSelectBundle = (bundleId: string) => {
		setActiveBundleId(bundleId);
		setUseAlternative(false);
		if (bundleId === "surgical") {
			setPostOpSheetType("surgical");
		} else if (bundleId === "endo-pain") {
			setPostOpSheetType("endo");
		} else if (bundleId === "perio") {
			setPostOpSheetType("hygiene");
		}
	};

	const handleToggleAlternative = () => {
		if (activeBundleId === "surgical") {
			setPenicillinAllergy((prev) => !prev);
		} else {
			setUseAlternative((prev) => !prev);
		}
	};

	const handleOpenPostOpCare = (sheetType?: PostOpCareSheetType) => {
		if (sheetType) {
			setPostOpSheetType(sheetType);
		} else if (activeBundleId === "surgical") {
			setPostOpSheetType("surgical");
		} else if (activeBundleId === "endo-pain") {
			setPostOpSheetType("endo");
		} else if (activeBundleId === "perio") {
			setPostOpSheetType("hygiene");
		}
		setIsPostOpModalOpen(true);
	};

	const handlePrintBundlePrescription = () => {
		try {
			const payload = generatePrescriptionPayloadFromBundle(activeBundleId, {
				clinic: {
					fullName: clinicName || "ООО «ДЕНТЕ» / Стоматологическая клиника",
					address: clinicAddress,
					phone: clinicPhone,
					ogrn: clinicOgrn,
					inn: clinicInn,
					medicalLicenseNumber,
				},
				patient: {
					fullName: patient?.fullName || "Пациент (ФИО)",
					birthDate: patient?.birthDate || "1990-01-01",
					medicalCardNumber: patient?.cardNumber || "043/у-Б/Н",
					address: patient?.address || null,
				},
				doctor: {
					fullName: doctorName || "Д-р Смирнова Анна Сергеевна",
					specialty: doctorSpecialty || "Врач-стоматолог-терапевт",
					snils: doctorSnils || null,
				},
				diagnosisIcd10: diagnosisIcd10 || "K08.1",
				penicillinAllergy,
				useAlternative: isAltActive,
				withStampAndSignature: true,
			});

			const html = renderForm107_1uHtml(payload);
			const printWindow = window.open("", "_blank", "width=850,height=900");
			if (printWindow) {
				printWindow.document.open();
				printWindow.document.write(html);
				printWindow.document.close();
				printWindow.focus();
				setTimeout(() => {
					printWindow.print();
				}, 250);
			} else {
				showToast("Разрешите всплывающие окна для печати рецепта 107-1/у", "warning");
			}
		} catch (err) {
			showToast("Ошибка генерации рецептурного бланка 107-1/у", "error");
		}
	};

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
			{/* Top Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
						<Pill className="h-5 w-5" />
					</div>
					<div>
						<h3 className="text-base font-semibold text-slate-900 dark:text-white">
							Электронные рецепты (Приказ Минздрава № 1094н)
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Экспресс-пакеты в 1 клик, бланки 107-1/у, 148-1/у-88 (ПКУ), 148-1/у-04(л) и памятки ухода
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						data-testid="open-post-op-care-btn"
						onClick={() => handleOpenPostOpCare()}
						className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300 transition-colors"
					>
						<HeartPulse className="h-4 w-4 text-teal-600 dark:text-teal-400" />
						Памятка пациенту (Post-Op)
					</button>

					<button
						type="button"
						onClick={() => handleOpenModal("107-1u")}
						className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
					>
						<Plus className="h-4 w-4" />
						Конструктор 107-1/у
					</button>
					<button
						type="button"
						onClick={() => handleOpenModal("148-1u-88")}
						className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300 transition-colors"
					>
						<ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
						Бланк ПКУ (148-1/у-88)
					</button>
					<button
						type="button"
						onClick={() => handleOpenModal("148-1u-04l")}
						className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 transition-colors"
					>
						<FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
						Льготный (148-1/у-04)
					</button>
				</div>
			</div>

			{/* Feature 223: 1-Click Express Prescription Bundles Section */}
			<div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/30 p-4 dark:border-teal-900/30 dark:bg-teal-950/10">
				<div className="flex flex-wrap items-center justify-between gap-3 mb-3">
					<div className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
						<span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
							Экспресс-пакеты назначений (1 клик — Приказ № 1094н):
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							data-testid="print-bundle-rx-btn"
							onClick={handlePrintBundlePrescription}
							className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-800 transition-colors"
						>
							<Printer className="h-3.5 w-3.5" />
							Печать рецепта 107-1/у (1 клик)
						</button>
					</div>
				</div>

				{/* 4 Express Bundle Selector Buttons (1 row, high contrast, 0 disabled) */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
					{DENTAL_PRESCRIPTION_EXPRESS_BUNDLES.map((bundle) => {
						const isSelected = bundle.id === activeBundleId;
						return (
							<button
								key={bundle.id}
								type="button"
								data-testid={bundle.testId}
								onClick={() => handleSelectBundle(bundle.id)}
								className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
									isSelected
										? "border-teal-600 bg-white shadow-md ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-slate-800 dark:ring-teal-400/20"
										: "border-slate-200 bg-white/70 hover:border-teal-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800"
								}`}
							>
								<div className="flex w-full items-center justify-between mb-1">
									<span
										className={`text-xs font-bold ${
											isSelected
												? "text-teal-700 dark:text-teal-300"
												: "text-slate-800 dark:text-slate-200"
										}`}
									>
										{bundle.titleRu}
									</span>
									{isSelected && (
										<CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
									)}
								</div>
								<p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
									{bundle.descriptionRu}
								</p>
							</button>
						);
					})}
				</div>

				{/* Active Bundle Contents and Alternative Switcher */}
				{activeBundle && (
					<div className="mt-3.5 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
						<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3 dark:border-slate-800">
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-slate-900 dark:text-white">
									Препараты в пакете «{activeBundle.titleRu}»:
								</span>
								<span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
									Срок действия: {activeBundle.defaultValidityDays} дней
								</span>
							</div>

							{/* Alternative toggle button */}
							<button
								type="button"
								data-testid="toggle-penicillin-alternative-btn"
								onClick={handleToggleAlternative}
								className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
									isAltActive
										? "border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
										: "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
								}`}
							>
								<ArrowRightLeft className="h-3 w-3" />
								{activeBundleId === "surgical"
									? isAltActive
										? "Аллергия на пенициллин: Включен Ципролет 500 мг"
										: "Аллергия на пенициллин (заменить на Ципролет)"
									: isAltActive
										? "Альтернативный препарат: Включен"
										: "Использовать альтернативный препарат"}
							</button>
						</div>

						{/* Drug items display */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
							{bundleDrugItems.map((item, idx) => (
								<div
									key={item.id || idx}
									className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5 text-xs dark:border-slate-800/80 dark:bg-slate-800/40"
								>
									<div className="font-bold text-slate-900 dark:text-white">
										{item.tradeName || item.latinName}
									</div>
									<div className="font-mono text-[11px] italic text-slate-600 dark:text-slate-300">
										{item.latinName}
									</div>
									<div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
										{item.form}, {item.dosage} • {item.quantity}
									</div>
									<div className="mt-1 text-[10.5px] text-teal-800 dark:text-teal-300 font-medium bg-teal-50/80 dark:bg-teal-950/30 p-1.5 rounded">
										{item.signaRussian}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Pharmacological Safety Audit Bar */}
			<div className="mt-4">
				{safetyReport.hasContraindications ? (
					<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
						<div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-400">
							<AlertCircle className="h-4 w-4 shrink-0" />
							<span>Обнаружены противопоказания или критические взаимодействия (DDI):</span>
						</div>
						<ul className="mt-1.5 list-disc pl-5 space-y-1">
							{safetyReport.ageContraindications.map((c, i) => (
								<li key={i}>{c}</li>
							))}
							{safetyReport.interactions
								.filter((it) => it.severity === "contraindicated")
								.map((it, i) => (
									<li key={i}>
										<strong>{it.titleRu}:</strong> {it.descriptionRu}
									</li>
								))}
						</ul>
					</div>
				) : safetyReport.interactions.length > 0 ? (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
						<div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
							<AlertTriangle className="h-4 w-4 shrink-0" />
							<span>Внимание: потенциальное межлекарственное взаимодействие:</span>
						</div>
						<ul className="mt-1.5 list-disc pl-5 space-y-1">
							{safetyReport.interactions.map((it, i) => (
								<li key={i}>
									<strong>{it.titleRu}:</strong> {it.recommendationRu}
								</li>
							))}
						</ul>
					</div>
				) : (
					<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
						<ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Фармакологический аудит пройден: ВРД/ВСД соблюдены, конфликтов DDI не обнаружено.</span>
					</div>
				)}
			</div>

			{/* Full Statutory Prescription Modal */}
			<PrescriptionPrintModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				patient={patient}
				diary={{
					diagnosisIcd10: diagnosisIcd10 ?? null,
				}}
				doctorName={doctorName ?? null}
				doctorSpecialty={doctorSpecialty ?? null}
				doctorSnils={doctorSnils ?? null}
				clinicName={clinicName ?? null}
				clinicAddress={clinicAddress ?? null}
				clinicPhone={clinicPhone ?? null}
				clinicOgrn={clinicOgrn ?? null}
				clinicInn={clinicInn ?? null}
				medicalLicenseNumber={medicalLicenseNumber ?? null}
			/>

			{/* Post-Op Care Sheet Modal */}
			<PostOpCareSheetModal
				isOpen={isPostOpModalOpen}
				onClose={() => setIsPostOpModalOpen(false)}
				defaultSheetType={postOpSheetType}
				patient={patient}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				clinicName={clinicName}
				clinicAddress={clinicAddress}
				clinicPhone={clinicPhone}
			/>
		</div>
	);
};
