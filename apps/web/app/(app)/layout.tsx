import { AppSidebar } from '@/components/layout/AppSidebar';
import { GlobalShortcuts } from '@/components/shared/GlobalShortcuts';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
      <GlobalShortcuts />
    </div>
  );
}
