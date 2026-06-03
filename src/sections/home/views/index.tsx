export function Home() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Protected route</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Home</h1>
      </div>
      <div className="rounded-xl border bg-background p-6 shadow-sm">
        <h2 className="text-lg font-medium">You are signed in.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This protected home route is ready to become the social feed entry
          point for the web app.
        </p>
      </div>
    </div>
  );
}
