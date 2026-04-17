import { useState } from 'react';
import { NavLink } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Upload,
  Network,
  Skull,
  Brain,
  ScrollText,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Shield
} from 'lucide-react';
import { cn } from '../ui/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload', path: '/upload', icon: Upload },
  { name: 'Security Visualizer', path: '/dataflow', icon: Network },
  { name: 'Attack Simulation', path: '/attack', icon: Skull },
  { name: 'AI Analysis', path: '/ai', icon: Brain },
  { name: 'Activity Logs', path: '/logs', icon: ScrollText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static left-0 top-0 h-full bg-[#111827] border-r border-white/10 z-50 flex-col transition-all duration-300',
          'hidden lg:flex',
          isOpen && 'flex'
        )}
        style={{
          width: isCollapsed ? '80px' : '280px',
        }}
      >
        {/* Logo & Collapse Button */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
                <Shield className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#E5E7EB]">CDSV</h1>
                <p className="text-xs text-[#9CA3AF]">Security Platform</p>
              </div>
            </motion.div>
          )}
          
          {isCollapsed && (
            <div className="p-2 bg-[#3B82F6]/10 rounded-lg mx-auto">
              <Shield className="w-6 h-6 text-[#3B82F6]" />
            </div>
          )}

          {/* Close button (mobile) */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#9CA3AF]" />
          </button>

          {/* Collapse button (desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft
              className={cn(
                'w-5 h-5 text-[#9CA3AF] transition-transform',
                isCollapsed && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => {
                    // Close mobile menu on navigation
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group',
                      isActive
                        ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                        : 'text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="active-nav"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#3B82F6] rounded-r"
                          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        />
                      )}

                      <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-[#3B82F6]')} />
                      
                      {!isCollapsed && (
                        <span className="text-sm font-medium">{item.name}</span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-3 py-2 bg-[#1F2937] text-[#E5E7EB] text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/10">
                          {item.name}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          {!isCollapsed ? (
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-[#9CA3AF] mb-2">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-sm text-[#E5E7EB] font-medium">All Systems Operational</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}