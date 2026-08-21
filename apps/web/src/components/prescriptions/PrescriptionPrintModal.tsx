import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	type DentalPrescriptionDrugPreset,
	type Form107_1uPayload,
	type PrescriptionDrugItem,
	generatePrescriptionPayloadFromSoap,
	renderForm107_1uHtml,
} from "@dental/shared";
import {
	AlertCircle,
	Calendar,
	Check,
	Clock,
	FileCheck,
	FileText,
	Filter,
	MapPin,
	Pill,
	Plus,
	Printer,
	QrCode,
	Search,
	ShieldAlert,
	Sparkles,
	Trash2,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DiaryState } from "../useVisitDiaryLogic";

export type PrescriptionFormType = "107-1u" | "148-1u";

export interface PrescriptionPrintModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient: {
		fullName?: string | null;
		birthDate?: string | null;
		cardNumber?: string | null;
		medicalCardNumber?: string | null;
		passport?: string | null;
		address?: string | null;
		phone?: string | null;
		gender?: string | null;
	} | null;
	diary?: DiaryState | {
		diagnosisIcd10?: string | null;
		treatmentDescription?: string | null;
		anamnesis?: string | null;
		statusLocalis?: string | null;
	} | null;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
	clinicName?: string | null;
	clinicAddress?: string | null;
	clinicPhone?: string | null;
	clinicOgrn?: string | null;
	clinicInn?: string | null;
}

