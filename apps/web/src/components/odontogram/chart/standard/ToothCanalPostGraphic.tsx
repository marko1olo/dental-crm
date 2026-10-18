import type React from "react";
import type { PostCoreType } from "../../anatomicalToothGeometries";

export interface ToothCanalPostGraphicProps {
	geom: any;
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	isTop: boolean;
}

export const ToothCanalPostGraphic: React.FC<ToothCanalPostGraphicProps> = ({
	geom,
	hasPost,
	postType,
	isTop,
}) => {
	if (!hasPost) return null;

	if (postType === "fiber") {
		return (
			<g filter="url(#dente-glow-indigo)">
				<path d={geom.canals} fill="none" stroke="url(#fiber-post-gradient)" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
				<path d={geom.canals} fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.95" />
			</g>
		);
	}

	if (postType === "cast_core" || postType === "titanium") {
		return (
			<g filter="url(#dente-metallic-specular)">
				<path d={geom.canals} fill="none" stroke="url(#cast-core-post-gradient)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
				<polygon points={isTop ? "40,88 60,88 56,106 44,106" : "40,72 60,72 56,54 44,54"} fill="url(#cast-core-post-gradient)" stroke="#334155" strokeWidth="1.2" />
			</g>
		);
	}

	return null;
};
