import type React from "react";
import { useState } from "react";
import {
	Pill,
	Printer,
	Search,
	Sparkles,
	FileText,
	CheckCircle2,
	Plus,
	ShieldCheck,
} from "lucide-react";
import {
	DENTAL_FAST_PRESCRIPTION_SETS,
	PrescriptionPrintModal,
	type DentalFastPrescriptionSet,
} from "./PrescriptionPrintModal";
import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	renderForm107_1uHtml,
	type Form107_1uPayload,
	type PrescriptionDrugItem,
	type DentalPrescriptionDrugPreset,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export interface PrescriptionsTabProps {
	patient?: any;
	doctor?: any;
	clinic?: {
		name?: string;
		legalName?: string;
		address?: string;
		phone?: string;
		ogrn?: string;
		inn?: string;
		licenseNumber?: string;
	};
	allergies?: readonly string[] | string[] | string | null | undefined;
	onPrescriptionCreated?: ((prescription: any) => void) | undefined;
}

/**
 * PrescriptionsTab — вкладка/виджет назначения рецептов (Форма 107-1/у по Приказу Минздрава РФ № 1094н).
 * 
 * Реализует:
 * - 1-клик пакеты: «Стандартный противовоспалительный курс» (Амоксиклав + Нимесил + Хлоргексидин) и «Анальгезия» (Нимесил).
 * - 1-клик мгновенную печать официального бланка 107-1/у без водяных знаков и эмодзи.
 * - Полную автономию врача (Мандат 8e): кнопки печати и сохранения никогда не блокируются.
 */
