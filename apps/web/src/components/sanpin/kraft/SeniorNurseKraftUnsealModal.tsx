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
} from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import {
	type KraftPackageRecord,
	generateDataMatrixSvg,
} from "./kraftPackageEngine.js";
import {
	playSterileSuccessTone,
	playExpiredErrorTone,
} from "./seniorNurseKraftAudio.js";
import { hardwareScanner } from "../../../services/hardware/HardwareScanner.js";
import "./seniorNurseKraft.css";

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
	// Sample packages database if activeBatchRecords is empty
	const defaultSamplePacks: KraftPackageRecord[] = useMemo(() => {
		const now = new Date();
		const packDate = now.toISOString().slice(0, 10);
		const validExp = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const expiredExp = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

		return [
			{
				id: "snk-pkg-1",
				batchId: "KB-20260826-01",
				serialNumber: 1,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				toolSetNameRu: "Набор терапевтический (лоток)",
				itemsListRu: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет", "Штопфер-гладилка", "Экскаватор"],
				packDate,
				expDate: validExp,
				daysLifespan: 50,
				daysRemaining: 45,
				status: "sterile_valid",
				autoclaveId: "АК-01 (Melag)",
				cycleNumber: 3,
				operatorId: "NURSE-01",
				operatorName: "Смирнова А.В. (Медсестра ЦСО)",
				indicatorId: "vinar_steritest_4",
				indicatorVerified: true,
				barcode128: "KB2608260001",
				barcodeDataMatrixPayload: `KB-20260826-01#1|АК-01|CYC3|${packDate}|${validExp}|NURSE-01|SET-THER`,
				isBreached: false,
				notes: "Контроль автоклава пройден успешно",
				createdAt: now.toISOString(),
			},
			{
				id: "snk-pkg-2",
				batchId: "KB-20260826-02",
				serialNumber: 2,
				packageType: "paper_plastic_pouch",
				packageSize: "size_75x150",
				toolSetId: "set_endodontic_files",
				toolSetNameRu: "Эндодонтический набор файлов",
				itemsListRu: ["Эндобокс", "K-файлы #15-40", "Спредер", "Плаггер", "Линейка"],
				packDate,
				expDate: validExp,
				daysLifespan: 180,
				daysRemaining: 175,
				status: "sterile_valid",
				autoclaveId: "АК-01 (Melag)",
				cycleNumber: 3,
				operatorId: "NURSE-01",
				operatorName: "Смирнова А.В.",
				indicatorId: "integrator_class_5",
				indicatorVerified: true,
				barcode128: "KB2608260002",
				barcodeDataMatrixPayload: `KB-20260826-02#2|АК-01|CYC3|${packDate}|${validExp}|NURSE-01|SET-ENDO`,
				isBreached: false,
				notes: "Эндодонтия (СанПиН 180 сут.)",
				createdAt: now.toISOString(),
			},
			{
				id: "snk-pkg-expired",
				batchId: "KB-20260710-09",
				serialNumber: 9,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_surgical_standard",
				toolSetNameRu: "Хирургический набор (щипцы/элеваторы)",
				itemsListRu: ["Щипцы байонетные", "Элеватор прямой", "Кюрета", "Иглодержатель"],
				packDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
				expDate: expiredExp,
				daysLifespan: 50,
				daysRemaining: -10,
				status: "expired",
				autoclaveId: "АК-02 (Euronda)",
				cycleNumber: 1,
				operatorId: "NURSE-02",
				operatorName: "Иванова М.П.",
				indicatorId: "vinar_steritest_4",
				indicatorVerified: true,
				barcode128: "KB2607100009",
				barcodeDataMatrixPayload: `KB-20260710-09#9|АК-02|CYC1|EXP|NURSE-02|SET-SURG`,
				isBreached: false,
				notes: "Срок годности истек!",
				createdAt: now.toISOString(),
			},
		];
	}, []);

	const availablePackages = useMemo(() => {
		return activeBatchRecords && activeBatchRecords.length > 0 ? activeBatchRecords : defaultSamplePacks;
	}, [activeBatchRecords, defaultSamplePacks]);

	const [selectedPackageId, setSelectedPackageId] = useState<string>(availablePackages[0]?.id || "");
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

	// Sound trigger when package is selected
	const handleSelectAndVerify = (pkg: KraftPackageRecord) => {
		setSelectedPackageId(pkg.id);
		const isBad = pkg.status === "expired" || pkg.isBreached || pkg.daysRemaining <= 0;
		if (isBad) {
			playExpiredErrorTone();
			showToast("ВНИМАНИЕ! Срок стерильности крафт-пакета истёк! Использовать запрещено СанПиН.", "error", 5000);
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

	// Manual barcode submission
	const handleBarcodeSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const clean = barcodeInput.trim().toUpperCase();
		if (!clean) return;

		const matched = availablePackages.find(
			(p) => p.barcode128.toUpperCase() === clean || p.id.toUpperCase() === clean,
		);

		if (matched) {
			handleSelectAndVerify(matched);
		} else {
			const verdict = hardwareScanner.verifyKraftPackage(clean);
			if (verdict.isValid) {
				playSterileSuccessTone();
				showToast(`Внешний крафт-пакет ${clean} верифицирован по СанПиН 3.3686-21`, "info");
			} else {
				playExpiredErrorTone();
				showToast(`Ошибка: ${verdict.failureReasonRu || "Некорректный штрихкод"}`, "error");
			}
		}
		setBarcodeInput("");
	};

	// Confirm Unseal Action
	const handleConfirmUnseal = () => {
		if (!activePackage) return;
		if (isExpiredOrBreached) {
			playExpiredErrorTone();
			showToast("ОШИБКА: Запрещено вскрывать просроченный крафт-пакет на приеме!", "error");
			return;
		}

		playSterileSuccessTone();

		if (onUnsealPackage) {
			onUnsealPackage(activePackage);
		}

		const protocolText = `Вскрыт стерильный крафт-пакет СанПиН 3.3686-21: ${activePackage.barcode128} (${activePackage.toolSetNameRu}, Автоклав ${activePackage.autoclaveId} цикл #${activePackage.cycleNumber}, стерил. ${activePackage.packDate}, годен до ${activePackage.expDate}, контроль ЦСО: ${activePackage.operatorName}).`;

		if (onInsertToProtocol) {
			onInsertToProtocol(protocolText);
		}

		showToast(
			`Крафт-пакет ${activePackage.barcode128} успешно вскрыт и списан на приём!`,
			"success",
			4000,
		);

		onClose();
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
					{/* Live Camera Viewfinder or Hero Button */}
					{isCameraActive ? (
						<div className="snk-camera-section" data-testid="snk-camera-section">
							<div className="snk-camera-viewfinder">
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted
									className="snk-camera-video"
									data-testid="snk-camera-video"
								/>
								<div className="snk-camera-overlay">
									<div className="snk-camera-hint-pill">
										<Camera size={16} />
										<span>Наведите 2D DataMatrix крафт-пакета в рамку</span>
									</div>
									<div className="snk-scan-target">
										<div className="snk-scan-corner tl" />
										<div className="snk-scan-corner tr" />
										<div className="snk-scan-corner bl" />
										<div className="snk-scan-corner br" />
										<div className="snk-scan-laser" />
									</div>
									<div className="snk-camera-hint-pill" style={{ opacity: 0.85 }}>
										<span>60 FPS • Авто-распознавание</span>
									</div>
								</div>
							</div>
							<div className="snk-camera-controls">
								{torchSupported && (
									<button
										type="button"
										onClick={handleToggleTorch}
										className={`snk-camera-ctrl-btn ${isTorchOn ? "active" : ""}`}
										data-testid="snk-torch-btn"
									>
										{isTorchOn ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
										<span>{isTorchOn ? "Выключить подсветку" : "Фонарик (подсветка)"}</span>
									</button>
								)}
								<button
									type="button"
									onClick={stopCamera}
									className="snk-camera-ctrl-btn"
									data-testid="snk-stop-camera-btn"
								>
									<CameraOff size={18} />
									<span>Остановить камеру</span>
								</button>
							</div>
						</div>
					) : cameraError ? (
						<div className="snk-camera-denied-card" data-testid="snk-camera-denied-card">
							<div className="snk-denied-head">
								<CameraOff size={28} className="snk-denied-icon" />
								<div>
									<h4 className="snk-denied-title">Доступ к веб-камере не предоставлен</h4>
									<p className="snk-denied-text">{cameraError}</p>
								</div>
							</div>
							<div className="snk-denied-actions">
								<button
									type="button"
									onClick={startCamera}
									className="snk-denied-retry-btn"
									data-testid="snk-camera-retry-btn"
								>
									<RefreshCw size={16} />
									<span>Повторить запрос камеры</span>
								</button>
								<span style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
									Или введите номер пакета вручную ниже:
								</span>
							</div>
						</div>
					) : (
						<button
							type="button"
							onClick={handleHeroScanClick}
							className="snk-scan-button-hero"
							data-testid="snk-hero-scan-btn"
						>
							<Camera size={28} />
							<span>Включить камеру для сканирования 2D DataMatrix</span>
						</button>
					)}

					{/* Manual Barcode / USB Scanner Field */}
					<form onSubmit={handleBarcodeSubmit} className="snk-input-row">
						<input
							ref={barcodeInputRef}
							type="text"
							placeholder="Сканировать или ввести штрихкод (например KB2608260001)..."
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
							Найти
						</button>
					</form>

					{/* Quick Package Test Chips */}
					<div>
						<div className="snk-test-chips-label">
							Быстрый выбор пакета из лотка стерилизации:
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

					{/* High-Contrast Status Card (Green vs Red) */}
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
											? "ВНИМАНИЕ! СРОК СТЕРИЛЬНОСТИ ИСТЁК!"
											: "СТЕРИЛЬНОСТЬ ПОДТВЕРЖДЕНА (СанПиН 3.3686-21)"}
									</h4>
									<div style={{ fontSize: "0.85rem", marginTop: "2px" }}>
										{isExpiredOrBreached
											? "Использование данного пакета на пациенте СТРОГО ЗАПРЕЩЕНО. Направьте набор на повторную стерилизацию."
											: "Пакет герметичен, химический индикатор 5 класса сработал корректно. Разрешено к применению."}
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
										{activePackage.expDate} {isExpiredOrBreached ? "(Просрочено!)" : `(осталось ${activePackage.daysRemaining} дн)`}
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
				</div>

				{/* Footer */}
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
						disabled={!activePackage || isExpiredOrBreached}
						className="snk-btn-primary"
						data-testid="snk-confirm-unseal-btn"
					>
						<CheckCircle2 size={20} />
						<span>Вскрыть и привязать к приёму</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
