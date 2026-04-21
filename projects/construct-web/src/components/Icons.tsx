import type { SVGProps } from 'react';

interface IcoProps extends SVGProps<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
}

const Ico = ({ size = 24, strokeWidth = 2, children, ...rest }: IcoProps) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const Icons = {
  Folder:    (p: IcoProps) => <Ico {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></Ico>,
  Mic:       (p: IcoProps) => <Ico {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></Ico>,
  Doc:       (p: IcoProps) => <Ico {...p}><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M9 13h7"/><path d="M9 17h5"/></Ico>,
  Search:    (p: IcoProps) => <Ico {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Ico>,
  Filter:    (p: IcoProps) => <Ico {...p}><path d="M4 5h16M7 12h10M10 19h4"/></Ico>,
  Plus:      (p: IcoProps) => <Ico {...p}><path d="M12 5v14M5 12h14"/></Ico>,
  ChevRight: (p: IcoProps) => <Ico {...p}><path d="m9 6 6 6-6 6"/></Ico>,
  ChevLeft:  (p: IcoProps) => <Ico {...p}><path d="m15 6-6 6 6 6"/></Ico>,
  ChevDown:  (p: IcoProps) => <Ico {...p}><path d="m6 9 6 6 6-6"/></Ico>,
  MapPin:    (p: IcoProps) => <Ico {...p}><path d="M12 22s-7-7.58-7-12a7 7 0 1 1 14 0c0 4.42-7 12-7 12Z"/><circle cx="12" cy="10" r="2.5"/></Ico>,
  Calendar:  (p: IcoProps) => <Ico {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></Ico>,
  Clock:     (p: IcoProps) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ico>,
  Dots:      (p: IcoProps) => <Ico {...p}><circle cx="5"  cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></Ico>,
  Check:     (p: IcoProps) => <Ico {...p}><path d="m5 12 5 5L20 6"/></Ico>,
  X:         (p: IcoProps) => <Ico {...p}><path d="M6 6l12 12M18 6 6 18"/></Ico>,
  Camera:    (p: IcoProps) => <Ico {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></Ico>,
  User:      (p: IcoProps) => <Ico {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Ico>,
  Users:     (p: IcoProps) => <Ico {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 20a7 7 0 0 0-5-6.7"/></Ico>,
  Hardhat:   (p: IcoProps) => <Ico {...p}><path d="M3 18h18v2H3z"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M9 11V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></Ico>,
  Wave:      (p: IcoProps) => <Ico {...p}><path d="M3 12c3 0 3-6 6-6s3 12 6 12 3-6 6-6"/></Ico>,
  Stop:      (p: IcoProps) => <Ico {...p}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/></Ico>,
  Pause:     (p: IcoProps) => <Ico {...p} stroke="none"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></Ico>,
  Play:      (p: IcoProps) => <Ico {...p} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></Ico>,
  Trash:     (p: IcoProps) => <Ico {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></Ico>,
  Alert:     (p: IcoProps) => <Ico {...p}><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v5M12 18v.5"/></Ico>,
  Download:  (p: IcoProps) => <Ico {...p}><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 19h16"/></Ico>,
  Send:      (p: IcoProps) => <Ico {...p}><path d="m3 11 18-8-8 18-2-8-8-2Z"/></Ico>,
  Sun:       (p: IcoProps) => <Ico {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Ico>,
  Cloud:     (p: IcoProps) => <Ico {...p}><path d="M6 19a4 4 0 0 1-.9-7.9 6 6 0 0 1 11.8.4A4 4 0 0 1 17 19z"/></Ico>,
  Edit:      (p: IcoProps) => <Ico {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></Ico>,
  Upload:    (p: IcoProps) => <Ico {...p}><path d="M12 21V9m0 0 5 5m-5-5-5 5M4 5h16"/></Ico>,
  Bell:      (p: IcoProps) => <Ico {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></Ico>,
  Mail:      (p: IcoProps) => <Ico {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></Ico>,
  Truck:     (p: IcoProps) => <Ico {...p}><rect x="1" y="7" width="13" height="9" rx="1"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/></Ico>,
  Box:       (p: IcoProps) => <Ico {...p}><path d="M12 3 3 7.5v9L12 21l9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5"/><path d="M12 12v9"/></Ico>,
  Shield:    (p: IcoProps) => <Ico {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></Ico>,
  Zap:       (p: IcoProps) => <Ico {...p}><path d="M13 3 4 14h7l-1 7 9-11h-7z"/></Ico>,
  Drop:      (p: IcoProps) => <Ico {...p}><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></Ico>,
  Hammer:    (p: IcoProps) => <Ico {...p}><path d="M14 4l6 6-3 3-6-6z"/><path d="M11 7 3 15l3 3 8-8"/></Ico>,
  Pdf:       (p: IcoProps) => <Ico {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 14h1.5a1.5 1.5 0 0 1 0 3H9v-5m0 5v0"/><path d="M14 14v5m0-5h2m-2 2.5h1.5"/></Ico>,
  Grid:      (p: IcoProps) => <Ico {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Ico>,
  Msg:       (p: IcoProps) => <Ico {...p}><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"/></Ico>,
  SmsSq:     (p: IcoProps) => <Ico {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></Ico>,
  Link:      (p: IcoProps) => <Ico {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></Ico>,
  Pin:       (p: IcoProps) => <Ico {...p}><path d="M12 22s-7-7.58-7-12a7 7 0 1 1 14 0c0 4.42-7 12-7 12Z"/><circle cx="12" cy="10" r="2.5"/></Ico>,
  More:      (p: IcoProps) => <Ico {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></Ico>,
};
