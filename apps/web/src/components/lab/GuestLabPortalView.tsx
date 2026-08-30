import type React from "react";
import { GuestLabPortal } from "../../GuestLabPortal";

export interface GuestLabPortalViewProps {
	readonly token: string;
	readonly className?: string;
}

export const GuestLabPortalView: React.FC<GuestLabPortalViewProps> = ({
	token,
	className = "",
}) => {
	return (
		<div className={`guest-lab-portal-view-wrapper ${className}`} data-testid="guest-lab-portal-view">
			<GuestLabPortal token={token} />
		</div>
	);
};

export { GuestLabPortal } from "../../GuestLabPortal";
export default GuestLabPortalView;
