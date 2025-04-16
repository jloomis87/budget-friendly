import { DashboardPage } from "../pages/DashboardPage";

export function meta() {
  return [
    { title: "Friendly Budgets - Dashboard" },
    { name: "description", content: "View your budget summary and recent transactions." },
  ];
}

export default function Dashboard() {
  return <DashboardPage />;
} 