import React, { useEffect, useState } from "react";

interface AttachmentItem {
	id: string;
	organizationId: string;
	patientName: string;
	fileName: string;
	fileType: string;
	targetMessenger: string;
	deliveryStatus: string;
	createdAt: string;
}

export const MessengerFileAttachmentsWidget: React.FC = () => {
	const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/messenger-file-attachments", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setAttachments(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[MessengerFileAttachmentsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="messenger-file-attachments-widget"
			className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📎</span>
					<h3 className="font-semibold text-emerald-400">
						Отправка PDF-Документов, Памяток и Планов Лечения в Мессенджеры
					</h3>
				</div>
				<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
					Messenger Attachments
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка прикрепленных файлов...</div>
			) : (
				<div className="space-y-3">
					{attachments.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.fileName}</div>
								<div className="text-xs text-slate-400 mt-1">
									Пациент: <span className="text-slate-200 font-semibold">{item.patientName}</span> · Канал: {item.targetMessenger}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded border border-emerald-800 font-mono">
									✓ Доставлено в {item.targetMessenger}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
