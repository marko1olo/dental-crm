import React from "react";
import { FileCode2 } from "lucide-react";

export interface TaxFnsXmlBannerProps {
	onOpenFnsXmlModal: () => void;
	onClose: () => void;
}

export const TaxFnsXmlBanner: React.FC<TaxFnsXmlBannerProps> = ({
	onOpenFnsXmlModal,
	onClose,
}) => {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "12px 16px",
				borderRadius: "8px",
				background: "var(--brand-100, #ccfbf1)",
				border: "1px solid var(--brand-700, #0d9488)",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<FileCode2 size={24} color="var(--brand-800, #115e59)" aria-hidden="true" />
				<div>
					<strong style={{ fontSize: "13px", color: "var(--brand-900, #134e4a)" }}>
						Электронная выгрузка справки в ФНС (XML-пакет для налоговой)
					</strong>
					<div style={{ fontSize: "12px", color: "var(--brand-800, #115e59)" }}>
						Автоматическая проверка XSD-схемы, ИНН, СНИЛС и формирование файла для отправки через ТКС/ЛК
					</div>
				</div>
			</div>
			<button
				type="button"
				className="primary-button"
				onClick={() => {
					onClose();
					onOpenFnsXmlModal();
				}}
			>
				Открыть XML-студию
			</button>
		</div>
	);
};
