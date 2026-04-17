import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Search,
  Moon,
  Sun
} from 'lucide-react';
import { Badge } from './Badge';
import { cn } from '../ui/utils';

interface TopNavbarProps {
  onMenuClick: () => void;
}

const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload',
  '/dataflow': 'Security Visualizer',
  '/attack': 'Attack Simulation',
  '/ai': 'AI Analysis',
  '/logs': 'Activity Logs',
  '/settings': 'Settings',
};

export function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount] = useState(3);
  const profileRef = useRef<HTMLDivElement>(null);

  const currentPageName = routeNames[location.pathname] || 'Dashboard';

  // Get breadcrumbs
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = paths.map((path, index) => {
      const fullPath = '/' + paths.slice(0, index + 1).join('/');
      return {
        name: routeNames[fullPath] || path.charAt(0).toUpperCase() + path.slice(1),
        path: fullPath,
      };
    });
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // In a real app, this would clear auth tokens, etc.
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-[#111827] border-b border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Menu + Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-[#E5E7EB]" />
          </button>

          {/* Page Title (Mobile) */}
          <h1 className="text-lg font-bold text-[#E5E7EB] lg:hidden">
            {currentPageName}
          </h1>

          {/* Breadcrumbs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-2">
            {breadcrumbs.length === 0 ? (
              <span className="text-lg font-bold text-[#E5E7EB]">Dashboard</span>
            ) : (
              <>
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center gap-2">
                    {index > 0 && (
                      <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                    )}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-lg font-bold text-[#E5E7EB]">
                        {crumb.name}
                      </span>
                    ) : (
                      <button
                        onClick={() => navigate(crumb.path)}
                        className="text-sm text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
                      >
                        {crumb.name}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </nav>
        </div>

        {/* Right: Search + Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Search (Desktop) */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
            <Search className="w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm text-[#E5E7EB] placeholder-[#6B7280] w-40 lg:w-60"
            />
            <kbd className="hidden lg:inline-flex px-2 py-0.5 text-xs text-[#9CA3AF] bg-white/10 rounded border border-white/10">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-[#E5E7EB]" />
            {notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] rounded-full text-[10px] text-white flex items-center justify-center font-bold"
              >
                {notificationCount}
              </motion.span>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-[#E5E7EB]">Admin User</p>
                <p className="text-xs text-[#9CA3AF]">admin@cdsv.io</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-64 bg-[#1F2937] rounded-xl border border-white/10 shadow-xl overflow-hidden"
                >
                  {/* User Info */}
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#E5E7EB]">Admin User</p>
                        <p className="text-xs text-[#9CA3AF]">admin@cdsv.io</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Badge variant="secure" className="text-xs">
                        Administrator
                      </Badge>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-[#9CA3AF]" />
                      <span className="text-sm text-[#E5E7EB]">Settings</span>
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#EF4444]/10 transition-colors text-left mt-1"
                    >
                      <LogOut className="w-4 h-4 text-[#EF4444]" />
                      <span className="text-sm text-[#EF4444]">Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
