import Link from "next/link";
import { headers } from "next/headers";
import ArchivedList from "./ArchivedList";

async function getArchivedApplications() {
  const h = await headers();
  const host = h.get("host");
  if (!host) throw new Error("Missing Host header");

  const proto = process.env.NODE_ENV === "development" ? "http" : "https";

  const res = await fetch(`${proto}://${host}/api/applications/archived`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load archived applications");
  }

  return res.json();
}

export default async function ArchivedPage() {
  const apps = await getArchivedApplications();

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(12px, 3vw, 24px)",
        display: "grid",
        gap: 16,
      }}
    >
      <Link href="/dashboard" className="back-link">
        ← Back to board
      </Link>

      <div>
        <h1 className="page-title" style={{ margin: 0, fontSize: 28 }}>
          Archived
        </h1>

        <p className="page-subtitle" style={{ marginTop: 8 }}>
          Restore archived applications back to the board or delete them
          permanently.
        </p>
      </div>

      <ArchivedList initialApps={apps} />
    </main>
  );
}
