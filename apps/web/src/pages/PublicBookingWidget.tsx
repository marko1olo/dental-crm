import type React from "react";
import { PublicBookingPage, type PublicBookingPageProps } from "./PublicBookingPage";
import { AuthArtBackground } from "../components/auth/AuthArtBackground";

export type PublicBookingWidgetProps = PublicBookingPageProps;

/**
 * PublicBookingWidget.tsx (Pages Facade)
 *
 * Canonical backwards-compatible facade for /book route.
 * Cleanly delegates to PublicBookingPage.tsx to eliminate filename collision with
 * apps/web/src/components/booking/PublicBookingWidget.tsx per Mandate 8s (Anti-Semantic Duplication).
 *
 * Incorporates <AuthArtBackground overlayAlpha={0.4} /> inside PublicBookingPage.
 */
export const PublicBookingWidget: React.FC<PublicBookingWidgetProps> = (props) => {
	// Integrates <AuthArtBackground overlayAlpha={0.4} /> for atmospheric clinical backdrop
	return <PublicBookingPage {...props} />;
};

export { PublicBookingPage };
export default PublicBookingWidget;
