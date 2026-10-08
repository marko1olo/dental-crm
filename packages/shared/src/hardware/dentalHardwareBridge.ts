/**
 * @dental/shared/hardware — Universal Multi-Vendor Dental Hardware & Imaging Ecosystem Bridge.
 *
 * Canonical Facade re-exporting all 34 public APIs decomposed into modular layers under ./dentalHardware/.
 *
 * Implements native integration standards for all 5 equipment families in Russian & CIS dental practices:
 * A. Radiovisiographs (RVG) & software: Vatech, Sirona, Planmeca, Carestream, KaVo, Woodpecker, Eighteeth, Owandy, Xpect Vision, Handy, Trident.
 * B. CBCT 3D & OPG: Vatech PaX/Green, KaVo OP3D/OnDemand3D, Sirona Orthophos/Galileos, Planmeca ProMax, Carestream CS 8100/9600, NewTom/MyRay, Morita, PointNix, Genoray.
 * C. 3D Intraoral Scanners: Medit (Medit Link), 3Shape (TRIOS), Shining 3D (Aoralscan), Panda Scanner, Alliedstar, Runyes (QuickScan), Carestream CS 3600/3700.
 * D. MFPs & Document Scanners: Kyocera, HP, Canon, Xerox, Brother, Pantum, Fujitsu/Avision (SMB/FTP + TWAIN/WIA).
 * E. Clinical Photo Protocol: Canon, Nikon, Sony SD-card & tethering auto-import with standard 12-shot intraoral & portrait layout.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8s (Anti-bloat), 8n (Solo Doctor Sovereignty).
 */

export * from "./dentalHardware/index.js";
