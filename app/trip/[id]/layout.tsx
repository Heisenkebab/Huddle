import { TripProvider } from "@/lib/trip-context";
import Sidebar from "@/components/Sidebar";
import TabBar from "@/components/TabBar";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <TripProvider tripId={id}>
      <div className="min-h-dvh bg-background lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-[480px] px-4 pt-5 pb-[calc(180px+env(safe-area-inset-bottom))] lg:max-w-[920px] lg:px-10 lg:pt-10 lg:pb-16">
            {children}
          </main>
        </div>
        <TabBar />
      </div>
    </TripProvider>
  );
}
