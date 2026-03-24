import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background shrink-0">
            <div className="flex items-center">
              <SidebarTrigger className="text-foreground" />
              <h1 className="mr-4 text-lg font-bold text-foreground">DevHub</h1>
            </div>
            <NotificationsBell />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
