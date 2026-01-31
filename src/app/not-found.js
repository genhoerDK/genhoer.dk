export const metadata = {
  title: "404",
  description: "Siden blev ikke fundet.",
  robots: { index: false, follow: false, },
};

export default function NotFound() {
  return (
    <main className="min-h-svh flex items-center justify-center px-2 md:px-4 bg-zinc-50">
      <div className="w-full max-w-lg">
        <p className="text-sm text-zinc-500">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Siden blev ikke fundet
        </h1>
      </div>
    </main>
  );
}