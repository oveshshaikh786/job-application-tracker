import ArchivedList from "./ArchivedList";
import { getArchivedApplications } from "@/lib/server/applications";

export default async function ArchivedPage() {
  const apps = await getArchivedApplications();

  return (
      <section className="applications-page">
        <div className="applications-hero">
          <div>
            <p className="analytics-eyebrow">Archived Records</p>
            <h1 className="analytics-title">Archived Applications</h1>
            <p className="analytics-subtitle">
              Restore archived applications back to the board or delete them
              permanently.
            </p>
          </div>
        </div>

        <ArchivedList initialApps={apps} />
      </section>
  );
}
