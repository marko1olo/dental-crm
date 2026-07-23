import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

interface AddressItem {
	id: string;
	organizationId: string;
	patientName: string;
	rawAddress: string;
	fiasId: string;
	qcGeo: number;
	geoLat: string;
	geoLon: string;
	createdAt: string;
}

export const DadataGeocodedAddressesWidget: React.FC = () => {
	const [addresses, setAddresses] = useState<AddressItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/dadata-geocoded-addresses", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setAddresses(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[DadataGeocodedAddressesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="dadata-geocoded-addresses-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">📍</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Геокодинг и Валидация Адресов Пациентов через DaData (ФИАС / КЛАДР)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					DaData FIAS Geocoder
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка геокодированных адресов...
				</div>
			) : addresses.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет геокодированных адресов DaData.
				</div>
			) : (
				<div className="space-y-3">
					{addresses.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold">{item.patientName}</span>
									<span className="text-xs font-mono text-emerald-600 dark:text-emerald-300 font-semibold">
										({item.geoLat}, {item.geoLon})
									</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Адрес: {item.rawAddress}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-0.5 rounded border font-mono font-bold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									ФИАС: {item.fiasId.slice(0, 8)}...
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
