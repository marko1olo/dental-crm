import React, { useEffect, useState } from "react";

interface DadataAddressItem {
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
	const [addresses, setAddresses] = useState<DadataAddressItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/integrations/dadata-addresses", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-teal-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📍</span>
					<h3 className="font-semibold text-teal-400">
						Геокодирование Адресов и Проверка ФИАС (DaData API)
					</h3>
				</div>
				<span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/40">
					DaData FIAS / GPS
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка распознанных адресов...</div>
			) : (
				<div className="space-y-3">
					{addresses.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg space-y-1.5"
						>
							<div className="flex justify-between items-center">
								<span className="text-sm font-bold text-slate-200">{item.patientName}</span>
								<span className="text-xs bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800 font-mono">
									GPS: {item.geoLat}, {item.geoLon}
								</span>
							</div>
							<div className="text-xs text-slate-300 font-medium">{item.rawAddress}</div>
							<div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-700/40">
								ФИАС ID: <span className="text-teal-300">{item.fiasId}</span> (Точность: {item.qcGeo === 0 ? "100% Точный адрес" : "Приблизительно"})
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
