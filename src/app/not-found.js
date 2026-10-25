export const metadata = {
  title: "404",
  description: "Siden blev ikke fundet.",
  robots: { index: false, follow: false, },
};

export default function NotFound() {
  return (
    <div className="min-h-svh flex items-center justify-center px-gutter bg-paper">
      <div className="w-full max-w-lg">
        <p className="text-sm text-hard">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Siden blev ikke fundet</h1>
      </div>
    </div>
  );
}
