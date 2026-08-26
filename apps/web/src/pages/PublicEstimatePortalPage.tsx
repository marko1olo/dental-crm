import React, { useEffect, useState } from "react";
import { PublicEstimatePortal } from "../components/patient-portal/PublicEstimatePortal";

export interface PublicEstimatePortalPageProps {
	readonly token?: string;
}

export const PublicEstimatePortalPage: React.FC<PublicEstimatePortalPageProps> = ({
	token: propToken,
}) => {
	const [token, setToken] = useState<string>(propToken || "");

	useEffect(() => {
		if (!propToken && typeof window !== "undefined") {
			// Extract token from URL path (e.g. /p/estimates/:token or ?token=...)
			const pathParts = window.location.pathname.split("/").filter(Boolean);
			const lastPart = pathParts[pathParts.length - 1];
			const searchParams = new URLSearchParams(window.location.search);
			const queryToken = searchParams.get("token");

			const resolvedToken = queryToken || (lastPart && lastPart !== "estimates" && lastPart !== "p" ? lastPart : "");
			setToken(resolvedToken);
		}
	}, [propToken]);

	if (!token) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] p-6 text-center">
				<div className="max-w-md p-6 rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] shadow-xl space-y-3">
					<h2 className="text-lg font-bold">Ссылка на смету не указана</h2>
					<p className="text-xs text-[var(--muted,#64748b)] leading-relaxed">
						Пожалуйста, перейдите по индивидуальной ссылке из SMS/мессенджера или обратитесь к администратору клиники.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6">
			<PublicEstimatePortal token={token} />
		</div>
	);
};

export default PublicEstimatePortalPage;
