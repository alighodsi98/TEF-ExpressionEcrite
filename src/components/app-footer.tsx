"use client";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* TEF Canada icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 30 36"
            className="h-7 w-auto"
            aria-label="TEF Canada"
          >
            <defs>
              <style>{`.tef{font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;fill:#FFF;text-anchor:middle;letter-spacing:1.5px}`}</style>
            </defs>
            <rect width="30" height="36" rx="4" fill="#FFF" stroke="#CCC" strokeWidth="0.3" />
            <rect x="0" y="0" width="7.5" height="27" fill="#FF0000" />
            <rect x="22.5" y="0" width="7.5" height="27" fill="#FF0000" />
            <g transform="translate(15,13.5) scale(0.0034)">
              <path fill="#FF0000" d="m-90 2030 45-863a95 95 0 0 0-111-98l-859 151 116-320a65 65 0 0 0-20-73l-941-762 212-99a65 65 0 0 0 34-79l-186-572 542 115a65 65 0 0 0 73-38l105-247 423 454a65 65 0 0 0 111-57l-204-1052 327 189a65 65 0 0 0 91-27l332-652 332 652a65 65 0 0 0 91 27l327-189-204 1052a65 65 0 0 0 111 57l423-454 105 247a65 65 0 0 0 73 38l542-115-186 572a65 65 0 0 0 34 79l212 99-941 762a65 65 0 0 0-20 73l116 320-859-151a95 95 0 0 0-111 98l45 863z" />
            </g>
            <rect x="0" y="27" width="30" height="9" fill="#FF0000" rx="0" />
            <text className="tef" x="15" y="33.8">TEF</text>
          </svg>

          <p className="text-[11px] text-muted-foreground/60">
            Environnement d&apos;entraînement intelligent pour l&apos;écriture{" "}
            <span className="font-medium text-muted-foreground/80">TEF Canada</span>
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
            <span className="inline-block h-1 w-1 rounded-full bg-primary/40" />
            Conçu par Ali Ghodsi pour une progression graduelle
          </p>
        </div>
      </div>
    </footer>
  );
}
