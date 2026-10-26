import React from "react";

interface PrivacyShieldDotsAndErrorProps {
	pin: string;
	errorText: string | null;
}

export function PrivacyShieldDotsAndError({ pin, errorText }: PrivacyShieldDotsAndErrorProps) {
	return (
		<>
			{/* 4 точки PIN-кода */}
			<div
				style={{
					display: "flex",
					gap: "14px",
					marginBottom: "16px",
					justifyContent: "center",
				}}
				aria-label={`Введено цифр PIN-кода: ${pin.length} из 4`}
			>
				{[0, 1, 2, 3].map((idx) => {
					const isFilled = idx < pin.length;
					return (
						<div
							key={idx}
							style={{
								width: "14px",
								height: "14px",
								borderRadius: "50%",
								backgroundColor: isFilled ? "#2dd4bf" : "rgba(255, 255, 255, 0.2)",
								boxShadow: isFilled ? "0 0 10px rgba(45, 212, 191, 0.8)" : "none",
								transform: isFilled ? "scale(1.2)" : "scale(1)",
								transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
							}}
						/>
					);
				})}
			</div>

			{/* Сообщение об ошибке */}
			{errorText && (
				<div
					style={{
						color: "#f87171",
						fontSize: "12px",
						fontWeight: 600,
						marginBottom: "12px",
						lineHeight: 1.3,
					}}
					role="alert"
				>
					{errorText}
				</div>
			)}
		</>
	);
}
