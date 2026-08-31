import React, { createContext, forwardRef, useContext } from "react";

/**
 * Surface elevation levels corresponding to clinical tonal depth:
 * - base: Default canvas surface (var(--paper))
 * - raised: Elevated cards, toolbars, and active panels (var(--paper-strong))
 * - overlay: Modals, HUDs, and popups with soft drop shadow (var(--paper-strong))
 * - sunken: Inset wells, input fields, and background containers (var(--paper-soft))
 */
export type SurfaceElevationLevel = "base" | "raised" | "overlay" | "sunken";

export interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode;
	header?: React.ReactNode;
	footer?: React.ReactNode;
	sidebar?: React.ReactNode;
	className?: string;
	contentClassName?: string;
	contentId?: string;
	"data-testid"?: string;
}

export interface ShellHeaderProps extends React.HTMLAttributes<HTMLElement> {
	children?: React.ReactNode;
	className?: string;
	elevation?: SurfaceElevationLevel;
}

export interface ShellContentProps extends React.HTMLAttributes<HTMLElement> {
	children?: React.ReactNode;
	className?: string;
	id?: string;
}

export interface ShellFooterProps extends React.HTMLAttributes<HTMLElement> {
	children?: React.ReactNode;
	className?: string;
	elevation?: SurfaceElevationLevel;
}

export interface ShellSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
	level?: SurfaceElevationLevel;
	tone?: "paper" | "paper-strong" | "paper-soft";
	borderStyle?: "none" | "subtle" | "accent";
	children?: React.ReactNode;
	className?: string;
}

interface ShellContextValue {
	isGridShell: boolean;
	hasSidebar: boolean;
}

const ShellContext = createContext<ShellContextValue>({
	isGridShell: true,
	hasSidebar: false,
});

export function useShellContext(): ShellContextValue {
	return useContext(ShellContext);
}

/**
 * ShellHeader — Top navigation and action bar track (Row 1: auto)
 */
export const ShellHeader = forwardRef<HTMLElement, ShellHeaderProps>(
	function ShellHeader(
		{ children, className = "", elevation = "raised", ...props },
		ref,
	) {
		const elevationClass = `surface-${elevation}`;
		return (
			<header
				ref={ref}
				className={`webkit-shell-header ${elevationClass} ${className}`.trim()}
				{...props}
			>
				{children}
			</header>
		);
	},
);

/**
 * ShellContent — Independent isolated scroll track (Row 2: 1fr, min-h-0 overflow-y-auto)
 */
export const ShellContent = forwardRef<HTMLElement, ShellContentProps>(
	function ShellContent(
		{ children, className = "", id = "shell-content", ...props },
		ref,
	) {
		return (
			<main
				ref={ref}
				id={id}
				tabIndex={-1}
				className={`webkit-shell-content ${className}`.trim()}
				{...props}
			>
				{children}
			</main>
		);
	},
);

/**
 * ShellFooter — Bottom navigation and status bar track (Row 3: auto)
 */
export const ShellFooter = forwardRef<HTMLElement, ShellFooterProps>(
	function ShellFooter(
		{ children, className = "", elevation = "base", ...props },
		ref,
	) {
		const elevationClass = `surface-${elevation}`;
		return (
			<footer
				ref={ref}
				className={`webkit-shell-footer ${elevationClass} ${className}`.trim()}
				{...props}
			>
				{children}
			</footer>
		);
	},
);

/**
 * ShellSurface — Container with tonal depth replacing multi-layered border matryoshkas
 */
export const ShellSurface = forwardRef<HTMLDivElement, ShellSurfaceProps>(
	function ShellSurface(
		{
			children,
			level = "base",
			tone,
			borderStyle = "subtle",
			className = "",
			...props
		},
		ref,
	) {
		const levelClass = `surface-${level}`;
		const toneClass = tone ? `tone-${tone}` : "";
		const borderClass = `border-${borderStyle}`;

		return (
			<div
				ref={ref}
				className={`shell-surface ${levelClass} ${toneClass} ${borderClass} ${className}`.trim()}
				{...props}
			>
				{children}
			</div>
		);
	},
);

/**
 * WebKitGridShell (Shell) — Canonical 3-Tier CSS Grid Viewport Shell
 * Implements Section VI of Constitution:
 * - 3-part CSS Grid: grid-template-rows: auto 1fr auto with height: 100dvh
 * - Scroll track isolation: overflow-y-auto min-h-0
 * - Surface elevation and zero calc chains
 */
export const Shell = forwardRef<HTMLDivElement, ShellProps>(
	function Shell(
		{
			children,
			header,
			footer,
			sidebar,
			className = "",
			contentClassName = "",
			contentId = "shell-content",
			"data-testid": testId = "webkit-grid-shell",
			...props
		},
		ref,
	) {
		const hasSidebar = Boolean(sidebar);

		return (
			<ShellContext.Provider value={{ isGridShell: true, hasSidebar }}>
				<div
					ref={ref}
					className={`webkit-grid-shell ${hasSidebar ? "with-sidebar" : ""} ${className}`.trim()}
					data-testid={testId}
					{...props}
				>
					{sidebar ? (
						<aside className="webkit-shell-sidebar">{sidebar}</aside>
					) : null}
					<div className="webkit-shell-main-track">
						{header ? (
							typeof header === "string" ? (
								<ShellHeader>{header}</ShellHeader>
							) : (
								header
							)
						) : null}
						<ShellContent id={contentId} className={contentClassName}>
							{children}
						</ShellContent>
						{footer ? (
							typeof footer === "string" ? (
								<ShellFooter>{footer}</ShellFooter>
							) : (
								footer
							)
						) : null}
					</div>
				</div>
			</ShellContext.Provider>
		);
	},
);

export default Shell;
