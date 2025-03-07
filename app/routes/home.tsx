import type { Route } from "./+types/home";
import { BudgetApp } from "../components/BudgetApp";
import { ThemeProvider } from "../components/ThemeProvider";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Friendly Budgets - 50/30/20 Budget Planner" },
    { name: "description", content: "Upload your bank statements and create a personalized 50/30/20 budget plan." },
  ];
}

export default function Home() {
  return (
    <ThemeProvider>
      <BudgetApp />
    </ThemeProvider>
  );
}
