import { AppSidebar } from "../../components/AppSidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-shell">
      <div className="app-shell__nav">
        <AppSidebar />
      </div>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
