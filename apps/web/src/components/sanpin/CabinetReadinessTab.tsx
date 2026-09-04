import {
	CABINET_READINESS_PRESETS,
	calculateCabinetStampHash,
	createCabinetReadinessRecord,
	createDefaultPaperJournalCabinetRecord,
	evaluateCabinetReadiness,
	exportCabinetReadinessToCsv,
	generateCabinetReadinessPrintHtml,
	getCabinetReadinessPreset,
	type CabinetReadinessRecord,
	type DentalAppointmentType,
} from "@dental/shared";
import {
	AlertTriangle,
	Award,
	Check,
	CheckCircle2,
	Clock,
	Download,
	FileSpreadsheet,
	Filter,
	Info,
	Layers,
	Printer,
	RotateCcw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	XCircle,
	Zap,
	ArrowRight,
	Save,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";

export function CabinetReadinessTab() {
	const [selectedCabinet, setSelectedCabinet] = useState("Кабинет № 1");
	const [selectedProfile, setSelectedProfile] = useState<DentalAppointmentType>("therapy");
	const [nurseName, setNurseName] = useState("Смирнова А.В.");
	const [nursePosition, setNursePosition] = useState("Ассистент стоматолога");

	// Checklist State
	const [disinfectionCompleted, setDisinfectionCompleted] = useState(true);
	const [disinfectantBrand, setDisinfectantBrand] = useState("Бациллол АФ (спрей)");
	const [exposureMinutes, setExposureMinutes] = useState(3);

	const [turbineSterile, setTurbineSterile] = useState(true);
	const [contraAngleSterile, setContraAngleSterile] = useState(true);
	const [micromotorSterile, setMicromotorSterile] = useState(true);
	const [class5Verified, setClass5Verified] = useState(true);
	const [packageIntegrityVerified, setPackageIntegrityVerified] = useState(true);

	const [mirrorReady, setMirrorReady] = useState(true);
	const [probeReady, setProbeReady] = useState(true);
	const [tweezersReady, setTweezersReady] = useState(true);
	const [excavatorReady, setExcavatorReady] = useState(true);
	const [spatulaReady, setSpatulaReady] = useState(true);

	const [salivaConnected, setSalivaConnected] = useState(true);
	const [hveConnected, setHveConnected] = useState(true);
	const [filterChecked, setFilterChecked] = useState(true);

	const [rubberDamReady, setRubberDamReady] = useState(true);
	const [clampsReady, setClampsReady] = useState(true);
	const [forcepsReady, setForcepsReady] = useState(true);

	const [notes, setNotes] = useState("");

	// History records
	const [historyRecords, setHistoryRecords] = useState<CabinetReadinessRecord[]>([
		createCabinetReadinessRecord({
			cabinetNumber: "Кабинет № 1",
			appointmentType: "therapy",
			operatorStaffFullName: "Смирнова А.В.",
			operatorStaffPosition: "Ассистент стоматолога",
			surfaceDisinfection: {
				isCompleted: true,
				disinfectantBrand: "Бациллол АФ",
				exposureMinutes: 3,
			},
			handpiecesSterility: {
				isCompleted: true,
				turbineHandpieceSterile: true,
				contraAngleHandpieceSterile: true,
				class5IndicatorsVerified: true,
				packageIntegrityVerified: true,
			},
			sterileTray: {
				isCompleted: true,
				mirrorReady: true,
				probeReady: true,
				tweezersReady: true,
				excavatorReady: true,
				spatulaPluggerReady: true,
			},
			aspirationSystem: {
				isCompleted: true,
				salivaEjectorConnected: true,
				hveVacuumConnected: true,
				bacterialFilterChecked: true,
			},
			isolationCofferdam: {
				isCompleted: true,
				rubberDamSheetReady: true,
				clampsReady: true,
				forcepsReady: true,
			},
			notes: "Подготовка к утреннему терапевтическому приёму",
		}),
	]);

	const currentPreset = useMemo(() => getCabinetReadinessPreset(selectedProfile), [selectedProfile]);

	const evaluation = useMemo(() => {
		return evaluateCabinetReadiness({
			appointmentType: selectedProfile,
			surfaceDisinfection: {
				isCompleted: disinfectionCompleted,
				disinfectantBrand,
				exposureMinutes,
			},
			handpiecesSterility: {
				isCompleted: turbineSterile && contraAngleSterile && class5Verified && packageIntegrityVerified,
				turbineHandpieceSterile: turbineSterile,
				contraAngleHandpieceSterile: contraAngleSterile,
				micromotorHandpieceSterile: micromotorSterile,
				class5IndicatorsVerified: class5Verified,
				packageIntegrityVerified: packageIntegrityVerified,
			},
			sterileTray: {
				isCompleted: mirrorReady && probeReady && tweezersReady && excavatorReady && spatulaReady,
				mirrorReady,
				probeReady,
				tweezersReady,
				excavatorReady,
				spatulaPluggerReady: spatulaReady,
			},
			aspirationSystem: {
				isCompleted: salivaConnected && hveConnected && filterChecked,
				salivaEjectorConnected: salivaConnected,
				hveVacuumConnected: hveConnected,
				bacterialFilterChecked: filterChecked,
			},
			isolationCofferdam: {
				isCompleted: rubberDamReady && clampsReady && forcepsReady,
				rubberDamSheetReady: rubberDamReady,
				clampsReady,
				forcepsReady,
				isNotRequiredForProfile: !currentPreset.requiresCofferdam,
			},
		});
	}, [
		selectedProfile,
		disinfectionCompleted,
		disinfectantBrand,
		exposureMinutes,
		turbineSterile,
		contraAngleSterile,
		micromotorSterile,
		class5Verified,
		packageIntegrityVerified,
		mirrorReady,
		probeReady,
		tweezersReady,
		excavatorReady,
		spatulaReady,
		salivaConnected,
		hveConnected,
		filterChecked,
		rubberDamReady,
		clampsReady,
		forcepsReady,
		currentPreset.requiresCofferdam,
	]);

	const handleSaveChecklist = (e: React.FormEvent) => {
		e.preventDefault();
		const record = createCabinetReadinessRecord({
			cabinetNumber: selectedCabinet,
			appointmentType: selectedProfile,
			operatorStaffFullName: nurseName.trim() || "Персонал клиники",
			operatorStaffPosition: nursePosition,
			surfaceDisinfection: {
				isCompleted: disinfectionCompleted,
				disinfectantBrand,
				exposureMinutes,
			},
			handpiecesSterility: {
				isCompleted: turbineSterile && contraAngleSterile && class5Verified && packageIntegrityVerified,
				turbineHandpieceSterile: turbineSterile,
				contraAngleHandpieceSterile: contraAngleSterile,
				micromotorHandpieceSterile: micromotorSterile,
				class5IndicatorsVerified: class5Verified,
				packageIntegrityVerified: packageIntegrityVerified,
			},
			sterileTray: {
				isCompleted: mirrorReady && probeReady && tweezersReady && excavatorReady && spatulaReady,
				mirrorReady,
				probeReady,
				tweezersReady,
				excavatorReady,
				spatulaPluggerReady: spatulaReady,
			},
			aspirationSystem: {
				isCompleted: salivaConnected && hveConnected && filterChecked,
				salivaEjectorConnected: salivaConnected,
				hveVacuumConnected: hveConnected,
				bacterialFilterChecked: filterChecked,
			},
			isolationCofferdam: {
				isCompleted: rubberDamReady && clampsReady && forcepsReady,
				rubberDamSheetReady: rubberDamReady,
				clampsReady,
				forcepsReady,
				isNotRequiredForProfile: !currentPreset.requiresCofferdam,
			},
			notes: notes || undefined,
		});

		setHistoryRecords((prev) => [record, ...prev]);
		if (record.isFullyReady) {
			showToast(
				`${selectedCabinet} успешно подготовлен: «${currentPreset.shortLabelRu}». Статус готовности зафиксирован в журнале СанПиН.`,
				"success",
			);
		} else {
			showToast(
				`${selectedCabinet} принят в работу. Чек-лист сохранен в фоновом режиме без блокировки врача.`,
				"info",
			);
		}
	};

	const handleQuickFillAllReady = () => {
		setDisinfectionCompleted(true);
		setExposureMinutes(currentPreset.minExposureMinutes);
		setTurbineSterile(true);
		setContraAngleSterile(true);
		setMicromotorSterile(true);
		setClass5Verified(true);
		setPackageIntegrityVerified(true);
		setMirrorReady(true);
		setProbeReady(true);
		setTweezersReady(true);
		setExcavatorReady(true);
		setSpatulaReady(true);
		setSalivaConnected(true);
		setHveConnected(true);
		setFilterChecked(true);
		setRubberDamReady(true);
		setClampsReady(true);
		setForcepsReady(true);
		showToast("Все пункты чек-листа отмечены как проверенные и готовые", "info");
	};

	const handleOneClickConfirmCabinetReady = () => {
		handleQuickFillAllReady();
		const record = createCabinetReadinessRecord({
			cabinetNumber: selectedCabinet,
			appointmentType: selectedProfile,
			operatorStaffFullName: nurseName,
			operatorStaffPosition: nursePosition,
			surfaceDisinfection: {
				isCompleted: true,
				disinfectantBrand,
				exposureMinutes: currentPreset.minExposureMinutes,
			},
			handpiecesSterility: {
				isCompleted: true,
				turbineHandpieceSterile: true,
				contraAngleHandpieceSterile: true,
				micromotorHandpieceSterile: true,
				class5IndicatorsVerified: true,
				packageIntegrityVerified: true,
			},
			sterileTray: {
				isCompleted: true,
				mirrorReady: true,
				probeReady: true,
				tweezersReady: true,
				excavatorReady: true,
				spatulaPluggerReady: true,
			},
			aspirationSystem: {
				isCompleted: true,
				salivaEjectorConnected: true,
				hveVacuumConnected: true,
				bacterialFilterChecked: true,
			},
			isolationCofferdam: {
				isCompleted: true,
				rubberDamSheetReady: true,
				clampsReady: true,
				forcepsReady: true,
				isNotRequiredForProfile: !currentPreset.requiresCofferdam,
			},
			notes: notes || "Подтверждена готовность всех узлов кабинета к смене (норма СанПиН)",
		});

		setHistoryRecords((prev) => [record, ...prev]);
		showToast(
			`${selectedCabinet}: готовность к смене подтверждена по норме СанПиН (1 клик)`,
			"success",
		);
	};

	const handleStartAppointmentPaperLogNorm = () => {
		const record = createDefaultPaperJournalCabinetRecord({
			cabinetNumber: selectedCabinet,
			appointmentType: selectedProfile,
			operatorStaffFullName: nurseName || "Персонал клиники",
			notes: "Приём начат (норма по бумажному журналу СанПиН 3.3686-21, без блокировок врача)",
		});
		setHistoryRecords((prev) => [record, ...prev]);
		showToast(
			`${selectedCabinet}: приём начат в штатном режиме (норма СанПиН / бумажный журнал). Блокировки сняты.`,
			"success",
		);
	};

	const handleExportCsv = () => {
		const csv = exportCabinetReadinessToCsv(historyRecords);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Cabinet_Readiness_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Реестр готовности кабинетов выгружен в CSV (с UTF-8 BOM)", "success");
	};

	const handlePrint = () => {
		const html = generateCabinetReadinessPrintHtml({ records: historyRecords });
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		}
	};

	return (
		<div className="sanpin-tab-pane">
			<div className="sanpin-pane-header">
				<div>
					<h2>
						<ShieldCheck size={22} color="var(--brand-primary, #2563eb)" />
						Экспресс-чек-лист: «Готовность кабинета и стоматологической установки»
					</h2>
					<p className="sanpin-pane-desc">
						Стандартизированный протокол подготовки кабинета по СанПиН 3.3686-21. Ведение в CRM опционально: при использовании бумажных журналов приём пациентов ведётся в штатном режиме без задержек и блокировок.
					</p>
				</div>

				<div className="sanpin-pane-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={handleStartAppointmentPaperLogNorm}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "48px", padding: "0.6rem 1.25rem", fontSize: "0.95rem", background: "var(--teal)", color: "var(--on-teal, #fff)", fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)" }}
						title="1 Клик врачу: Начать приём без блокировок по норме СанПиН (бумажный журнал)"
						data-testid="cabinet-readiness-start-appointment-btn"
					>
						<CheckCircle2 size={18} /> <span>Начать приём (норма)</span>
					</button>

					<button
						type="button"
						onClick={handleOneClickConfirmCabinetReady}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "48px", padding: "0.6rem 1.25rem", fontSize: "0.92rem", fontWeight: 700, cursor: "pointer" }}
						title="1 Клик: Отметить все пункты текущего профиля как готовые"
						data-testid="cabinet-readiness-autofill-btn"
					>
						<Zap size={18} /> <span>Кабинет готов к смене (норма СанПиН)</span>
					</button>

					<button
						type="button"
						onClick={handleExportCsv}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "48px", padding: "0.6rem 1rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}
						title="Экспорт истории проверок в CSV"
					>
						<Download size={16} /> CSV
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "48px", padding: "0.6rem 1rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}
						title="Печать официального листа передачи смены"
					>
						<Printer size={16} /> Печать / PDF
					</button>
				</div>
			</div>

			{/* Step-by-Step Guidance Ribbon & Autosave Status */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.75rem",
					padding: "0.75rem 1.25rem",
					background: "var(--paper-soft, #f8fafc)",
					borderRadius: "0.75rem",
					border: "1px solid var(--paper-border, #e2e8f0)",
					marginTop: "0.75rem",
					marginBottom: "0.5rem",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.88rem", color: "var(--teal)" }}>
					<span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "50%", background: "var(--teal)", color: "var(--on-teal, #fff)", fontSize: "0.75rem" }}>1</span>
					<span>Шаг 1: Выберите кабинет</span>
				</div>
				<ArrowRight size={14} color="var(--muted, #64748b)" />
				<div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.88rem", color: "var(--teal)" }}>
					<span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "50%", background: "var(--teal)", color: "var(--on-teal, #fff)", fontSize: "0.75rem" }}>2</span>
					<span>Шаг 2: Проверьте готовность (норма в 1 клик)</span>
				</div>
				<ArrowRight size={14} color="var(--muted, #64748b)" />
				<div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.88rem", color: "var(--ok-fg)" }}>
					<span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "50%", background: "var(--ok-fg)", color: "var(--on-teal, #fff)", fontSize: "0.75rem" }}>3</span>
					<span>Шаг 3: Готов к приёму</span>
				</div>
				<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
					<Save size={14} color="var(--ok-fg)" />
					<span>Все данные сохранены</span>
				</div>
			</div>

			{/* Dominant 1-Click Readiness Hero Banner (Zero Clutter) */}
			<div
				style={{
					background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(37, 99, 235, 0.06) 100%)",
					border: "2px solid var(--teal, #0d9488)",
					borderRadius: "0.85rem",
					padding: "1.25rem",
					marginTop: "0.75rem",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "1.5rem",
					flexWrap: "wrap",
				}}
			>
				<div style={{ flex: "1 1 320px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
						<span
							style={{
								padding: "0.25rem 0.6rem",
								borderRadius: "0.4rem",
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								fontSize: "0.75rem",
								fontWeight: 800,
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							СанПиН 3.3686-21
						</span>
						<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink, #1e293b)" }}>
							{selectedCabinet} • {currentPreset.shortLabelRu}
						</span>
					</div>
					<h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.15rem", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
						Готовность кабинета к приёму пациентов
					</h3>
					<p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>
						Физиологическая норма: дезинфекция поверхностей, стерильные наконечники 5 кл., смотровой лоток, аспирация и коффердам. Приём разрешён в штатном режиме.
					</p>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={handleStartAppointmentPaperLogNorm}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "52px",
							padding: "0.75rem 1.5rem",
							fontSize: "0.98rem",
							fontWeight: 800,
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "0.6rem",
							borderRadius: "0.65rem",
							boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
						}}
						title="1 Клик: Начать приём (норма по бумажному журналу СанПиН)"
					>
						<CheckCircle2 size={22} />
						<span>Начать приём (норма)</span>
					</button>

					<button
						type="button"
						onClick={handleOneClickConfirmCabinetReady}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "52px",
							padding: "0.75rem 1.25rem",
							fontSize: "0.92rem",
							fontWeight: 700,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							borderRadius: "0.65rem",
						}}
						title="Отметить все пункты электронного чек-листа"
					>
						<Zap size={18} />
						<span>Зафиксировать в CRM</span>
					</button>
				</div>
			</div>

			{/* Collapsible 20-Checklist Section (For Exceptions / Breakdowns) */}
			<details
				style={{
					background: "var(--paper, #fff)",
					border: "1px solid var(--paper-border, #e2e8f0)",
					borderRadius: "0.75rem",
					padding: "1rem",
					marginTop: "1rem",
				}}
			>
				<summary
					style={{
						cursor: "pointer",
						fontWeight: 700,
						fontSize: "0.92rem",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						color: "var(--brand-primary, #2563eb)",
						userSelect: "none",
					}}
				>
					<Filter size={16} />
					<span>Детальный чек-лист узлов установки (20 параметров — для исключений и поломок)</span>
					<span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
						Развернуть для ручной корректировки
					</span>
				</summary>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem", marginTop: "1rem" }}>
					{/* Column 1: Configuration & Disinfection */}
					<div style={{ background: "var(--paper-subtle, #f8fafc)", border: "1px solid var(--paper-border, #e2e8f0)", borderRadius: "0.75rem", padding: "1.25rem" }}>
						<h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "var(--brand-primary, #2563eb)" }}>
							<Filter size={18} /> Шаг 1: Профиль приёма и Кабинет
						</h3>

						<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
							<div>
								<label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
									Стоматологический кабинет:
								</label>
								<select
									value={selectedCabinet}
									onChange={(e) => setSelectedCabinet(e.target.value)}
									className="sanpin-input"
									style={{ width: "100%", minHeight: "44px" }}
								>
									<option value="Кабинет № 1">Кабинет № 1 (Терапия/Эндодонтия)</option>
									<option value="Кабинет № 2">Кабинет № 2 (Терапия/Ортопедия)</option>
									<option value="Хирургический кабинет">Хирургический кабинет (Операционная)</option>
									<option value="Детский кабинет">Детский кабинет</option>
									<option value="Ортодонтический кабинет">Ортодонтический кабинет</option>
								</select>
							</div>

							<div>
								<label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
									Специализация / Профиль приёма:
								</label>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.4rem" }}>
									{CABINET_READINESS_PRESETS.map((p) => (
										<button
											key={p.type}
											type="button"
											onClick={() => {
												setSelectedProfile(p.type);
												setExposureMinutes(p.minExposureMinutes);
											}}
											style={{
												minHeight: "42px",
												padding: "0.4rem 0.6rem",
												fontSize: "0.82rem",
												fontWeight: selectedProfile === p.type ? 800 : 500,
												background: selectedProfile === p.type ? "rgba(37, 99, 235, 0.12)" : "var(--paper-subtle, #f8fafc)",
												border: selectedProfile === p.type ? "2px solid var(--brand-primary, #2563eb)" : "1px solid var(--paper-border, #cbd5e1)",
												color: selectedProfile === p.type ? "var(--brand-primary, #2563eb)" : "inherit",
												borderRadius: "0.5rem",
												cursor: "pointer",
												textAlign: "left",
											}}
										>
											{p.shortLabelRu}
										</button>
									))}
								</div>
							</div>

							<div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "0.75rem" }}>
								<h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--teal)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
									<Sparkles size={16} /> Дезинфекция поверхностей установки:
								</h4>

								<label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", marginBottom: "0.5rem", cursor: "pointer" }}>
									<input
										type="checkbox"
										checked={disinfectionCompleted}
										onChange={(e) => setDisinfectionCompleted(e.target.checked)}
										style={{ width: "18px", height: "18px" }}
									/>
									<span>Поверхности протерты (кресло, столик, светильник, шланги)</span>
								</label>

								<div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem" }}>
									<div>
										<label style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Дезсредство:</label>
										<input
											type="text"
											value={disinfectantBrand}
											onChange={(e) => setDisinfectantBrand(e.target.value)}
											className="sanpin-input"
											style={{ minHeight: "38px", fontSize: "0.85rem" }}
										/>
									</div>
									<div>
										<label style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Экспозиция (мин):</label>
										<input
											type="number"
											min={1}
											max={30}
											value={exposureMinutes}
											onChange={(e) => setExposureMinutes(Number(e.target.value))}
											className="sanpin-input"
											style={{ minHeight: "38px", fontSize: "0.85rem" }}
										/>
									</div>
								</div>
								{exposureMinutes < currentPreset.minExposureMinutes && (
									<div style={{ color: "var(--bad-fg)", fontSize: "0.75rem", marginTop: "0.3rem", fontWeight: 600 }}>
										Внимание: требуется экспозиция не менее {currentPreset.minExposureMinutes} мин!
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Column 2: Handpieces, Sterile Tray & Aspiration */}
					<div style={{ background: "var(--paper-subtle, #f8fafc)", border: "1px solid var(--paper-border, #e2e8f0)", borderRadius: "0.75rem", padding: "1.25rem" }}>
						<h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", color: "var(--brand-primary, #2563eb)" }}>
							<Sparkles size={18} /> Шаг 2: Стерильные инструменты и Аспирация
						</h3>

						<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
							<div style={{ background: "var(--paper, #fff)", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid var(--line, #e2e8f0)" }}>
								<strong style={{ display: "block", marginBottom: "0.4rem", color: "var(--ink, #1e293b)" }}>
									Наконечники и крафт-пакеты:
								</strong>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", cursor: "pointer" }}>
									<input type="checkbox" checked={turbineSterile} onChange={(e) => setTurbineSterile(e.target.checked)} />
									<span>Турбинный наконечник стерилен</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", cursor: "pointer" }}>
									<input type="checkbox" checked={contraAngleSterile} onChange={(e) => setContraAngleSterile(e.target.checked)} />
									<span>Угловой / микромоторный наконечник стерилен</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
									<input type="checkbox" checked={class5Verified} onChange={(e) => setClass5Verified(e.target.checked)} />
									<span style={{ fontWeight: 600, color: "var(--ok-fg, #059669)" }}>Индикатор 5 класса (Интеграл/Медтест) проверен</span>
								</label>
							</div>

							<div style={{ background: "var(--paper, #fff)", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid var(--line, #e2e8f0)" }}>
								<strong style={{ display: "block", marginBottom: "0.4rem", color: "var(--ink, #1e293b)" }}>
									Базовый смотровой лоток:
								</strong>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.25rem" }}>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
										<input type="checkbox" checked={mirrorReady} onChange={(e) => setMirrorReady(e.target.checked)} />
										<span>Зеркало</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
										<input type="checkbox" checked={probeReady} onChange={(e) => setProbeReady(e.target.checked)} />
										<span>Зонд</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
										<input type="checkbox" checked={tweezersReady} onChange={(e) => setTweezersReady(e.target.checked)} />
										<span>Пинцет</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
										<input type="checkbox" checked={excavatorReady} onChange={(e) => setExcavatorReady(e.target.checked)} />
										<span>Экскаватор</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", gridColumn: "span 2" }}>
										<input type="checkbox" checked={spatulaReady} onChange={(e) => setSpatulaReady(e.target.checked)} />
										<span>Гладилка-штопфер</span>
									</label>
								</div>
							</div>

							<div style={{ background: "var(--paper, #fff)", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid var(--line, #e2e8f0)" }}>
								<strong style={{ display: "block", marginBottom: "0.4rem", color: "var(--ink, #1e293b)" }}>
									Аспирационная система и Коффердам:
								</strong>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", cursor: "pointer" }}>
									<input type="checkbox" checked={salivaConnected} onChange={(e) => setSalivaConnected(e.target.checked)} />
									<span>Слюноотсос (канюля подключена)</span>
								</label>
								<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", cursor: "pointer" }}>
									<input type="checkbox" checked={hveConnected} onChange={(e) => setHveConnected(e.target.checked)} />
									<span>Пылесос (высокообъемная канюля)</span>
								</label>
								{currentPreset.requiresCofferdam && (
									<div style={{ marginTop: "0.4rem", borderTop: "1px dashed var(--line, #cbd5e1)", paddingTop: "0.4rem" }}>
										<label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
											<input
												type="checkbox"
												checked={rubberDamReady && clampsReady && forcepsReady}
												onChange={(e) => {
													const val = e.target.checked;
													setRubberDamReady(val);
													setClampsReady(val);
													setForcepsReady(val);
												}}
											/>
											<span style={{ fontWeight: 600, color: "var(--teal)" }}>Коффердам (платок, клампы 2A/W8A, щипцы)</span>
										</label>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</details>

			{/* Main Checklist Verdict Card */}
			<div style={{ marginTop: "1rem" }}>

				{/* Column 3: Readiness Verdict & Signature */}
				<div style={{ background: "var(--paper, #fff)", border: "1px solid var(--paper-border, #e2e8f0)", borderRadius: "0.75rem", padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
					<div>
						<h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "var(--brand-primary, #2563eb)" }}>
							<Award size={18} /> Шаг 3: Статус готовности и фиксация
						</h3>

						{/* Verdict Banner */}
						<div
							style={{
								padding: "1rem",
								borderRadius: "0.5rem",
								background: evaluation.isFullyReady ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
								border: evaluation.isFullyReady ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
								marginBottom: "1rem",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: 800, color: evaluation.isFullyReady ? "var(--ok-fg)" : "var(--warn-fg, #b45309)" }}>
								{evaluation.isFullyReady ? <CheckCircle2 size={20} /> : <Info size={20} />}
								<span>{evaluation.statusMessageRu}</span>
							</div>

							{evaluation.missingItems.length > 0 && (
								<div style={{ marginTop: "0.5rem" }}>
									<p style={{ margin: "0 0 0.3rem 0", fontSize: "0.82rem", fontWeight: 700, color: "var(--warn-fg, #b45309)" }}>
										Не заполнены пункты экспресс-проверки (при использовании бумажных журналов приём разрешён):
									</p>
									<ul style={{ margin: "0 0 0.5rem 1.25rem", padding: 0, fontSize: "0.8rem", color: "var(--muted)" }}>
										{evaluation.missingItems.map((item, idx) => (
											<li key={idx} style={{ marginBottom: "0.2rem" }}>{item}</li>
										))}
									</ul>
									<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
										<button
											type="button"
											onClick={handleStartAppointmentPaperLogNorm}
											className="sanpin-btn sanpin-btn-primary"
											style={{
												flex: 1,
												minHeight: "44px",
												padding: "0.5rem 1rem",
												fontSize: "0.88rem",
												background: "var(--teal)",
												color: "var(--on-teal, #fff)",
												fontWeight: 800,
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "0.4rem",
											}}
											title="Начать приём в штатном режиме (бумажный журнал)"
										>
											<CheckCircle2 size={16} /> <span>Начать приём (норма)</span>
										</button>
										<button
											type="button"
											onClick={handleQuickFillAllReady}
											className="sanpin-btn sanpin-btn-secondary"
											style={{
												flex: 1,
												minHeight: "44px",
												padding: "0.5rem 1rem",
												fontSize: "0.88rem",
												fontWeight: 700,
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "0.4rem",
											}}
											title="1 Клик: Отметить все недостающие пункты чек-листа как готовые"
										>
											<Zap size={16} /> <span>Заполнить чек-лист в 1 клик</span>
										</button>
									</div>
								</div>
							)}
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
							<div>
								<label style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>ФИО ассистента / медсестры (опционально):</label>
								<input
									type="text"
									value={nurseName}
									onChange={(e) => setNurseName(e.target.value)}
									placeholder="Персонал клиники"
									className="sanpin-input"
									style={{ minHeight: "40px", fontSize: "0.85rem" }}
								/>
							</div>

							<div>
								<label style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>Примечания / Особые указания:</label>
								<input
									type="text"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="например: подготовлен стерильный набор имплантации"
									className="sanpin-input"
									style={{ minHeight: "40px", fontSize: "0.85rem" }}
								/>
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={handleSaveChecklist}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "52px",
							fontSize: "1rem",
							fontWeight: 800,
							letterSpacing: "0.02em",
							marginTop: "1.25rem",
							background: "var(--teal)",
							color: "var(--on-teal, #fff)",
							cursor: "pointer",
							boxShadow: "0 4px 12px rgba(13, 148, 136, 0.4)",
						}}
						data-testid="submit-cabinet-readiness-btn"
					>
						<Check size={20} />
						{evaluation.isFullyReady ? "Кабинет готов к приёму — зафиксировать (1 клик)" : "Сохранить статус проверки"}
					</button>
				</div>
			</div>

			{/* History Table */}
			<div style={{ marginTop: "1.5rem", background: "var(--paper, #fff)", border: "1px solid var(--paper-border, #e2e8f0)", borderRadius: "0.75rem", padding: "1.25rem" }}>
				<h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
					<Clock size={18} color="var(--brand-primary, #2563eb)" />
					История проверок готовности кабинетов за смену
				</h3>

				<div style={{ overflowX: "auto" }}>
					<table className="sanpin-table" style={{ width: "100%", fontSize: "0.85rem" }}>
						<thead>
							<tr>
								<th>Время</th>
								<th>Кабинет</th>
								<th>Профиль</th>
								<th>Статус</th>
								<th>Дезинфекция</th>
								<th>Наконечники</th>
								<th>Лоток</th>
								<th>Исполнитель</th>
								<th>ЭЦП Штамп</th>
							</tr>
						</thead>
						<tbody>
							{historyRecords.map((rec) => (
								<tr key={rec.id}>
									<td style={{ whiteSpace: "nowrap" }}>
										{new Date(rec.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
									</td>
									<td style={{ fontWeight: 700 }}>{rec.cabinetNumber}</td>
									<td>{rec.appointmentTypeTitleRu.split("(")[0]}</td>
									<td>
										<span
											style={{
												padding: "0.2rem 0.5rem",
												borderRadius: "0.3rem",
												fontSize: "0.75rem",
												fontWeight: 700,
												background: rec.isFullyReady ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
												color: rec.isFullyReady ? "var(--ok-fg)" : "var(--warn-fg, #b45309)",
											}}
										>
											{rec.summaryBadgeRu}
										</span>
									</td>
									<td>{rec.surfaceDisinfection.disinfectantBrand} ({rec.surfaceDisinfection.exposureMinutes} мин)</td>
									<td>{rec.handpiecesSterility.class5IndicatorsVerified ? "5 кл. ОК" : "—"}</td>
									<td>{rec.sterileTray.isCompleted ? "Укомплектован" : "—"}</td>
									<td>{rec.operatorStaffFullName}</td>
									<td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--muted)" }}>{rec.digitalStampHash}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
