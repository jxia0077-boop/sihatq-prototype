import Link from "next/link";

type AppHeaderProps = {
  title?: string;
  backHref?: string;
  showAccount?: boolean;
};

export function AppHeader({
  title = "SihatQ",
  backHref,
  showAccount = true,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 mx-auto flex w-full max-w-7xl items-center justify-between bg-surface px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Go back"
            className="rounded-full p-2 transition-colors hover:bg-secondary-container/50"
          >
            <span className="material-symbols-outlined text-primary">
              arrow_back
            </span>
          </Link>
        ) : null}
        <Link href="/dashboard" className="font-headline text-xl font-bold text-primary">
          {title}
        </Link>
      </div>
      {showAccount ? (
        <span className="material-symbols-outlined text-primary">
          account_circle
        </span>
      ) : null}
    </header>
  );
}
