import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Building2,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Sparkles,
  Settings,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Cloud,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { GoogleSheetsConfig, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from '../types';
import { ThemeMode } from '../utils/theme';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertasActivasCount: number;
  facturasCount: number;
  sheetsConfig: GoogleSheetsConfig;
  onOpenConfig: () => void;
  onOpenChat: () => void;
  isChatOpen: boolean;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  datosNegocio?: DatosNegocio;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  alertasActivasCount,
  facturasCount,
  sheetsConfig,
  onOpenConfig,
  onOpenChat,
  isChatOpen,
  theme = 'dark',
  onToggleTheme,
  datosNegocio,
}) => {
  const nombreNegocio = datosNegocio?.nombre || DEFAULT_DATOS_NEGOCIO.nombre;
  const menuItems = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'facturas', label: 'Facturas', icon: FileText, badge: facturasCount },
    { id: 'proveedores', label: 'Proveedores', icon: Building2 },
    { id: 'precios', label: 'Evolución Precios', icon: TrendingUp },
    { id: 'alertas', label: 'Alertas', icon: AlertTriangle, badge: alertasActivasCount, badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
    { id: 'iva', label: 'IVA', icon: Receipt },
    { id: 'analisis-ia', label: 'Análisis IA', icon: Sparkles, highlight: true },
  ];

  return (
    <aside className="w-64 bg-[#0d131f] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none z-20 h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-900/30">
              <span className="tracking-tighter text-lg font-black">FA</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-wide leading-tight">
                FINANCE AI
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold text-rose-400 tracking-wider truncate max-w-[140px]" title={nombreNegocio}>
                  {nombreNegocio}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 leading-snug">
            Control financiero y auditoría de facturas con IA
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Gestión Financiera
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-rose-400'
                        : item.highlight
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* AI Assistant Chat Trigger */}
        <div className="px-3 pt-2">
          <button
            id="sidebar-btn-chat"
            onClick={onOpenChat}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              isChatOpen
                ? 'bg-slate-800/90 border-indigo-500/40 text-indigo-200 shadow-md shadow-indigo-950/50'
                : 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300 hover:bg-indigo-950/40 hover:border-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div className="text-left min-w-0">
                <div className="font-bold text-indigo-200 truncate">Pregunta a tus facturas</div>
                <div className="text-[10px] text-indigo-400/80 font-normal truncate">Chat directo con Gemini</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* Bottom Status & Settings */}
      <div id="sidebar-footer" className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        {/* Google Sheets Sync Indicator */}
        <div
          id="sidebar-sheets-card"
          onClick={onOpenConfig}
          className="cursor-pointer p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-medium text-slate-300">
                Google Sheets
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                sheetsConfig.status === 'sincronizado'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {sheetsConfig.status === 'sincronizado' ? 'Conectado' : 'Modo Local'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
            <span>Pestaña: &quot;Facturas&quot;</span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5 text-slate-400" />
              {sheetsConfig.lastSync || 'Auto'}
            </span>
          </div>
        </div>

        {/* Configuration Button */}
        <button
          id="sidebar-btn-config"
          onClick={onOpenConfig}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Configuración</span>
          </div>
          <span className="text-[10px] text-slate-300">ID / Conexión</span>
        </button>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            id="sidebar-btn-theme"
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium capitalize">
              {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </span>
          </button>
        )}

        {/* Disclaimer Notice */}
        <div className="px-2 pt-1">
          <p className="text-[9px] text-slate-400 leading-tight">
            *Resumen orientativo de gestión. No sustituye la labor de un asesor fiscal colegiado.
          </p>
        </div>
      </div>
    </aside>
  );
};
