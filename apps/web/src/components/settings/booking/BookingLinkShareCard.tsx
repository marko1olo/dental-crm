import { Code, Copy, ExternalLink, Globe } from "lucide-react";
import React, { useState } from "react";
import { showToast } from "../../GlobalToast";

interface Props {
	bookingUrl: string;
	clinicName: string;
}

export const BookingLinkShareCard: React.FC<Props> = ({ bookingUrl, clinicName }) => {
	const [showEmbedCode, setShowEmbedCode] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(bookingUrl);
		showToast("Ссылка на онлайн-запись скопирована", "success");
	};

	const iframeCode = `<iframe src="${bookingUrl}" width="100%" height="700" frameborder="0" style="border-radius: 16px;"></iframe>`;

	const handleCopyEmbed = () => {
		navigator.clipboard.writeText(iframeCode);
		showToast("HTML-код виджета скопирован", "success");
	};

	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] space-y-3">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Globe size={18} className="text-[var(--teal)]" />
					<h4 className="m-0 text-sm font-semibold text-[var(--ink)]">Ссылка на онлайн-запись</h4>
				</div>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={handleCopy}
						className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
					>
						<Copy size={13} />
						<span>Копировать</span>
					</button>
					<a
						href={bookingUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="h-8 px-3 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer no-underline"
					>
						<ExternalLink size={13} />
						<span>Открыть</span>
					</a>
				</div>
			</div>

			<input
				type="text"
				readOnly
				value={bookingUrl}
				className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] font-mono select-all"
			/>

			<div className="pt-2 border-t border-[var(--line-subtle)]">
				<button
					type="button"
					onClick={() => setShowEmbedCode(!showEmbedCode)}
					className="text-xs text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer"
				>
					<Code size={13} />
					<span>{showEmbedCode ? "Скрыть код для сайта" : "Получить код для сайта / Яндекс.Карт"}</span>
				</button>
				{showEmbedCode && (
					<div className="mt-2 space-y-2">
						<textarea
							readOnly
							rows={3}
							value={iframeCode}
							className="w-full p-2.5 text-[11px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono resize-none select-all"
						/>
						<button
							type="button"
							onClick={handleCopyEmbed}
							className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
						>
							<Copy size={13} />
							<span>Скопировать код</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
