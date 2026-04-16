import Link from "next/link";
import NewApplicationForm from "../new/NewApplicationForm";

export default function NewApplicationPage() {
  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <Link
        href="/dashboard"
        style={{
          display: "inline-block",
          marginBottom: 12,
          textDecoration: "none",
          opacity: 0.9,
        }}
      >
        ← Back to board
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 800 }}>New Application</h1>
      <p style={{ opacity: 0.7, marginTop: 6 }}>
        Create a company + role + application in one shot.
      </p>

      <div style={{ marginTop: 16 }}>
        <NewApplicationForm />
      </div>
    </main>
  );
}
