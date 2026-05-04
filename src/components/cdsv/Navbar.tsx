import { Shield, Bell, Search, User } from 'lucide-react';
import { Button } from './Button';

export function Navbar() {
  return (
    <nav className="h-16 bg-[#0B0F1A] border-b border-white/10 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#3B82F6]" />
          <span className="text-xl font-bold text-[#E5E7EB]">CDSV</span>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm text-[#E5E7EB] hover:text-[#3B82F6] transition-colors">
            Dashboard
          </a>
          <a href="#" className="text-sm text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors">
            Analytics
          </a>
          <a href="#" className="text-sm text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors">
            Reports
          </a>
          <a href="#" className="text-sm text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors">
            Settings
          </a>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center bg-[#111827] border border-white/10 rounded-xl px-4 py-2 gap-2 w-64">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-[#E5E7EB] placeholder:text-[#9CA3AF] w-full"
          />
        </div>
        
        <button className="p-2 hover:bg-[#1F2937] rounded-xl transition-colors relative">
          <Bell className="w-5 h-5 text-[#9CA3AF]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full"></span>
        </button>
        
        <button className="p-2 hover:bg-[#1F2937] rounded-xl transition-colors">
          <User className="w-5 h-5 text-[#9CA3AF]" />
        </button>
      </div>
    </nav>
  );
}
