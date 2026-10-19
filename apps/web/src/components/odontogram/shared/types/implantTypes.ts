export interface TitaniumImplantGeometry {
	readonly fixtureBodyPath: string;
	readonly collarPath: string;
	readonly abutmentPath: string;
	readonly threads: readonly string[];
}

export interface ImplantSlaProps {
	readonly geometry: TitaniumImplantGeometry;
	readonly showAbutment?: boolean | undefined;
	readonly isDark?: boolean | undefined;
	readonly className?: string | undefined;
}
