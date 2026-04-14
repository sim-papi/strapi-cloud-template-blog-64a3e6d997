import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface">
      <TopBar />
      <Sidebar />
      <main className="ml-64 mt-16 p-12">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <footer className="ml-64 bg-white border-t border-outline-variant px-12 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © 2024 MULTIVAC GROUP. PRECISION ENGINEERING DIVISION.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] text-on-surface-variant hover:text-secondary transition-all uppercase tracking-widest font-bold">PRIVACY POLICY</a>
            <a href="#" className="text-[10px] text-on-surface-variant hover:text-secondary transition-all uppercase tracking-widest font-bold">TECHNICAL SUPPORT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
