import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
