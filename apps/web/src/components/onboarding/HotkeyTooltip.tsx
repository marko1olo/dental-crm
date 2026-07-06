import { useState, ReactNode } from "react";

export function HotkeyTooltip({ 
  children, 
  hotkey, 
  description 
}: { 
  children: ReactNode; 
  hotkey: string; 
  description: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="hotkey-tooltip-wrapper"
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%) translateY(-8px)",
          background: "rgba(15, 23, 42, 0.95)", // dark slate background
          border: "1px solid rgba(20, 184, 166, 0.4)", // teal border
          padding: "8px 12px",
          borderRadius: "6px",
          color: "#e2e8f0",
          fontSize: "13px",
          whiteSpace: "nowrap",
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backdropFilter: "blur(4px)"
        }}>
          {hotkey && (
            <kbd style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "4px",
              padding: "2px 6px",
              color: "#14b8a6",
              fontFamily: "monospace",
              fontSize: "12px",
              fontWeight: 600
            }}>
              {hotkey}
            </kbd>
          )}
          <span>{description}</span>
        </div>
      )}
    </div>
  );
}
