import { Suspense } from "react";
import { UploadPanel } from "../../../components/UploadPanel";
import { Spinner } from "../../../components/lp";
import { requireUser } from "../../../lib/supabase/require-user";

async function Gate({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}

export default function UploadPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Upload</h1>
      </header>
      <p className="page-intro">Scan a synthetic CSV or TXT file for emails, UK phone numbers, National Insurance numbers and payment cards.</p>
      <Suspense fallback={<Spinner label="Loading…" />}>
        <Gate>
          <UploadPanel />
        </Gate>
      </Suspense>
    </>
  );
}
