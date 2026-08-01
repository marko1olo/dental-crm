/**
 * Ссылка онлайн-записи для сайта / QR / мессенджера.
 *
 * БЫЛО: PublicBookingWidget + /api/public/booking LIVE (doctors/slots/book),
 * hash #/portal/booking/<orgId> разбирается publicPortalRouteFromHash — но
 * **admin UI «скопировать ссылку» отсутствовал**. Владелец не мог выдать
 * рабочую ссылку из кабинета без ручной сборки URL (и раньше QrGatewayPanel
 * печатал ?clinicId= — битый путь). Lab-order уже копирует портал-ссылку;
 * booking — нет.
 *
 * ТЕПЕРЬ: панель читает organizationId из dashboard.clinicSettings.profile,
 * строит URL через buildPublicBookingPortalUrl (единый path), копирует в
 * буфер, открывает в новой вкладке. Без orgId — честный отказ, не битая ссылка.
 */

import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { CalendarDays, Check, Copy, ExternalLink } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { buildPublicBookingPortalUrl } from "../../lib/publicPortalRoute";
import { showToast } from "../GlobalToast";

export const PublicBookingLinkPanel: React.FC = () => {
	const { dashboard } = useAppLogicContext() as {
		dashboard?: {
			clinicSettings?: { profile?: { organizationId?: string | null } | null } | null;
		} | null;
	};

	const organizationId =
		dashboard?.clinicSettings?.profile?.organizationId?.trim() ?? "";

	const bookingUrl = useMemo(
		() => (organizationId ? buildPublicBookingPortalUrl(organizationId) : null),
		[organizationId],
	);

	const [copied, setCopied] = useState(false);

	const onCopy = useCallback(async () => {
		if (!bookingUrl) {
			showToast(
				"Ссылка не собрана: в профиле клиники нет идентификатора организации.",
				"error",
				12000,
			);
			return;
		}
		try {
			await navigator.clipboard.writeText(bookingUrl);
			setCopied(true);
			showToast("Ссылка онлайн-записи скопирована в буфер обмена", "success", 6000);
			window.setTimeout(() => setCopied(false), 2500);
		} catch (e) {
			console.error("[public-booking-link] clipboard failed", e);
			showToast(
				"Не удалось скопировать: браузер запретил доступ к буферу. Выделите ссылку вручную.",
				"error",
				12000,
			);
		}
	}, [bookingUrl]);

	const onOpen = useCallback(() => {
		if (!bookingUrl) return;
		window.open(bookingUrl, "_blank", "noopener,noreferrer");
	}, [bookingUrl]);

	return (
		<section
			className="profile-section-card"
			data-testid="public-booking-link-panel"
			aria-label="Ссылка онлайн-записи"
		>
			<div className="profile-section-header">
				<div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60">
					<CalendarDays size={24} aria-hidden="true" />
				</div>
				<div className="profile-section-title">
					<h3>Онлайн-запись для пациентов</h3>
					<p>
						Публичная страница: пациент выбирает врача и слот без входа в
						кабинет. Разместите ссылку на сайте клиники, в соцсетях или на
						QR у стойки.
					</p>
				</div>
			</div>

			<div className="profile-form-grid" style={{ marginTop: "12px" }}>
				{!bookingUrl ? (
					<p
						className="text-sm text-rose-600 dark:text-rose-300"
						data-testid="public-booking-link-missing-org"
						role="status"
					>
						Идентификатор клиники ещё не загружен. Откройте настройки снова
						после входа или обновите страницу — без него ссылку собрать нельзя.
					</p>
				) : (
					<>
						<label className="profile-form-group full-width" htmlFor="public-booking-link-url">
							<span className="profile-form-label">Ссылка для сайта и QR</span>
							<input
								id="public-booking-link-url"
								type="text"
								readOnly
								value={bookingUrl}
								data-testid="public-booking-link-url"
								className="w-full font-mono text-xs"
								onFocus={(e) => e.currentTarget.select()}
								aria-readonly="true"
							/>
							<span className="profile-form-hint">
								{"Формат: #/portal/booking/<id клиники> — тот же путь, что читает виджет записи и API /api/public/booking."}
							</span>
						</label>

						<div
							className="profile-form-group full-width"
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "8px",
								alignItems: "center",
							}}
						>
							<button
								type="button"
								className="primary-button"
								data-testid="public-booking-link-copy"
								onClick={() => void onCopy()}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "8px",
									minHeight: 44,
									minWidth: 44,
								}}
							>
								{copied ? (
									<>
										<Check size={16} aria-hidden="true" /> Скопировано
									</>
								) : (
									<>
										<Copy size={16} aria-hidden="true" /> Копировать ссылку
									</>
								)}
							</button>
							<button
								type="button"
								className="secondary-button"
								data-testid="public-booking-link-open"
								onClick={onOpen}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "8px",
									minHeight: 44,
									minWidth: 44,
								}}
							>
								<ExternalLink size={16} aria-hidden="true" /> Открыть страницу
							</button>
						</div>
					</>
				)}
			</div>
		</section>
	);
};

export default PublicBookingLinkPanel;
