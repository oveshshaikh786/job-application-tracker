import DashboardStats from "./DashboardStats";
import DailyActionBanner from "./DailyActionBanner";
import KanbanBoard from "./KanbanBoard";
import ActivityFeed from "./ActivityFeed";
import { getApplications } from "@/lib/server/applications";

export default async function DashboardPage() {
  const apps = await getApplications();
  return (
    <>
      <DashboardStats />
      <DailyActionBanner />
      <ActivityFeed />
      <KanbanBoard initialApps={apps} />
    </>
  );
}
