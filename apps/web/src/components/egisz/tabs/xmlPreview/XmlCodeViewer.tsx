/**
 * XmlCodeViewer.tsx — Code block viewer for canonicalized C14N XML
 */

import React from "react";

export interface XmlCodeViewerProps {
	readonly generatedXml: string;
}

export const XmlCodeViewer: React.FC<XmlCodeViewerProps> = ({ generatedXml }) => {
	return (
		<pre
			style={{
				margin: 0,
				padding: "1rem",
				borderRadius: "8px",
				background: "var(--paper-strong)",
				border: "1px solid var(--line)",
				fontFamily: "monospace",
				fontSize: "0.75rem",
				lineHeight: 1.4,
				maxHeight: "380px",
				overflow: "auto",
				whiteSpace: "pre-wrap",
				wordBreak: "break-all",
			}}
		>
			{generatedXml}
		</pre>
	);
};
