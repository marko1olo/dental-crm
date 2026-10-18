import { Globe, Save } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { buildPublicBookingPortalUrl } from "../../lib/publicPortalRoute";
import { showToast } from "../GlobalToast";
import { BookingAntiSpamCard } from "./booking/BookingAntiSpamCard";
import {
	type PublicBookingWidgetConfig,
	loadBookingConfig,
	saveBookingConfig,
} from "./booking/bookingConfigTypes";
import { BookingDoctorsAndServicesCard } from "./booking/BookingDoctorsAndServicesCard";
import { BookingLinkShareCard } from "./booking/BookingLinkShareCard";

export const PublicBookingLinkPanel: React.FC = () => {
	const { dashboard } = useAppLogicContext() as {
		dashboard?: {
			clinicSettings?: {
				profile?: { organizationId?: string | null; clinicName?: string } | null;
			} | null;
		} | null;
	};

	const organizationId = dashboard?.clinicSettings?.profile?.organizationId?.trim() ?? "";
	const clinicName = dashboard?.clinicSettings?.profile?.clinicName || "Клиника DENTE";

	const bookingUrl = useMemo(
		() => buildPublicBookingPortalUrl(organizationId || undefined),
		[organizationId],
	);

	const [config, setConfig] = useState<PublicBookingWidgetConfig>(loadBookingConfig);

	const handleSave = () => {
		saveBookingConfig(config);
		showToast("Настройки онлайн-записи сохранены", "success");
	};

	return (
		<div className="space-y-4 animate-fade-in" data-testid="public-booking-panel">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h3 className="text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
						<Globe size={18} className="text-[var(--teal)]" />
						<span>Онлайн-запись и виджет</span>
					</h3>
					<p className="text-xs text-[var(--muted)] m-0">
						Прямая ссылка для пациентов, Яндекс.Карт, 2ГИС и виджет для сайта клиники.
					</p>
				</div>
				<button
					type="button"
					onClick={handleSave}
					className="h-9 min-h-[44px] px-4 rounded-xl bg-[var(--teal)] text-[var(--on-teal)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
				>
					<Save size={14} />
					<span>Сохранить настройки</span>
				</button>
			</div>

			<BookingLinkShareCard bookingUrl={bookingUrl} clinicName={clinicName} />
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<BookingDoctorsAndServicesCard config={config} onChange={setConfig} />
				<BookingAntiSpamCard config={config} onChange={setConfig} />
			</div>
		</div>
	);
};

export default PublicBookingLinkPanel;
