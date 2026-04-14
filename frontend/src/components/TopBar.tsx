import { Bell, User } from 'lucide-react';

export default function TopBar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white border-b border-outline-variant flex items-center px-8 h-16">
      <div className="text-sm font-bold tracking-tight text-primary font-headline uppercase">
        MULTIVAC Error Knowledge Management
      </div>
      <div className="ml-auto flex items-center gap-6">
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="h-10 w-10 rounded-lg bg-surface-container-low flex items-center justify-center cursor-pointer hover:bg-surface-container-high transition-colors">
          <User className="w-5 h-5 text-primary" />
        </div>
      </div>
    </nav>
  );
}
