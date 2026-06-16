import { ProtectedHeader } from "@/components/layout/protected-header";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <ProtectedHeader />
      <div className="flex-1 w-full mx-auto">{children}</div>
    </main>
  );
}
