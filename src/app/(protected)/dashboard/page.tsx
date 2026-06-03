export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Protected route</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Dashboard
        </h1>
      </div>
      <div className="rounded-xl border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-medium">You are signed in.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This page is guarded on the server and will redirect unauthenticated
          visitors to the login screen.
        </p>
      </div>
    </div>
  );
}
