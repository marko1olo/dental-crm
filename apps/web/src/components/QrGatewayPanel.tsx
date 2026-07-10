import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X, Calendar, User, Tablet } from "lucide-react";
import { useThemeStore } from "../store/themeStore";

export function QrGatewayPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { themeMode } = useThemeStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reactively track actual dark state any time themeMode changes or panel opens
  useEffect(() => {
    function detectTheme() {
      const bodyTheme = document.body.getAttribute("data-theme");
      const htmlDark = document.documentElement.classList.contains("dark");
      setIsDark(bodyTheme === "dark" || htmlDark);
    }
    detectTheme();
    // Also watch for mutations on body's data-theme
    const obs = new MutationObserver(detectTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [themeMode, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Mock URLs for MVP
  const bookingUrl = "https://dente.clinic/booking?clinicId=demo";
  const loginUrl = "https://dente.clinic/portal/login?token=temp_token_8xJ2";
  
  const localIp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '192.168.1.15'
    : window.location.hostname;
  const portSuffix = window.location.port ? `:${window.location.port}` : '';
  const tabletUrl = `http://${localIp}${portSuffix}`;

  // Inline CSS variables so this panel is 100% independent of Tailwind dark: class timing
  const panelBg = isDark
    ? "rgba(15, 23, 42, 0.92)"    // slate-900 95%
    : "rgba(255, 255, 255, 0.90)";
  const panelBorder = isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)";
  const panelText = isDark ? "#f1f5f9" : "#1e293b";
  const panelSubtext = isDark ? "#94a3b8" : "#64748b";
  const panelDivider = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const rowBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const rowBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const btnHoverBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "20px",
          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          transition: "all 0.15s ease",
          color: isDark ? "#94a3b8" : "#475569",
        }}
        title="QR-Доступ"
        aria-label="QR-Доступ"
        onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.09)")}
        onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)")}
      >
        <QrCode style={{ width: 18, height: 18, color: isOpen ? "#14b8a6" : "inherit" }} />
      </button>

      {isOpen && isMobile && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDark ? "rgba(0, 0, 0, 0.65)" : "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 998,
          }}
        />
      )}

      {isOpen && (
        <div style={{
          position: isMobile ? "fixed" : "absolute",
          right: isMobile ? "auto" : 0,
          left: isMobile ? "50%" : "auto",
          top: isMobile ? "50%" : "48px",
          transform: isMobile ? "translate(-50%, -50%)" : "none",
          width: isMobile ? "92%" : "300px",
          maxWidth: isMobile ? "340px" : "none",
          zIndex: 999,
          animation: isMobile ? "zoomIn 0.2s ease" : "fadeInDown 0.18s ease",
        }}>
          <div style={{
            borderRadius: "16px",
            overflow: "hidden",
            border: panelBorder,
            boxShadow: isDark
              ? "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)"
              : "0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
            background: panelBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px 12px",
              borderBottom: `1px solid ${panelDivider}`,
            }}>
              <span style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: 600,
                fontSize: "15px",
                color: panelText,
              }}>
                <QrCode style={{ width: 16, height: 16, color: "#14b8a6" }} />
                QR Доступ
              </span>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: "4px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: panelSubtext,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = btnHoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>

            {/* QR 1: Booking */}
            <div style={{
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              background: rowBg,
              borderBottom: `1px solid ${rowBorder}`,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "100%",
                fontSize: "13px",
                fontWeight: 600,
                color: panelText,
              }}>
                <Calendar style={{ width: 14, height: 14, color: "#10b981" }} />
                Онлайн-Запись
              </div>
              {/* Always white background for QR — required for scanner contrast */}
              <div style={{
                padding: "10px",
                background: "#ffffff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                border: isDark ? "2px solid rgba(255,255,255,0.15)" : "2px solid rgba(0,0,0,0.05)",
                transition: "transform 0.15s",
              }}>
                <QRCodeSVG
                  value={bookingUrl}
                  size={130}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="Q"
                />
              </div>
              <p style={{ fontSize: "11px", color: panelSubtext, textAlign: "center", margin: 0 }}>
                Пациент сканирует для записи на прием.
              </p>
            </div>

            {/* QR 2: Patient Portal */}
            <div style={{
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              borderBottom: `1px solid ${rowBorder}`,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "100%",
                fontSize: "13px",
                fontWeight: 600,
                color: panelText,
              }}>
                <User style={{ width: 14, height: 14, color: "#a855f7" }} />
                Личный Кабинет
              </div>
              <div style={{
                padding: "10px",
                background: "#ffffff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                border: isDark ? "2px solid rgba(255,255,255,0.15)" : "2px solid rgba(0,0,0,0.05)",
              }}>
                <QRCodeSVG
                  value={loginUrl}
                  size={130}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="Q"
                />
              </div>
              <p style={{ fontSize: "11px", color: panelSubtext, textAlign: "center", margin: 0 }}>
                Мгновенный доступ пациента к документам.
              </p>
            </div>

            {/* QR 3: Tablet Access */}
            <div style={{
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "100%",
                fontSize: "13px",
                fontWeight: 600,
                color: panelText,
              }}>
                <Tablet style={{ width: 14, height: 14, color: "#14b8a6" }} />
                Доступ с iPad / Планшета
              </div>
              <div style={{
                padding: "10px",
                background: "#ffffff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                border: isDark ? "2px solid rgba(255,255,255,0.15)" : "2px solid rgba(0,0,0,0.05)",
              }}>
                <QRCodeSVG
                  value={tabletUrl}
                  size={130}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="Q"
                />
              </div>
              <p style={{ fontSize: "11px", color: panelSubtext, textAlign: "center", margin: 0 }}>
                Врач сканирует для работы с планшета.
              </p>
              <code style={{ fontSize: "10px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: "4px", color: "#14b8a6" }}>
                {tabletUrl}
              </code>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