/** Controlled / Potent Drug Presets for Form 148-1/u-88 (ПКУ) */
const CONTROLLED_DRUG_PRESETS: readonly DentalPrescriptionDrugPreset[] = [
	{
		id: "tramadol_50",
		tradeNameRu: "Трамадол (Трамал)",
		activeSubstanceRu: "Трамадол",
		category: "nsaid",
		categoryLabel: "Опиоидный анальгетик (ПКУ)",
		latinRp: "Rp.: Tramadoli 50 mg",
		formRu: "капсулы",
		dosageRu: "50 мг",
		quantityLabel: "N. 10 (капсулы)",
		dispenseLatin: "D.t.d. N 10 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (50 мг) при некупируемом выраженном болевом синдроме после травматичной операции, не более 400 мг в сутки.",
		recommendedForIcd10: ["K08.1", "K04.4"],
	},
	{
		id: "diazepam_5",
		tradeNameRu: "Диазепам (Реланиум / Сибазон)",
		activeSubstanceRu: "Диазепам",
		category: "other",
		categoryLabel: "Анксиолитик / Седативное (ПКУ)",
		latinRp: "Rp.: Tab. Diazepami 0.005",
		formRu: "таблетки",
		dosageRu: "5 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (5 мг) на ночь накануне сложной костно-пластической операции при выраженной дентофобии.",
		recommendedForIcd10: ["Z01.2"],
	},
	{
		id: "pregabalin_75",
		tradeNameRu: "Прегабалин (Лирика)",
		activeSubstanceRu: "Прегабалин",
		category: "other",
		categoryLabel: "Противосудорожное / Нейропатическая боль (ПКУ)",
		latinRp: "Rp.: Caps. Pregabalini 75 mg",
		formRu: "капсулы",
		dosageRu: "75 мг",
		quantityLabel: "N. 14 (капсулы)",
		dispenseLatin: "D.t.d. N 14 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (75 мг) 2 раза в сутки при стойкой тригеминальной невралгии / посттравматической нейропатии нижнеальвеолярного нерва.",
		recommendedForIcd10: ["G50.0", "K08.1"],
	},
];

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
	isOpen,
	onClose,
	patient,
	diary,
	doctorName,
	doctorSpecialty,
	clinicName,
	clinicAddress,
	clinicPhone,
	clinicOgrn,
	clinicInn,
}) => {
	const [activeForm, setActiveForm] = useState<PrescriptionFormType>("107-1u");
	const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
	const [customSeriesNumber, setCustomSeriesNumber] = useState<string>("");
	const [prescriptionDate, setPrescriptionDate] = useState<string>("");
	const [validityDays, setValidityDays] = useState<"15" | "60" | "365">("60");
	const [isChronicSpecialCare, setIsChronicSpecialCare] = useState<boolean>(false);
	const [chronicPeriodicity, setChronicPeriodicity] = useState<string>("ежемесячно (1 раз в 30 дней)");
	const [patientAddress, setPatientAddress] = useState<string>("");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

	// Custom drug item draft
	const [customTradeName, setCustomTradeName] = useState<string>("");
	const [customLatinRp, setCustomLatinRp] = useState<string>("");
	const [customDispense, setCustomDispense] = useState<string>("");
	const [customSigna, setCustomSigna] = useState<string>("");

	const [customDrugsList, setCustomDrugsList] = useState<PrescriptionDrugItem[]>([]);

	useEffect(() => {
		if (!isOpen) return;

		const today = new Date().toISOString().slice(0, 10);
		setPrescriptionDate(today);

		const icd = (diary?.diagnosisIcd10 || "K02.1").toUpperCase();
		const matching = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			d.recommendedForIcd10.some((code) => icd.startsWith(code)),
		);
		if (matching.length > 0) {
			setSelectedDrugIds(matching.slice(0, 2).map((d) => d.id));
		} else {
			setSelectedDrugIds(["nimesulide_100"]);
		}

		setCustomSeriesNumber(
			activeForm === "107-1u"
				? `РЕЦ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
				: `ПКУ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
		);

		setPatientAddress(patient?.address || "г. Москва, ул. Ленина, д. 15, кв. 42");

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, diary?.diagnosisIcd10, activeForm, patient?.address, onClose]);

	const patientName = patient?.fullName || "Пациент";
	const patientBirth = patient?.birthDate || "1990-01-01";
	const patientCard = patient?.medicalCardNumber || patient?.cardNumber || "043/у-2026/01";
	const docName = doctorName || "Д-р Иванов Иван Иванович";
	const docSpecialty = doctorSpecialty || "Врач-стоматолог терапевт";
	const clinic = clinicName || 'ООО «Денте Стоматология»';
	const address = clinicAddress || "г. Москва, Клинический переулок, д. 7";
	const phone = clinicPhone || "+7 (495) 777-22-11";
	const ogrn = clinicOgrn || "1207700123456";
	const inn = clinicInn || "7701234567";

	const fullCatalog = useMemo(() => {
		if (activeForm === "148-1u") {
			return CONTROLLED_DRUG_PRESETS;
		}
		return DENTAL_PRESCRIPTION_DRUG_CATALOG;
	}, [activeForm]);

	const filteredCatalog = useMemo(() => {
		return fullCatalog.filter((drug) => {
			const matchesSearch =
				searchQuery === "" ||
				drug.tradeNameRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
				drug.activeSubstanceRu.toLowerCase().includes(searchQuery.toLowerCase()) ||
				drug.latinRp.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory =
				categoryFilter === "all" || drug.category === categoryFilter;
			return matchesSearch && matchesCategory;
		});
	}, [fullCatalog, searchQuery, categoryFilter]);

	const toggleDrug = (id: string) => {
		if (activeForm === "148-1u") {
			// 148-1/u strictly permits only 1 drug item
			setSelectedDrugIds([id]);
			return;
		}
		setSelectedDrugIds((prev) => {
			if (prev.includes(id)) {
				return prev.filter((x) => x !== id);
			}
			if (prev.length >= 3) {
				// Max 3 items on Form 107-1/u
				return [...prev.slice(1), id];
			}
			return [...prev, id];
		});
	};

	const handleAddCustomDrug = () => {
		if (!customLatinRp.trim() || !customSigna.trim()) return;
		const newItem: PrescriptionDrugItem = {
			id: `custom-drug-${Date.now()}`,
			latinName: customLatinRp.startsWith("Rp.:") ? customLatinRp : `Rp.: ${customLatinRp}`,
			tradeName: customTradeName.trim() || "Индивидуальная пропись",
			form: "порошок/раствор",
			dosage: "по рецепту",
			quantity: "N. 1",
			dispenseLatin: customDispense.trim() || "D.t.d. N 1",
			signaRussian: customSigna.startsWith("S.") ? customSigna : `S. ${customSigna}`,
			category: "other",
		};
		setCustomDrugsList((prev) => [...prev, newItem]);
		setCustomLatinRp("");
		setCustomTradeName("");
		setCustomDispense("");
		setCustomSigna("");
		setIsAddingCustom(false);
	};

	const removeCustomDrug = (id: string) => {
		setCustomDrugsList((prev) => prev.filter((d) => d.id !== id));
	};

	// Active drugs combined
	const activeItems = useMemo<PrescriptionDrugItem[]>(() => {
		const fromCatalog: PrescriptionDrugItem[] = fullCatalog
			.filter((d) => selectedDrugIds.includes(d.id))
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

		const combined = [...fromCatalog, ...customDrugsList];
		if (activeForm === "148-1u") {
			return combined.slice(0, 1);
		}
		return combined.slice(0, 3);
	}, [fullCatalog, selectedDrugIds, customDrugsList, activeForm]);

	const generatePrintHtml = useCallback((): string => {
		if (activeForm === "107-1u") {
			const payload: Form107_1uPayload = {
				formNumber: "107-1/у",
				clinicLegalName: clinic,
				clinicAddress: address,
				clinicPhone: phone,
				clinicOgrn: ogrn,
				clinicInn: inn,
				prescriptionSeriesNumber: customSeriesNumber,
				prescriptionDate: prescriptionDate,
				patientFullName: patientName,
				patientBirthDate: patientBirth,
				medicalCardNumber: patientCard,
				doctorFullName: docName,
				doctorSpecialty: docSpecialty,
				validityDays: validityDays,
				isChronicSpecialCare: isChronicSpecialCare,
				chronicPeriodicity: isChronicSpecialCare ? chronicPeriodicity : undefined,
				items: activeItems.length > 0 ? activeItems : [
					{
						id: "fallback-1",
						latinName: "Rp.: Nimesulidi 100 mg",
						tradeName: "Нимесил",
						form: "гранулы",
						dosage: "100 мг",
						quantity: "N. 10",
						dispenseLatin: "D.t.d. N 10 in gran.",
						signaRussian: "S. По 1 пакетику 2 раза в день после еды при болях.",
						category: "nsaid",
					},
				],
				diagnosisIcd10Code: diary?.diagnosisIcd10 || "K02.1",
			};
			return renderForm107_1uHtml(payload);
		}

		// Form 148-1/u-88 HTML Renderer
		const item = activeItems[0] || {
			latinName: "Rp.: Tramadoli 50 mg",
			tradeName: "Трамадол",
			dispenseLatin: "D.t.d. N 10 in caps.",
			signaRussian: "S. По 1 капсуле при выраженном болевом синдроме.",
		};

		return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Рецептурный бланк 148-1/у-88 № ${customSeriesNumber}</title>
<style>
  @page { size: A5 portrait; margin: 8mm; }
  body { font-family: "Times New Roman", Times, serif; color: #000; margin: 0; padding: 0; background: #fff; line-height: 1.25; font-size: 9pt; }
  .recipe-container { max-width: 140mm; margin: 0 auto; border: 1.5pt solid #000; padding: 6mm 6mm; box-sizing: border-box; }
  .recipe-header { display: flex; justify-content: space-between; border-bottom: 1.5pt solid #000; padding-bottom: 4px; margin-bottom: 6px; }
  .stamp-box { width: 55%; font-size: 7.5pt; border: 1px dashed #666; padding: 4px; line-height: 1.2; }
  .form-title-box { width: 42%; text-align: right; font-size: 7pt; line-height: 1.15; }
  .title-main { text-align: center; font-weight: bold; font-size: 11pt; letter-spacing: 1px; text-transform: uppercase; margin: 4px 0; }
  .grid-meta { font-size: 8.5pt; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
  .rp-zone { min-height: 48mm; padding: 4px 0; font-size: 9.5pt; }
  .rp-item-latin { font-weight: bold; font-style: italic; font-size: 10pt; }
  .rp-item-dispense { margin-left: 20px; font-style: italic; }
  .rp-item-signa { margin-left: 20px; font-family: Arial, sans-serif; font-size: 8.5pt; margin-top: 2px; }
  .seals-zone { border-top: 1.5pt solid #000; padding-top: 4px; font-size: 7.5pt; }
  .tri-seals { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; }
  .seal-circle { width: 44px; height: 44px; border: 1px dashed #444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 7.5pt; text-align: center; }
</style>
</head>
<body>
<div class="recipe-container">
  <div class="recipe-header">
    <div class="stamp-box">
      <strong>${clinic}</strong><br>
      Адрес: ${address}<br>
      Тел: ${phone} | ОГРН: ${ogrn}<br>
      <em>(Штамп медицинской организации)</em>
    </div>
    <div class="form-title-box">
      Министерство здравоохранения РФ<br>
      Медицинская документация<br>
      <strong>Форма бланка № 148-1/у-88</strong><br>
      Утв. приказом Минздрава России<br>
      от 24.11.2021 г. № 1094н
    </div>
  </div>

  <div class="title-main">РЕЦЕПТ (ПКУ)</div>
  <div style="text-align:center; font-size:8pt; margin-bottom:6px;">
    Серия и номер: <strong>${customSeriesNumber}</strong> от <strong>${prescriptionDate}</strong>
  </div>

  <div class="grid-meta">
    <div>Ф.И.О. пациента: <strong>${patientName}</strong> (д.р. ${patientBirth})</div>
    <div>Адрес проживания: <strong>${patientAddress}</strong></div>
    <div>№ Медицинской карты: <strong>${patientCard}</strong></div>
    <div>Ф.И.О. лечащего врача: <strong>${docName}</strong> (${docSpecialty})</div>
  </div>

  <div class="rp-zone">
    <div class="rp-item-latin">1. ${item.latinName}</div>
    <div class="rp-item-dispense">${item.dispenseLatin}</div>
    <div class="rp-item-signa">${item.signaRussian}</div>
    <div style="margin-left:20px; font-size:7.5pt; color:#444; margin-top:3px;">
      [Торговое наименование: <strong>${item.tradeName}</strong>]
    </div>
  </div>

  <div class="seals-zone">
    <div><strong>Срок действия рецепта: 15 дней</strong> (бланк строгой отчетности ПКУ).</div>
    <div class="tri-seals">
      <div>
        <div>Подпись и личная печать врача: ______________</div>
        <div style="margin-top:4px;">Подпись зав. отделением: __________________</div>
      </div>
      <div class="seal-circle">М.П.<br>Врача</div>
      <div class="seal-circle">Для<br>рецептов</div>
    </div>
  </div>
</div>
</body>
</html>`;
	}, [
		activeForm,
		clinic,
		address,
		phone,
		ogrn,
		inn,
		customSeriesNumber,
		prescriptionDate,
		patientName,
		patientBirth,
		patientCard,
		patientAddress,
		docName,
		docSpecialty,
		validityDays,
		isChronicSpecialCare,
		chronicPeriodicity,
		activeItems,
		diary?.diagnosisIcd10,
	]);

	const handlePrint = () => {
		const printHtml = generatePrintHtml();
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
			frameDoc.open();
			frameDoc.write(printHtml);
			frameDoc.close();
			setTimeout(() => {
				printFrame.contentWindow?.focus();
				printFrame.contentWindow?.print();
				setTimeout(() => {
					document.body.removeChild(printFrame);
				}, 1000);
			}, 250);
		}
	};

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Печать рецептурного бланка"
			data-testid="prescription-print-modal"
		>
			<div className="flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* ── Modal Header ── */}
				<div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-subtle,var(--line))] text-[var(--teal)] shrink-0 shadow-sm">
							<Pill className="w-6 h-6" />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base md:text-lg font-bold text-[var(--ink)]">
									Рецептурный бланк Минздрава РФ
								</h2>
								<span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-subtle,var(--line))]">
									Приказ № 1094н
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] line-clamp-1">
								{patientName} · Карта: {patientCard} · Диагноз: {diary?.diagnosisIcd10 || "K02.1"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Form Switcher Tabs (min-h-[44px]) */}
						<div className="hidden sm:flex items-center p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
							<button
								type="button"
								onClick={() => {
									setActiveForm("107-1u");
									setValidityDays("60");
									setCustomSeriesNumber(
										`РЕЦ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
									);
								}}
								className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
									activeForm === "107-1u"
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-sm"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Форма № 107-1/у (Стандарт)
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveForm("148-1u");
									setValidityDays("15");
									setSelectedDrugIds(["tramadol_50"]);
									setCustomSeriesNumber(
										`ПКУ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
									);
								}}
								className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
									activeForm === "148-1u"
										? "bg-[var(--amber-fill,#d97706)] text-white shadow-sm"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Форма № 148-1/у-88 (ПКУ)
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ── Mobile Form Switcher ── */}
				<div className="sm:hidden flex p-2 border-b border-[var(--line)] bg-[var(--paper-soft)] gap-2">
					<button
						type="button"
						onClick={() => setActiveForm("107-1u")}
						className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl border transition-all ${
							activeForm === "107-1u"
								? "bg-[var(--teal-fill,var(--teal))] text-white border-[var(--teal)]"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
						}`}
					>
						№ 107-1/у
					</button>
					<button
						type="button"
						onClick={() => setActiveForm("148-1u")}
						className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl border transition-all ${
							activeForm === "148-1u"
								? "bg-[var(--amber-fill,#d97706)] text-white border-[var(--amber-fill,#d97706)]"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
						}`}
					>
						№ 148-1/у-88 (ПКУ)
					</button>
				</div>

				{/* ── Modal Split Body ── */}
				<div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
					{/* ── Left Column: Configurator & Catalog ── */}
					<div className="w-full lg:w-1/2 p-4 md:p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--line)] flex flex-col gap-4">
						{/* Banner for Form 148-1/u-88 */}
						{activeForm === "148-1u" && (
							<div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
								<ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
								<div>
									<strong>Бланк строгой отчетности (ПКУ):</strong> На форму 148-1/у-88
									выписывается строго <strong>1 препарат</strong> (опиоиды, психотропы списка III,
									сильнодействующие). Срок действия рецепта — 15 дней.
								</div>
							</div>
						)}

						{/* Search & Category Filter */}
						<div className="flex flex-col gap-2">
							<div className="relative">
								<Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Поиск препарата по МНН, торговому названию или латыни..."
									className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--teal)] transition-colors"
								/>
							</div>

							{activeForm === "107-1u" && (
								<div className="flex items-center gap-1.5 overflow-x-auto pb-1">
									{[
										{ id: "all", label: "Все" },
										{ id: "nsaid", label: "НПВС" },
										{ id: "antibiotic", label: "Антибиотики" },
										{ id: "antiseptic", label: "Антисептики" },
										{ id: "antihistamine", label: "Противоотечные" },
									].map((cat) => (
										<button
											key={cat.id}
											type="button"
											onClick={() => setCategoryFilter(cat.id)}
											className={`min-h-[44px] px-3 py-1 text-xs font-semibold rounded-lg border whitespace-nowrap transition-all ${
												categoryFilter === cat.id
													? "bg-[var(--teal-surface)] text-[var(--teal)] border-[var(--teal)]"
													: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--teal)]"
											}`}
										>
											{cat.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Drugs Catalog List */}
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									{activeForm === "107-1u"
										? `Препараты (${selectedDrugIds.length} / 3 на бланк):`
										: "Препарат ПКУ (1 на бланк):"}
								</span>
								<button
									type="button"
									onClick={() => setIsAddingCustom(!isAddingCustom)}
									className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--teal)] border border-[var(--line)] transition-colors"
								>
									<Plus className="w-3.5 h-3.5" />
									Своя пропись
								</button>
							</div>

							{/* Custom Drug Input Form */}
							{isAddingCustom && (
								<div className="p-3.5 rounded-xl border border-[var(--teal)] bg-[var(--teal-surface)] flex flex-col gap-2.5 animate-in fade-in duration-150">
									<div className="text-xs font-bold text-[var(--ink)]">
										Добавление индивидуальной латинской прописи:
									</div>
									<input
										type="text"
										value={customLatinRp}
										onChange={(e) => setCustomLatinRp(e.target.value)}
										placeholder="Rp.: Sol. Dexamethasoni 4 mg/ml - 1 ml"
										className="min-h-[44px] px-3 py-2 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
									/>
									<div className="grid grid-cols-2 gap-2">
										<input
											type="text"
											value={customTradeName}
											onChange={(e) => setCustomTradeName(e.target.value)}
											placeholder="Торговое название (Дексаметазон)"
											className="min-h-[44px] px-3 py-2 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										/>
										<input
											type="text"
											value={customDispense}
											onChange={(e) => setCustomDispense(e.target.value)}
											placeholder="D.t.d. N 5 in amp."
											className="min-h-[44px] px-3 py-2 text-xs font-mono rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
										/>
									</div>
									<textarea
										value={customSigna}
										onChange={(e) => setCustomSigna(e.target.value)}
										placeholder="S. Внутримышечно по 1 ампуле 1 раз в сутки, 3 дня."
										rows={2}
										className="px-3 py-2 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									/>
									<div className="flex items-center justify-end gap-2">
										<button
											type="button"
											onClick={() => setIsAddingCustom(false)}
											className="min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--muted)] hover:bg-[var(--line)]"
										>
											Отмена
										</button>
										<button
											type="button"
											onClick={handleAddCustomDrug}
											className="min-h-[44px] px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--teal-fill,var(--teal))] text-white shadow"
										>
											Добавить в рецепт
										</button>
									</div>
								</div>
							)}

							{/* Drug Cards */}
							<div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
								{filteredCatalog.map((drug) => {
									const isSelected = selectedDrugIds.includes(drug.id);
									return (
										<button
											key={drug.id}
											type="button"
											onClick={() => toggleDrug(drug.id)}
											className={`min-h-[44px] flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--teal)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`drug-item-${drug.id}`}
										>
											<div className="flex flex-col gap-1 min-w-0 pr-2">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="text-xs font-bold text-[var(--ink)]">
														{drug.tradeNameRu}
													</span>
													<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)] font-medium text-[var(--muted)]">
														{drug.categoryLabel}
													</span>
												</div>
												<span className="text-[11px] font-mono italic font-semibold text-[var(--teal)]">
													{drug.latinRp}
												</span>
												<span className="text-[11px] text-[var(--muted)] line-clamp-1">
													{drug.signaRu}
												</span>
											</div>
											<div
												className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 mt-0.5 border ${
													isSelected
														? "bg-[var(--teal-fill,var(--teal))] border-[var(--teal)] text-white"
														: "border-[var(--line)]"
												}`}
											>
												{isSelected && <Check className="w-3.5 h-3.5" />}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* Custom Drugs List Display */}
						{customDrugsList.length > 0 && (
							<div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<span className="text-xs font-bold text-[var(--ink)]">
									Индивидуальные прописи ({customDrugsList.length}):
								</span>
								{customDrugsList.map((d) => (
									<div
										key={d.id}
										className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs"
									>
										<div className="font-mono text-[11px] truncate pr-2">
											{d.latinName} — {d.signaRussian}
										</div>
										<button
											type="button"
											onClick={() => removeCustomDrug(d.id)}
											className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
											aria-label="Удалить пропись"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
						)}

						{/* ── Prescription Requisites & Parameters ── */}
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-3">
							<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<Calendar className="w-3.5 h-3.5" />
								Реквизиты и срок действия
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
										Серия и номер:
									</label>
									<input
										type="text"
										value={customSeriesNumber}
										onChange={(e) => setCustomSeriesNumber(e.target.value)}
										className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									/>
								</div>
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
										Дата выписки:
									</label>
									<input
										type="date"
										value={prescriptionDate}
										onChange={(e) => setPrescriptionDate(e.target.value)}
										className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									/>
								</div>
							</div>

							{activeForm === "148-1u" && (
								<div>
									<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
										Адрес проживания пациента (Обязательно для 148-1/у):
									</label>
									<input
										type="text"
										value={patientAddress}
										onChange={(e) => setPatientAddress(e.target.value)}
										placeholder="г. Москва, ул. ..."
										className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
									/>
								</div>
							)}

							{activeForm === "107-1u" && (
								<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]">
									<label className="text-[11px] font-semibold text-[var(--muted)]">
										Срок действия рецепта (Приказ № 1094н):
									</label>
									<div className="grid grid-cols-3 gap-2">
										{[
											{ days: "15", label: "15 дней" },
											{ days: "60", label: "60 дней (Стандарт)" },
											{ days: "365", label: "До 1 года (Хроники)" },
										].map((opt) => (
											<button
												key={opt.days}
												type="button"
												onClick={() => {
													setValidityDays(opt.days as any);
													if (opt.days === "365") {
														setIsChronicSpecialCare(true);
													} else {
														setIsChronicSpecialCare(false);
													}
												}}
												className={`min-h-[44px] px-2 py-1 text-xs font-semibold rounded-xl border text-center transition-all ${
													validityDays === opt.days
														? "bg-[var(--teal-surface)] text-[var(--teal)] border-[var(--teal)] font-bold shadow-sm"
														: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
												}`}
											>
												{opt.label}
											</button>
										))}
									</div>

									{validityDays === "365" && (
										<div className="p-2.5 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal)] flex flex-col gap-2 mt-1">
											<div className="text-[11px] font-bold text-[var(--ink)]">
												Отметка «По специальному назначению»:
											</div>
											<select
												value={chronicPeriodicity}
												onChange={(e) => setChronicPeriodicity(e.target.value)}
												className="min-h-[44px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
											>
												<option value="ежемесячно (1 раз в 30 дней)">
													Отпуск: ежемесячно (1 раз в 30 дней)
												</option>
												<option value="1 раз в 2 месяца">Отпуск: 1 раз в 2 месяца</option>
												<option value="1 раз в 3 месяца">Отпуск: 1 раз в 3 месяца</option>
											</select>
										</div>
									)}
								</div>
							)}
						</div>
					</div>

					{/* ── Right Column: Live High-End Medical Sheet Preview ── */}
					<div className="w-full lg:w-1/2 p-4 md:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<FileText className="w-3.5 h-3.5 text-[var(--teal)]" />
								Живой предпросмотр (А5 / Высокая печать):
							</span>
							<span className="text-xs font-mono font-bold text-[var(--teal)]">
								{customSeriesNumber}
							</span>
						</div>

						{/* Printable Physical Sheet Mockup */}
						<div className="p-5 md:p-6 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs shadow-xl font-serif leading-relaxed flex flex-col gap-3 selection:bg-teal-100">
							{/* Form Official Header */}
							<div className="border-b-2 border-slate-900 pb-2 text-[10px] text-slate-700 flex justify-between gap-2">
								<div className="w-7/12 border border-dashed border-slate-400 p-1.5 rounded leading-tight">
									<div className="font-bold text-slate-950 uppercase text-[10px]">
										{clinic}
									</div>
									<div className="text-[9px]">Адрес: {address}</div>
									<div className="text-[9px]">Тел: {phone}</div>
									<div className="text-[9px]">ОГРН: {ogrn} · ИНН: {inn}</div>
									<div className="text-[8px] text-slate-500 italic mt-0.5">
										(Штамп медицинской организации)
									</div>
								</div>
								<div className="w-5/12 text-right leading-tight text-[9px] text-slate-600">
									<div>Министерство здравоохранения РФ</div>
									<div>Медицинская документация</div>
									<div className="font-bold text-[10px] text-slate-950 mt-0.5">
										{activeForm === "107-1u"
											? "Форма бланка № 107-1/у"
											: "Форма бланка № 148-1/у-88"}
									</div>
									<div>Приказ МЗ РФ № 1094н</div>
								</div>
							</div>

							{/* Title */}
							<div className="text-center my-1">
								<div className="font-extrabold text-base tracking-widest uppercase text-slate-950">
									РЕЦЕПТ {activeForm === "148-1u" && "(ПКУ)"}
								</div>
								<div className="text-[10px] text-slate-600 font-sans">
									Серия: <strong>{customSeriesNumber}</strong> от{" "}
									<strong>{new Date(prescriptionDate || Date.now()).toLocaleDateString("ru-RU")}</strong>
								</div>
								<div className="text-[9px] text-slate-500 italic">
									{activeForm === "107-1u"
										? "(взрослый, детский — нужное подчеркнуть)"
										: "(бланк строгой учетной документации)"}
								</div>
							</div>

							{/* Patient and Doctor Meta */}
							<div className="border-b border-slate-300 pb-2 flex flex-col gap-0.5 text-[11px] leading-snug">
								<div>
									Ф.И.О. пациента: <strong>{patientName}</strong>
								</div>
								<div className="flex justify-between flex-wrap gap-1">
									<span>
										Дата рождения: <strong>{patientBirth}</strong>
									</span>
									<span>
										№ медкарты: <strong>{patientCard}</strong>
									</span>
								</div>
								{activeForm === "148-1u" && (
									<div>
										Адрес проживания: <strong>{patientAddress}</strong>
									</div>
								)}
								<div>
									Ф.И.О. лечащего врача: <strong>{docName}</strong> ({docSpecialty})
								</div>
								{diary?.diagnosisIcd10 && (
									<div className="text-[10px] text-slate-600 font-sans">
										Диагноз (МКБ-10): <strong>{diary.diagnosisIcd10}</strong>
									</div>
								)}
							</div>

							{/* Prescribed Items (Rp.) */}
							<div className="flex flex-col gap-3 min-h-[120px] py-2">
								{activeItems.map((item, idx) => (
									<div key={item.id} className="font-serif">
										<div className="font-bold text-[11.5px] italic text-slate-950">
											{idx + 1}. {item.latinName}
										</div>
										<div className="ml-5 italic text-[11px] text-slate-800">
											{item.dispenseLatin}
										</div>
										<div className="ml-5 text-[11px] font-sans text-slate-800 font-medium">
											{item.signaRussian}
										</div>
										<div className="ml-5 text-[9px] font-sans text-slate-500">
											[Торговое наименование: <strong>{item.tradeName}</strong>]
										</div>
									</div>
								))}
							</div>

							{/* Footer Signatures and Stamp Circles */}
							<div className="border-t-2 border-slate-900 pt-2 text-[10px] flex justify-between items-end text-slate-700">
								<div className="flex flex-col gap-1">
									<div>
										Срок действия рецепта:{" "}
										<u>
											<strong>
												{activeForm === "107-1u"
													? validityDays === "365"
														? "До 1 года (По специальному назначению)"
														: `${validityDays} дней`
													: "15 дней (ПКУ)"}
											</strong>
										</u>
									</div>
									{isChronicSpecialCare && (
										<div className="text-[9px] font-bold text-teal-800">
											По специальному назначению ({chronicPeriodicity})
										</div>
									)}
									<div className="mt-2">
										Подпись лечащего врача: ____________________ / {docName}
									</div>
									{activeForm === "148-1u" && (
										<div>Подпись зав. отделением: ____________________</div>
									)}
								</div>

								<div className="flex items-center gap-2">
									<div className="w-11 h-11 rounded-full border border-dashed border-slate-500 flex items-center justify-center font-bold text-[9px] text-slate-600">
										М.П.
									</div>
									<div className="w-12 h-12 rounded-full border border-dashed border-teal-700 flex items-center justify-center font-bold text-[8.5px] text-teal-900 text-center leading-tight">
										Для<br />рецептов
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ── Modal Footer ── */}
				<div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<span className="text-xs text-[var(--muted)] hidden sm:inline">
						Соответствует Приказу Минздрава России от 24.11.2021 г. № 1094н.
					</span>
					<div className="flex items-center gap-3 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2 text-xs font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] hover:opacity-90 text-[var(--on-teal,#ffffff)] shadow-md transition-all active:scale-[0.98]"
							data-testid="print-prescription-btn"
						>
							<Printer className="w-4 h-4" />
							Печать рецепта ({activeForm === "107-1u" ? "107-1/у" : "148-1/у-88"})
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
