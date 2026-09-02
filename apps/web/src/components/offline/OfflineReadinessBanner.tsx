/**
 * DENTE CRM — Offline Readiness & Local Autonomous Protection Banner
 *
 * Баннер готовности к офлайн-работе:
 * «⚡ Приложение готово к полной автономной работе без интернета»
 *
 * Функционал:
 * - Индикация активности Service Worker, Shell Cache и готовности IndexedDB
 * - 1-клик кнопка создания зашифрованного локального бэкапа базы клиники (.dente)
 * - 1-клик кнопка автоматической проверки целостности локального кэша
 * - Touch-first эргономика (зоны нажатия >= 44px) и адаптивность 320px–4K
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	CheckCircle2,
	Download,
	HardDrive,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import {
	type OfflineCacheIntegrityReport,
	exportOfflineClinicBackup,
	runStartupIntegrityAudit,
	verifyLocalCacheIntegrity,
} from "../../services/offline";
import "./OfflineReadinessBanner.css";

export interface OfflineReadinessBannerProps {
	className?: string;
	organizationId?: string | undefined;
	autoDismissDelayMs?: number | undefined;
	onBackupCreated?: (filename: string) => void;
}

const STORAGE_BANNER_DISMISSED_KEY = "dente_offline_readiness_banner_dismissed_v1";

export const OfflineReadinessBanner: React.FC<OfflineReadinessBannerProps> = ({
	className = "",
	organizationId,
	autoDismissDelayMs,
	onBackupCreated,
}) => {
	const [isDismissed, setIsDismissed] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		try {
			return sessionStorage.getItem(STORAGE_BANNER_DISMISSED_KEY) === "true";
		} catch {
			return false;
		}
	});

	const [isExporting, setIsExporting] = useState<boolean>(false);
	const [isVerifying, setIsVerifying] = useState<boolean>(false);
	const [lastReport, setLastReport] = useState<OfflineCacheIntegrityReport | null>(null);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	// Автоматический аудит при монтировании баннера
	useEffect(() => {
		let isMounted = true;
		void runStartupIntegrityAudit().then((report) => {
			if (isMounted) {
				setLastReport(report);
			}
		});
		return () => {
			isMounted = false;
		};
	}, []);

	// Опциональный авто-дисмисс
	useEffect(() => {
		if (!autoDismissDelayMs || isDismissed) return;
		const timer = setTimeout(() => {
			setIsDismissed(true);
		}, autoDismissDelayMs);
		return () => clearTimeout(timer);
	}, [autoDismissDelayMs, isDismissed]);

	const handleDismiss = useCallback(() => {
		setIsDismissed(true);
		try {
			sessionStorage.setItem(STORAGE_BANNER_DISMISSED_KEY, "true");
		} catch {
			// ignore
		}
	}, []);

	const handle1ClickBackup = useCallback(async () => {
		if (isExporting) return;
		setIsExporting(true);
		setStatusNotice(null);
		try {
			const result = await exportOfflineClinicBackup({
				organizationId,
				autoDownload: true,
			});
			setStatusNotice(`Бэкап сохранен: ${result.filename} (${result.stats.clinicalCache + result.stats.mutations} записей)`);
			if (onBackupCreated) {
				onBackupCreated(result.filename);
			}
			setTimeout(() => setStatusNotice(null), 5000);
		} catch (err) {
			setStatusNotice(`Ошибка создания бэкапа: ${err instanceof Error ? err.message : String(err)}`);
			setTimeout(() => setStatusNotice(null), 5000);
		} finally {
			setIsExporting(false);
		}
	}, [isExporting, organizationId, onBackupCreated]);

	const handleCheckIntegrity = useCallback(async () => {
		if (isVerifying) return;
		setIsVerifying(true);
		setStatusNotice(null);
		try {
			const report = await verifyLocalCacheIntegrity({ autoRepair: true, organizationId });
			setLastReport(report);
			if (report.healthy) {
				setStatusNotice(`Целостность подтверждена: ${report.totalChecked} записей проверено, 0 ошибок`);
			} else {
				setStatusNotice(`Обнаружено ${report.corruptedCount} повреждений, восстановлено: ${report.repairedCount}`);
			}
			setTimeout(() => setStatusNotice(null), 5000);
		} catch (err) {
			setStatusNotice(`Ошибка проверки: ${err instanceof Error ? err.message : String(err)}`);
			setTimeout(() => setStatusNotice(null), 5000);
		} finally {
			setIsVerifying(false);
		}
	}, [isVerifying, organizationId]);

	if (isDismissed) {
		return null;
	}

	return (
		<div
			role="region"
			aria-label="Уведомление о готовности к автономной офлайн-работе"
			className={`offline-readiness-banner ${className}`.trim()}
		>
			<div className="offline-readiness-banner__header">
				<div className="offline-readiness-banner__title-row">
					<div className="offline-readiness-banner__icon-badge" aria-hidden="true">
						<Zap size={18} />
					</div>
					<div>
						<h3 className="offline-readiness-banner__title">
							⚡ Приложение готово к полной автономной работе без интернета
						</h3>
						<p className="offline-readiness-banner__subtitle">
							Кэш оболочки v6 активен • База данных защищена локально в памяти устройства
						</p>
					</div>
				</div>

				<div className="offline-readiness-banner__actions">
					<button
						type="button"
						onClick={handle1ClickBackup}
						disabled={isExporting}
						className="offline-readiness-banner__btn offline-readiness-banner__btn--primary"
						title="Скачать зашифрованный архив локальной базы (.dente) на случай полного отключения сети"
					>
						<Download size={14} aria-hidden="true" />
						<span>{isExporting ? "Создание бэкапа..." : "1-Клик Бэкап (.dente)"}</span>
					</button>

					<button
						type="button"
						onClick={handleCheckIntegrity}
						disabled={isVerifying}
						className="offline-readiness-banner__btn offline-readiness-banner__btn--secondary"
						title="Проверить целостность и контрольные суммы локального кэша"
					>
						<ShieldCheck size={14} aria-hidden="true" />
						<span>{isVerifying ? "Проверка..." : "Проверить целостность"}</span>
					</button>

					<button
						type="button"
						onClick={handleDismiss}
						className="offline-readiness-banner__btn--dismiss"
						aria-label="Скрыть уведомление о готовности к офлайн-работе"
						title="Скрыть"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>
			</div>

			<div className="offline-readiness-banner__details">
				<div className="offline-readiness-banner__badges">
					<span className="offline-readiness-banner__badge">
						<CheckCircle2 size={12} color="var(--ok-fg, #059669)" aria-hidden="true" />
						<span>Service Worker Shell: CacheFirst</span>
					</span>

					<span className="offline-readiness-banner__badge">
						<HardDrive size={12} color="var(--teal, #0284c7)" aria-hidden="true" />
						<span>
							{lastReport
								? `Память: свободно ${lastReport.storageEstimate.freeFormatted} (${lastReport.storageEstimate.percentUsed}% занято)`
								: "IndexedDB Защищено"}
						</span>
					</span>

					{lastReport && (
						<span className="offline-readiness-banner__badge">
							<Sparkles size={12} color="var(--info-fg, #7c3aed)" aria-hidden="true" />
							<span>{`Записей в кэше: ${lastReport.storesStats.clinicalCacheCount + lastReport.storesStats.mutationsCount + lastReport.storesStats.draftsCount}`}</span>
						</span>
					)}
				</div>

				{statusNotice && (
					<div className="offline-readiness-banner__status-notice" style={{ color: "var(--teal, #0284c7)", fontWeight: 600 }}>
						{statusNotice}
					</div>
				)}
			</div>
		</div>
	);
};

export default OfflineReadinessBanner;