export const PrescriptionsTab: React.FC<PrescriptionsTabProps> = ({
	patient,
	doctor,
	clinic,
	allergies,
	onPrescriptionCreated,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([
		"amoxiclav_875_125",
		"nimesulide_100",
		"chlorhexidine_005",
	]);
	const [isFullModalOpen, setIsFullModalOpen] = useState(false);

	const patientName =
		patient?.fullName ||
		(patient?.firstName && patient?.lastName
			? `${patient.lastName} ${patient.firstName} ${patient.middleName || ""}`.trim()
			: "Пациент");
	const patientBirth = patient?.birthDate || patient?.birth_date || "";
	const patientCard = patient?.medicalCardNumber || patient?.card_number || "043/у";

	const doctorName =
		doctor?.fullName ||
		doctor?.name ||
		"Врач-стоматолог";
	const doctorSpecialty =
		doctor?.specialty ||
		"Врач-стоматолог";

	const clinicName =
		clinic?.legalName ||
		clinic?.name ||
		"ООО «Стоматологическая клиника»";
	const clinicAddress = clinic?.address || "г. Москва";
	const clinicPhone = clinic?.phone || "";
	const clinicOgrn = clinic?.ogrn || "";
	const clinicInn = clinic?.inn || "";
	const clinicLicense = clinic?.licenseNumber || "";

	const filteredDrugs = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((drug) => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		return (
			drug.tradeNameRu.toLowerCase().includes(q) ||
			drug.activeSubstanceRu.toLowerCase().includes(q) ||
			drug.latinRp.toLowerCase().includes(q)
		);
	});

	const handleApplySet = (set: DentalFastPrescriptionSet) => {
		setSelectedDrugIds([...set.drugIds]);
		showToast(`Выбран набор: ${set.label}`, "info", 2000);
	};

	const handleInstantPrintSet = (set: DentalFastPrescriptionSet) => {
		setSelectedDrugIds([...set.drugIds]);
		const presetItems: PrescriptionDrugItem[] = set.drugIds
			.map((id) => DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === id))
			.filter((d): d is DentalPrescriptionDrugPreset => Boolean(d))
			.map((d, index) => ({
				id: `item-${index + 1}-${d.id}`,
				latinName: d.latinRp,
				tradeName: d.tradeNameRu,
				form: d.formRu,
				dosage: d.dosageRu,
				quantity: d.quantityLabel,
				dispenseLatin: d.dispenseLatin,
				signaRussian: d.signaRu,
				category: d.category,
			}));

		const payload: Form107_1uPayload = {
			formNumber: "107-1/у",
			clinicLegalName: clinicName,
			clinicAddress: clinicAddress,
			clinicPhone: clinicPhone,
			clinicOgrn: clinicOgrn,
			clinicInn: clinicInn,
			medicalLicenseNumber: clinicLicense,
			prescriptionSeriesNumber: `РЕЦ-${new Date().getFullYear()}-${(patientCard ? patientCard.replace(/\D/g, "").slice(-4) : "").padStart(4, "0") || "0001"}`,
			prescriptionDate: new Date().toISOString().slice(0, 10),
			patientFullName: patientName,
			patientBirthDate: patientBirth,
			medicalCardNumber: patientCard,
			doctorFullName: doctorName,
			doctorSpecialty: doctorSpecialty,
			validityDays: "60",
			isChronicSpecialCare: false,
			chronicPeriodicity: null,
			items: presetItems,
			diagnosisIcd10Code: "K04.4",
			withStampAndSignature: true,
		};

		const html = renderForm107_1uHtml(payload);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
		showToast(`Печать ${set.label} (Форма 107-1/у)`, "success", 3000);
		if (onPrescriptionCreated) {
			onPrescriptionCreated(payload);
		}
	};

	const toggleDrugSelection = (drugId: string) => {
		setSelectedDrugIds((prev) =>
			prev.includes(drugId) ? prev.filter((id) => id !== drugId) : [...prev, drugId],
		);
	};

	return (
		<div className="prescriptions-tab flex flex-col gap-4 p-4" data-testid="prescriptions-tab">
			{/* Top Bar: Title & Actions */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Pill className="w-5 h-5 text-[var(--teal)]" />
					<h2 className="text-sm sm:text-base font-bold text-[var(--ink)]">
						Назначение рецептов (Приказ Минздрава РФ № 1094н)
					</h2>
				</div>
				<button
					type="button"
					onClick={() => setIsFullModalOpen(true)}
					className="px-3 py-1.5 min-h-[44px] rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-hover)] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
					data-testid="btn-open-full-prescription-modal"
				>
					<FileText className="w-4 h-4" />
					<span>Расширенный редактор бланка</span>
				</button>
			</div>

			{/* Fast Packages (1-click) */}
			<div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3.5 shadow-xs">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] mb-2.5">
					<Sparkles className="w-4 h-4 text-[var(--teal)]" />
					<span>Быстрые стоматологические комплекты (1 клик):</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
					{DENTAL_FAST_PRESCRIPTION_SETS.slice(0, 4).map((set) => {
						const isSelected =
							set.drugIds.length === selectedDrugIds.length &&
							set.drugIds.every((id) => selectedDrugIds.includes(id));
						return (
							<div
								key={set.id}
								className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none gap-2 ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-xs ring-1 ring-[var(--teal)]"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)]"
								}`}
								data-testid={`fast-prescription-card-${set.id}`}
							>
								<button
									type="button"
									onClick={() => handleApplySet(set)}
									className="flex-1 text-left cursor-pointer min-w-0"
								>
									<div className="font-bold text-xs text-[var(--ink)] truncate">
										{set.label}
									</div>
									<div className="text-[11px] text-[var(--muted)] line-clamp-2 mt-0.5">
										{set.desc}
									</div>
								</button>
								<button
									type="button"
									onClick={() => handleInstantPrintSet(set)}
									className="px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-hover)] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
									title={`Печать рецепта ${set.label} в 1 клик`}
									data-testid={`btn-instant-print-${set.id}`}
								>
									<Printer className="w-4 h-4" />
									<span className="hidden sm:inline">Печать</span>
								</button>
							</div>
						);
					})}
				</div>
			</div>

			{/* Search & Drug Catalog List */}
			<div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3.5 shadow-xs flex flex-col gap-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="relative flex-1 min-w-[200px]">
						<Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск препаратов (название, вещество, латынь)..."
							className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--teal)]"
							data-testid="input-prescription-drug-search"
						/>
					</div>
					<div className="text-xs text-[var(--muted)] font-medium">
						Выбрано препаратов: <strong className="text-[var(--ink)]">{selectedDrugIds.length}</strong>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
					{filteredDrugs.map((drug) => {
						const isSelected = selectedDrugIds.includes(drug.id);
						return (
							<button
								key={drug.id}
								type="button"
								onClick={() => toggleDrugSelection(drug.id)}
								className={`flex items-start justify-between p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)]"
										: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)]"
								}`}
								data-testid={`drug-item-${drug.id}`}
							>
								<div className="min-w-0 flex-1">
									<div className="font-bold text-xs text-[var(--ink)] truncate">
										{drug.tradeNameRu}
									</div>
									<div className="text-[10px] text-[var(--muted)] truncate">
										{drug.latinRp}
									</div>
									<div className="text-[10px] text-[var(--muted)] mt-0.5 line-clamp-1">
										{drug.signaRu}
									</div>
								</div>
								{isSelected ? (
									<CheckCircle2 className="w-4 h-4 text-[var(--teal)] shrink-0 ml-1.5" />
								) : (
									<Plus className="w-4 h-4 text-[var(--muted)] shrink-0 ml-1.5" />
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Full Modal */}
			<PrescriptionPrintModal
				isOpen={isFullModalOpen}
				onClose={() => setIsFullModalOpen(false)}
				patient={patient}
				doctorName={
					doctor?.fullName ||
					doctor?.name ||
					(typeof doctor === "string" ? doctor : null)
				}
				doctorSpecialty={doctor?.specialty || doctor?.role || null}
				doctorSnils={doctor?.snils || null}
				clinicName={clinic?.name || clinic?.legalName || null}
				clinicAddress={clinic?.address || null}
				clinicPhone={clinic?.phone || null}
				clinicOgrn={clinic?.ogrn || null}
				clinicInn={clinic?.inn || null}
				medicalLicenseNumber={clinic?.licenseNumber || null}
				allergies={allergies}
				initialSelectedDrugIds={selectedDrugIds}
				onPrescriptionCreated={onPrescriptionCreated}
			/>
		</div>
	);
};
