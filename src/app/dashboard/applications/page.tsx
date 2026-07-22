import ApplicationsList from "./ApplicationsList";
import { getApplications } from "@/lib/server/applications";

export default async function ApplicationsPage() {
  const apps = await getApplications();

  return (
      <ApplicationsList initialApps={apps} />
  );
}
