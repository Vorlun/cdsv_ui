import { 
  LayoutDashboard, 
  Database, 
  Shield, 
  Activity, 
  FileText, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../ui/utils';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: string;
}

function SidebarItem({ icon: Icon, label, active, badge }: SidebarItemProps) {
  return (
    <a
      href="#"
      className={cn(
        'flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200',
        active 
          ? 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20' 
          : 'text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#E5E7EB]'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge && (
        <span className="px-2 py-0.5 bg-[#EF4444] text-white text-xs rounded-md">
          {badge}
        </span>
      )}
    </a>
  );
}

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#0B0F1A] border-r border-white/10 p-4 flex flex-col gap-2">
      <div className="mb-4">
        <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider px-4 mb-2">
          Main Menu
        </p>
      </div>
      
      <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
      <SidebarItem icon={Database} label="Data Sources" />
      <SidebarItem icon={Shield} label="Security" badge="3" />
      <SidebarItem icon={Activity} label="Monitoring" />
      <SidebarItem icon={FileText} label="Reports" />
      
      <div className="mt-6 mb-2">
        <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider px-4">
          System
        </p>
      </div>
      
      <SidebarItem icon={Settings} label="Settings" />
    </aside>
  );
}
