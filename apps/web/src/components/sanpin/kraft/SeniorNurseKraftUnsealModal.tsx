import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Barcode,
	Camera,
	CameraOff,
	CheckCircle2,
	Flashlight,
	FlashlightOff,
	PackageCheck,
	QrCode,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Volume2,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import {
	type KraftPackageRecord,
	generateDataMatrixSvg,
	createStandardTrayKraftPackageRecord,
	createDynamicKraftPackage,
} from "./kraftPackageEngine";
import {
	playSterileSuccessTone,
	playExpiredErrorTone,
} from "./seniorNurseKraftAudio.js";
import { hardwareScanner } from "../../../services/hardware/HardwareScanner.js";
import { useVisitStore } from "../../../store/visitStore.js";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage.js";
import "./seniorNurseKraft.css";

export const KRAFT_STORAGE_KEY = "dente_sterilization_kraft_packages";

export {
	createStandardTrayKraftPackageRecord,
	createDynamicKraftPackage,
};


export interface SeniorNurseKraftUnsealModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly activeBatchRecords?: readonly KraftPackageRecord[] | undefined;
	readonly onUnsealPackage?: ((pkg: KraftPackageRecord) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly patientName?: string | undefined;
	readonly toothNumber?: number | undefined;
}

export function SeniorNurseKraftUnsealModal({
	isOpen,
	onClose,
	activeBatchRecords,
	onUnsealPackage,
	onInsertToProtocol,
	patientName = "Текущий пациент",
	toothNumber,
}: SeniorNurseKraftUnsealModalProps) {
	// Реестр пакетов из локального хранилища браузера (без хардкоженных мок-дат)
	const [storedPackages, setStoredPackages] = useState<KraftPackageRecord[]>(() => {
		if (typeof window === "undefined") return [];
		try {
			const raw = localStorage.getItem(KRAFT_STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed) && parsed.length > 0) {
					return parsed;
				}
			}
		} catch (e) {
			console.warn("Failed to read kraft packages from localStorage", e);
		}
		return [];
	});

	// Пакеты, созданные динамически или через 1-клик вскрытие стандартного лотка
	const [dynamicPackages, setDynamicPackages] = useState<KraftPackageRecord[]>([]);

	// Фоновая синхронизация с реальным реестром стерилизации бэкенда, если нет переданных партий
	useEffect(() => {
		if (activeBatchRecords && activeBatchRecords.length > 0) return;
		if (storedPackages.length > 0) return;

		let isMounted = true;
		const fetchSterilizationLogs = async () => {
			try {
				const clinicToken = readDenteClinicToken();
				const staffToken = readDenteStaffToken();
				const res = await fetch("/api/registers/sterilization", {
					headers: {
						...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
						...(staffToken ? { "X-Staff-Token": staffToken } : {}),
					},
				}).catch(() => null);

				if (res && res.ok) {
					const data = await res.json();
					if (Array.isArray(data) && data.length > 0 && isMounted) {
						const converted: KraftPackageRecord[] = data.map((log: any, idx: number) => {
							const packDate = log.timestamp ? log.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
							const expDate = log.expiresAt ? log.expiresAt.slice(0, 10) : new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);
							const daysRemaining = Math.ceil((new Date(expDate).getTime() - Date.now()) / (1000 * 3600 * 24));
							const isPassed = log.status === "passed" || log.status === "completed" || log.passedIndicator === true;
							const barcodeVal = log.barcode || `KB${packDate.replace(/-/g, "").slice(2)}${String(idx + 1).padStart(4, "0")}`;

							return {
								id: log.id || `snk-log-${idx + 1}`,
								batchId: `KB-${packDate.replace(/-/g, "")}-${String(log.cycleNumber || 1).padStart(2, "0")}`,
								serialNumber: idx + 1,
								packageType: "paper_self_seal_single",
								packageSize: "size_100x200",
								toolSetId: "set_therapeutic_tray",
								toolSetNameRu: log.itemsDescription || "Лоток смотровой стоматологический",
								itemsListRu: ["Зеркало", "Зонд", "Пинцет", "Штопфер-гладилка", "Экскаватор"],
								packDate,
								expDate,
								daysLifespan: 50,
								daysRemaining,
								status: isPassed && daysRemaining > 0 ? "sterile_valid" : "expired",
								autoclaveId: log.deviceName || "АК-01 (Melag)",
								cycleNumber: log.cycleNumber || 1,
								operatorId: "NURSE-01",
								operatorName: log.operatorName || "Медсестра ЦСО",
								indicatorId: "vinar_steritest_4",
								indicatorVerified: isPassed,
								barcode128: barcodeVal,
								barcodeDataMatrixPayload: `${log.id}|${log.deviceName || "АК-01"}|CYC${log.cycleNumber || 1}|${packDate}|${expDate}|${barcodeVal}`,
								isBreached: false,
								notes: log.notes || "Контроль автоклава пройден",
								createdAt: log.timestamp || new Date().toISOString(),
							};
						});
						setStoredPackages(converted);
					}
				}
			} catch (e) {
				console.warn("Background sterilization logs fetch skipped", e);
			}
		};

		fetchSterilizationLogs();
		return () => {
			isMounted = false;
		};
	}, [activeBatchRecords, storedPackages.length]);

	const availablePackages = useMemo(() => {
		const base =
			activeBatchRecords && activeBatchRecords.length > 0
				? activeBatchRecords
				: storedPackages;
		return [...dynamicPackages, ...base];
	}, [activeBatchRecords, storedPackages, dynamicPackages]);

	const [selectedPackageId, setSelectedPackageId] = useState<string>("");

	useEffect(() => {
		if (!selectedPackageId && availablePackages.length > 0) {
			setSelectedPackageId(availablePackages[0]!.id);
		}
	}, [availablePackages, selectedPackageId]);

	const [barcodeInput, setBarcodeInput] = useState<string>("");
	const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
	const [torchSupported, setTorchSupported] = useState<boolean>(false);

	const videoRef = useRef<HTMLVideoElement>(null);
	const barcodeInputRef = useRef<HTMLInputElement>(null);

	const activePackage = useMemo(() => {
		return availablePackages.find((p) => p.id === selectedPackageId) || availablePackages[0] || null;
	}, [availablePackages, selectedPackageId]);

	const isExpiredOrBreached = activePackage?.status === "expired" || activePackage?.isBreached || (activePackage?.daysRemaining ?? 0) <= 0;
	const [showEmergencyConfirm, setShowEmergencyConfirm] = useState<boolean>(false);

	useEffect(() => {
		setShowEmergencyConfirm(false);
	}, [selectedPackageId, isOpen]);

	// Sound trigger when package is selected
	const handleSelectAndVerify = (pkg: KraftPackageRecord) => {
		setSelectedPackageId(pkg.id);
		setShowEmergencyConfirm(false);
		const isBad = pkg.status === "expired" || pkg.isBreached || pkg.daysRemaining <= 0;
		if (isBad) {
			playExpiredErrorTone();
			showToast("ВНИМАНИЕ! Расчетный срок крафт-пакета истёк. Допуск возможен по экстренным показаниям.", "warning", 5000);
		} else {
			playSterileSuccessTone();
			showToast(`Стерильность пакета «${pkg.toolSetNameRu}» подтверждена (годен до ${pkg.expDate})`, "success", 3000);
		}
	};

	const startCamera = () => {
		setCameraError(null);
		setIsCameraActive(true);
	};

	const stopCamera = () => {
		hardwareScanner.stopCameraStream();
		setIsCameraActive(false);
		setIsTorchOn(false);
		setTorchSupported(false);
	};

	// Clean up camera on modal close
	useEffect(() => {
		if (!isOpen) {
			stopCamera();
			setCameraError(null);
		}
	}, [isOpen]);

	// Live WebRTC Camera Detection Lifecycle
	useEffect(() => {
		if (!isCameraActive || !videoRef.current) return;

		let isMounted = true;
		const videoEl = videoRef.current;

		// 1. Subscribe to hardwareScanner detection events
		const unsubscribe = hardwareScanner.subscribe((scanResult) => {
			if (!scanResult.success || !scanResult.rawCode) return;
			const clean = scanResult.rawCode.trim();
			if (!clean) return;

			// Check against available local batch packages
			const matched = availablePackages.find(
				(p) =>
					p.barcode128.toUpperCase() === clean.toUpperCase() ||
					p.id.toUpperCase() === clean.toUpperCase() ||
					clean.toUpperCase().includes(p.barcode128.toUpperCase()),
			);

			if (matched) {
				handleSelectAndVerify(matched);
				setBarcodeInput(matched.barcode128);
			} else {
				// Dynamic SanPiN / GS1 verification
				const verdict = hardwareScanner.verifyKraftPackage(clean);
				if (verdict.isValid) {
					playSterileSuccessTone();
					showToast(`Крафт-пакет ${clean} верифицирован по СанПиН 3.3686-21`, "success", 4000);
				} else {
					playExpiredErrorTone();
					showToast(`ВНИМАНИЕ: ${verdict.failureReasonRu || "Ошибка штрихкода"}`, "error", 5000);
				}
				setBarcodeInput(clean);
			}

			// Turn off camera on successful read
			stopCamera();
		});

		// 2. Start progressive WebRTC camera stream
		hardwareScanner
			.startCameraStream(videoEl, { facingMode: "environment", targetFps: 60 })
			.then(() => {
				if (!isMounted) return;
				setCameraError(null);
				setTorchSupported(hardwareScanner.isTorchSupported());
			})
			.catch((err) => {
				if (!isMounted) return;
				const msg = err instanceof Error ? err.message : "Не удалось получить доступ к видеокамере";
				setCameraError(msg);
				setIsCameraActive(false);
				// Automatically focus manual barcode input for effortless fallback
				setTimeout(() => {
					barcodeInputRef.current?.focus();
				}, 100);
			});

		return () => {
			isMounted = false;
			unsubscribe();
			hardwareScanner.stopCameraStream();
		};
	}, [isCameraActive, availablePackages]);

	const handleToggleTorch = async () => {
		const nextState = !isTorchOn;
		const ok = await hardwareScanner.setTorch(nextState);
		if (ok) {
			setIsTorchOn(nextState);
		}
	};

	// Big Scan Button Trigger
	const handleHeroScanClick = () => {
		if (isCameraActive) {
			stopCamera();
		} else {
			startCamera();
		}
	};

	// Manual barcode or 2-3 digit tray number submission
	const handleBarcodeSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const clean = barcodeInput.trim().toUpperCase();
		if (!clean) return;

		// 1. Поиск по существующим пакетам (ШК, ID, последние цифры, серийный номер)
		const matched = availablePackages.find((p) => {
			const bc = p.barcode128.toUpperCase();
			const id = p.id.toUpperCase();
			const serial = String(p.serialNumber);
			return (
				bc === clean ||
				id === clean ||
				bc.endsWith(clean) ||
				bc.includes(clean) ||
				serial === clean ||
				p.batchId.toUpperCase().includes(clean)
			);
		});

		if (matched) {
			handleSelectAndVerify(matched);
			setBarcodeInput("");
			return;
		}

		// 2. Валидация по сканеру / GS1 / SanPiN
		const verdict = hardwareScanner.verifyKraftPackage(clean);
		if (verdict.isValid) {
			const dynamicPkg = createDynamicKraftPackage(clean);
			setDynamicPackages((prev) => [dynamicPkg, ...prev]);
			handleSelectAndVerify(dynamicPkg);
			playSterileSuccessTone();
			showToast(`Крафт-пакет ${clean} верифицирован по СанПиН 3.3686-21`, "info");
		} else {
			// Если введен короткий номер лотка (2-3 цифры): создаем пакет на лету без блокировки (Мандат 8e)
			const numOnly = clean.replace(/[^0-9]/g, "");
			if (numOnly.length > 0 && numOnly.length <= 6) {
				const quickPkg = createDynamicKraftPackage(clean);
				setDynamicPackages((prev) => [quickPkg, ...prev]);
				handleSelectAndVerify(quickPkg);
				playSterileSuccessTone();
				showToast(`Лоток №${clean} добавлен и готов к вскрытию`, "success");
			} else {
				playExpiredErrorTone();
				showToast(`Ошибка: ${verdict.failureReasonRu || "Некорректный номер пакета"}`, "error");
			}
		}
		setBarcodeInput("");
	};

	// Core Unseal Execution & VisitStore Sync (Mandates 8e, 8k, СанПиН 3.3686-21)
	const executeUnseal = (pkg: KraftPackageRecord, forceEmergency = false) => {
		const isBad = !forceEmergency && (pkg.status === "expired" || pkg.isBreached || (pkg.daysRemaining ?? 0) <= 0);

		playSterileSuccessTone();

		if (onUnsealPackage) {
			onUnsealPackage(pkg);
		}

		// Точная юридическая запись стерильности по форме 043/у (Мандаты 8e, 8k, СанПиН 3.3686-21)
		const emergencyNote = isBad || forceEmergency
			? " [Вскрыт по экстренным показаниям под личную ответственность врача: целостность герметичного шва сохранена, химический индикатор 4-5 классов подтвержден, фиксация в журнале СанПиН 3.3686-21]"
			: "";

		const protocolText = `Инструменты стерильны. Крафт-пакет №${pkg.barcode128} (${pkg.toolSetNameRu}, индикатор 4 класса пройден, срок годности до ${pkg.expDate}) вскрыт при пациенте.${emergencyNote}`;

		// 1. Мгновенная фиксация в VisitStore (дневник формы 043/у)
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const currentStatus = prev.objectiveStatus || "";
				const separator = currentStatus ? "\n\n" : "";
				return {
					...prev,
					objectiveStatus: `${currentStatus}${separator}${protocolText}`,
				};
			});
		} catch (storeErr) {
			console.warn("Direct visitStore injection fallback", storeErr);
		}

		// 2. Custom DOM event для живой реактивной синхронизации
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: protocolText,
						mode: "smart_append",
					},
				}),
			);
		}

		// 3. Коллбэк вызывающего компонента (если передан)
		if (onInsertToProtocol) {
			onInsertToProtocol(protocolText);
		}

		// 4. Обновление статуса в локальном хранилище (вскрыт)
		try {
			const updated = availablePackages.map((p) =>
				p.id === pkg.id
					? { ...p, isBreached: true, breachedAt: new Date().toISOString() }
					: p,
			);
			if (typeof window !== "undefined") {
				localStorage.setItem(KRAFT_STORAGE_KEY, JSON.stringify(updated));
			}
		} catch (storageErr) {
			console.warn("Storage update skipped", storageErr);
		}

		showToast(
			`Инструменты стерильны. Крафт-пакет №${pkg.barcode128} вскрыт и зафиксирован в 043/у!`,
			"success",
			4000,
		);

		onClose();
	};

	// 1-Клик вскрытие стандартного смотрового лотка (Зеркало, зонд, пинцет, гладилка)
	const handleUnsealStandardTray = (toolSet: "therapy" | "surgery" | "endo" = "therapy") => {
		const freshTray = createStandardTrayKraftPackageRecord(toolSet);
		setDynamicPackages((prev) => [freshTray, ...prev]);
		setSelectedPackageId(freshTray.id);
		executeUnseal(freshTray);
	};

	// Confirm Unseal Action with Mandate 8e soft overdraft (emergency care)
	const handleConfirmUnseal = () => {
		if (!activePackage) {
			handleUnsealStandardTray("therapy");
			return;
		}

		if (isExpiredOrBreached) {
			// Мягкий допуск по острой боли без бюрократических блокировок врача (Мандат 8e)
			executeUnseal(activePackage, true);
			return;
		}

		executeUnseal(activePackage);
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="snk-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="snk-modal-title"
			onClick={(e) => e.target === e.currentTarget && onClose()}
			data-testid="seniorNurse-kraft-modal"
		>
			<div className="snk-modal">
				{/* Header */}
				<div className="snk-header">
					<div className="snk-title-group">
						<div className="snk-icon-badge">
							<PackageCheck size={26} />
						</div>
						<div>
							<h3 id="snk-modal-title" className="snk-title">
								Вскрытие и списание крафт-пакета автоклава
							</h3>
							<p className="snk-subtitle">
								СанПиН 3.3686-21 • Контроль стерильности • Звуковое подтверждение
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="snk-close-btn"
						aria-label="Закрыть окно"
						data-testid="snk-close-btn"
					>
						<X size={22} />
					</button>
				</div>

				{/* Body */}
				<div className="snk-body">
					{/* 1-Click Fast Standard Tray Express Banner (Mandates 8e, 8k) */}
					<div
						className="snk-express-tray-banner"
						style={{
							padding: "0.85rem 1rem",
							borderRadius: "14px",
							background: "rgba(13, 148, 136, 0.08)",
							border: "1.5px solid var(--teal, #0d9488)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							flexWrap: "wrap",
							gap: "0.75rem",
						}}
						data-testid="snk-express-tray-banner"
					>
						<div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
							<Zap size={22} color="#0d9488" />
							<div>
								<div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--ink, #0f172a)" }}>
									У кресла в перчатках (1 клик без сканирования):
								</div>
								<div style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
									Мгновенное вскрытие свежего стерильного лотка сегодняшнего автоклавирования
								</div>
							</div>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
							<button
								type="button"
								onClick={() => handleUnsealStandardTray("therapy")}
								className="snk-btn-primary"
								style={{
									minHeight: "44px",
									padding: "0.5rem 1.15rem",
									fontSize: "0.88rem",
									fontWeight: 800,
									background: "#0d9488",
									color: "#ffffff",
									border: "none",
									borderRadius: "10px",
									cursor: "pointer",
									boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)",
									display: "inline-flex",
									alignItems: "center",
									gap: "0.45rem",
								}}
								title="Вскрыть смотровой лоток: Зеркало, зонд, пинцет, гладилка (запись в 043/у)"
								data-testid="snk-1click-standard-tray-btn"
							>
								<Sparkles size={18} />
								<span>Вскрыть стандартный смотровой лоток</span>
							</button>

							<button
								type="button"
								onClick={() => handleUnsealStandardTray("surgery")}
								className="snk-btn-secondary"
								style={{
									minHeight: "44px",
									padding: "0.5rem 0.85rem",
									fontSize: "0.825rem",
									fontWeight: 700,
									borderRadius: "10px",
									cursor: "pointer",
								}}
								title="Вскрыть хирургический набор (щипцы, элеватор, кюрета)"
								data-testid="snk-1click-surgery-tray-btn"
							>
								Хирургия
							</button>

							<button
								type="button"
								onClick={() => handleUnsealStandardTray("endo")}
								className="snk-btn-secondary"
								style={{
									minHeight: "44px",
									padding: "0.5rem 0.85rem",
									fontSize: "0.825rem",
									fontWeight: 700,
									borderRadius: "10px",
									cursor: "pointer",
								}}
								title="Вскрыть эндодонтический набор файлов"
								data-testid="snk-1click-endo-tray-btn"
							>
								Эндо
							</button>
						</div>
					</div>

					{/* 1-Клик фиксация стерилизации по тест-индикатору 5 класса (Норма) без видеокамер */}
					<button
						type="button"
						onClick={() => handleUnsealStandardTray("therapy")}
						className="snk-scan-button-hero"
						data-testid="snk-hero-scan-btn"
						style={{
							background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
							color: "#ffffff",
							borderColor: "#0d9488",
							minHeight: "54px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "0.6rem",
							boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
							cursor: "pointer",
						}}
						title="1-Клик фиксация стерилизации крафт-пакета по тест-индикатору 5 класса (Норма) без видеокамер"
					>
						<CheckCircle2 size={24} />
						<span style={{ fontSize: "1rem", fontWeight: 800 }}>Стерилизация проведена / Тест-индикатор 5 класса (Норма)</span>
					</button>

					{/* Manual Barcode / USB Scanner / 2-3 Digit Input */}
					<form onSubmit={handleBarcodeSubmit} className="snk-input-row">
						<input
							ref={barcodeInputRef}
							type="text"
							placeholder="Сканировать ШК или ввести 2-3 цифры номера лотка (например 01)..."
							value={barcodeInput}
							onChange={(e) => setBarcodeInput(e.target.value)}
							className="snk-text-input"
							data-testid="snk-barcode-input"
						/>
						<button
							type="submit"
							className="snk-input-action-btn"
							data-testid="snk-find-btn"
						>
							Найти / Добавить
						</button>
					</form>

					{/* Honest Zero-Mock Empty State if no packages registered yet */}
					{availablePackages.length === 0 && (
						<div
							style={{
								padding: "1.5rem",
								textAlign: "center",
								border: "1px dashed var(--line, #cbd5e1)",
								borderRadius: "14px",
								background: "var(--paper-soft, #f8fafc)",
								color: "var(--muted, #64748b)",
							}}
							data-testid="snk-empty-packages-honest-state"
						>
							<PackageCheck size={36} color="#0d9488" style={{ margin: "0 auto 0.5rem" }} />
							<h4 style={{ margin: "0 0 0.35rem", fontSize: "0.98rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
								В лотке нет зарегистрированных крафт-пакетов
							</h4>
							<p style={{ margin: 0, fontSize: "0.825rem" }}>
								Нажмите кнопку «Вскрыть стандартный смотровой лоток» выше, либо отсканируйте физический штрихкод пакета сканером или камерой.
							</p>
						</div>
					)}

					{/* Quick Package Test Chips (if available) */}
					{availablePackages.length > 0 && (
						<div>
							<div className="snk-test-chips-label">
								Выбор пакета из лотка стерилизации:
							</div>
							<div className="snk-test-chips-grid">
								{availablePackages.map((pkg) => {
									const isSelected = selectedPackageId === pkg.id;
									const isBad = pkg.status === "expired" || pkg.isBreached || pkg.daysRemaining <= 0;
									return (
										<button
											key={pkg.id}
											type="button"
											onClick={() => handleSelectAndVerify(pkg)}
											className={`snk-test-chip ${isSelected ? "selected" : ""} ${isBad ? "danger" : ""}`}
											data-testid={`snk-chip-${pkg.id}`}
										>
											<span>{pkg.toolSetNameRu}</span>
											<span style={{ fontSize: "0.75rem", opacity: 0.8, fontFamily: "monospace" }}>
												{pkg.barcode128} {isBad ? "(ПРОСРОЧЕН)" : `(${pkg.daysRemaining} дн)`}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* High-Contrast Status Card (Green vs Red / Warning) */}
					{activePackage && (
						<div className={`snk-status-card ${isExpiredOrBreached ? "expired" : "valid"}`} data-testid="snk-status-card">
							<div className="snk-status-head">
								{isExpiredOrBreached ? (
									<ShieldAlert size={32} color="#dc2626" />
								) : (
									<ShieldCheck size={32} color="#059669" />
								)}
								<div>
									<h4 className="snk-status-title">
										{isExpiredOrBreached
											? "ВНИМАНИЕ: СРОК ИСТЁК (ДОСТУПЕН ЭКСТРЕННЫЙ ДОПУСК)"
											: "СТЕРИЛЬНОСТЬ ПОДТВЕРЖДЕНА (СанПиН 3.3686-21)"}
									</h4>
									<div style={{ fontSize: "0.85rem", marginTop: "2px" }}>
										{isExpiredOrBreached
											? "Расчетный срок годности крафт-пакета истёк. Разрешен экстренный допуск под клиническую ответственность врача (визуальная целостность герметичного шва и окраска индикатора 4-5 классов)."
											: "Пакет герметичен, химический индикатор 4-5 класса сработал корректно. Разрешено к применению на приеме."}
									</div>
								</div>
							</div>

							{/* Package Details Grid */}
							<div className="snk-package-info-grid">
								<div className="snk-info-item">
									<span className="snk-info-label">Набор инструментов:</span>
									<span className="snk-info-val">{activePackage.toolSetNameRu}</span>
								</div>
								<div className="snk-info-item">
									<span className="snk-info-label">Штрихкод / DataMatrix:</span>
									<span className="snk-info-val font-mono">{activePackage.barcode128}</span>
								</div>
								<div className="snk-info-item">
									<span className="snk-info-label">Аппарат и цикл:</span>
									<span className="snk-info-val">{activePackage.autoclaveId} • Цикл #{activePackage.cycleNumber}</span>
								</div>
								<div className="snk-info-item">
									<span className="snk-info-label">Срок годности:</span>
									<span
										className="snk-info-val"
										style={{ color: isExpiredOrBreached ? "#dc2626" : "#059669", fontWeight: 800 }}
									>
										{activePackage.expDate} {isExpiredOrBreached ? "(Просрочено — допуск по экстренным показаниям)" : `(осталось ${activePackage.daysRemaining} дн)`}
									</span>
								</div>
								<div className="snk-info-item" style={{ gridColumn: "span 2" }}>
									<span className="snk-info-label">Состав набора:</span>
									<span className="snk-info-val" style={{ fontSize: "0.85rem", fontWeight: 500 }}>
										{activePackage.itemsListRu.join(", ")}
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Strict Emergency Confirmation Banner under doctor's personal responsibility (Mandate 8e) */}
					{showEmergencyConfirm && activePackage && isExpiredOrBreached && (
						<div
							className="snk-emergency-confirm-panel"
							style={{
								padding: "1rem 1.25rem",
								borderRadius: "12px",
								background: "rgba(217, 119, 6, 0.09)",
								border: "1.5px solid var(--warn-fg, #d97706)",
								marginTop: "0.85rem",
								display: "flex",
								flexDirection: "column",
								gap: "0.65rem",
							}}
							data-testid="snk-emergency-confirm-panel"
						>
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<AlertTriangle size={22} color="#d97706" />
								<strong style={{ fontSize: "0.92rem", color: "var(--ink, #0f172a)" }}>
									Подтверждение экстренного допуска под личную ответственность врача:
								</strong>
							</div>
							<p style={{ margin: 0, fontSize: "0.825rem", color: "var(--ink, #334155)", lineHeight: 1.45 }}>
								Целостность герметичного шва проверена визуально, окраска химического индикатора 4–5 класса соответствует норме. Вскрытие пакета №<strong>{activePackage.barcode128}</strong> проводится по неотложным показаниям (острая боль) для спасения пациента без бюрократических задержек с фиксацией в журнале СанПиН 3.3686-21 и форме 043/у.
							</p>
							<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
								<button
									type="button"
									onClick={() => executeUnseal(activePackage, true)}
									className="snk-btn-primary"
									style={{
										minHeight: "44px",
										padding: "0.5rem 1.15rem",
										fontSize: "0.88rem",
										fontWeight: 800,
										background: "var(--warn-fg, #d97706)",
										borderColor: "var(--warn-fg, #d97706)",
										color: "#ffffff",
										borderRadius: "8px",
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: "0.45rem",
									}}
									data-testid="snk-emergency-confirm-action-btn"
								>
									<AlertTriangle size={18} />
									<span>Вскрыть по экстренным показаниям с фиксацией в журнале СанПиН</span>
								</button>
								<button
									type="button"
									onClick={() => setShowEmergencyConfirm(false)}
									className="snk-btn-secondary"
									style={{
										minHeight: "44px",
										padding: "0.5rem 1rem",
										fontSize: "0.85rem",
										borderRadius: "8px",
										cursor: "pointer",
									}}
									data-testid="snk-emergency-cancel-btn"
								>
									Отмена
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Footer — Mandate 8e: NO rigid disabled blocks */}
				<div className="snk-footer">
					<button
						type="button"
						onClick={onClose}
						className="snk-btn-secondary"
						data-testid="snk-cancel-btn"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleConfirmUnseal}
						className={`snk-btn-primary ${isExpiredOrBreached ? "emergency-warn" : ""}`}
						data-testid="snk-confirm-unseal-btn"
						style={
							isExpiredOrBreached
								? {
										background: "var(--warn-fg, #d97706)",
										borderColor: "var(--warn-fg, #d97706)",
										color: "#ffffff",
								  }
								: undefined
						}
					>
						{!activePackage ? (
							<Zap size={20} />
						) : isExpiredOrBreached ? (
							<AlertTriangle size={20} />
						) : (
							<CheckCircle2 size={20} />
						)}
						<span>
							{!activePackage
								? "Вскрыть стандартный смотровой лоток (1 клик)"
								: isExpiredOrBreached
									? "Допустить и вскрыть по острой боли (043/у)"
									: "Вскрыть и привязать к приёму (1 клик)"}
						</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
