import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initialsOf } from '../lib/format';
import {
  IconBell,
  IconBoxes,
  IconCart,
  IconChart,
  IconDashboard,
  IconLogout,
  IconMenu,
  IconPill,
  IconReceipt,
  IconShield,
  IconUsers,
} from './Icons';

interface NavEntry {
  to: string;
  label: string;
  icon: typeof IconDashboard;
  adminOnly?: boolean;
  end?: boolean;
}

const NAV: NavEntry[] = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/medicines', label: 'Medicines', icon: IconPill },
  { to: '/inventory', label: 'Inventory', icon: IconBoxes },
  { to: '/invoices', label: 'Invoices', icon: IconReceipt },
  { to: '/sales', label: 'Sales', icon: IconCart },
  { to: '/alerts', label: 'Alerts', icon: IconBell },
  { to: '/reports', label: 'Reports', icon: IconChart },
  { to: '/users', label: 'Users', icon: IconUsers, adminOnly: true },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const visibleNav = NAV.filter((entry) => !entry.adminOnly || isAdmin);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
          <IconPill className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-base leading-tight">MediTrack</p>
          <p className="text-[11px] text-blue-200 leading-tight">Pharmacy Inventory</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initialsOf(user?.fullName || user?.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white font-medium truncate">{user?.fullName ?? '—'}</p>
            <p className="text-[11px] text-blue-200 truncate">{user?.role ?? ''}</p>
          </div>
        </div>
        <button type="button" className="nav-item w-full mt-1" onClick={handleLogout}>
          <IconLogout className="w-[18px] h-[18px] shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 sidebar-bg shadow-sidebar z-30">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 h-full sidebar-bg shadow-sidebar">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            className="btn-ghost lg:hidden !p-2"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <IconMenu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">
              {visibleNav.find((entry) =>
                entry.end ? location.pathname === entry.to : location.pathname.startsWith(entry.to)
              )?.label ?? 'MediTrack'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <span className="badge-blue gap-1">
                <IconShield className="w-3 h-3" />
                Admin
              </span>
            )}
            <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-[10rem]">
              {user?.username}
            </span>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}