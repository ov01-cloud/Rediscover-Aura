"use client";

export default function Error({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  console.error(error);

  return (
    <main className="grid min-h-screen place-items-center bg-aura-canvas px-6">
      <section className="max-w-md rounded-2xl border border-aura-border bg-white p-6 text-center">
        <h2 className="text-xl font-semibold text-aura-text">Something went wrong</h2>
        <p className="mt-2 text-sm text-aura-muted">Please try again. If this keeps happening, refresh the page.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-aura-text px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
