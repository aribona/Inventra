import { createTRPCRouter } from "@/server/api/trpc";
import { inventoryRouter } from "./routers/inventory";
import { analyticsRouter } from "./routers/analytics";
import { insightsRouter } from "./routers/insights";
import { forecastingRouter } from "./routers/forecasting";
import { settingsRouter } from "./routers/settings";

export const appRouter = createTRPCRouter({
  inventory: inventoryRouter,
  analytics: analyticsRouter,
  insights: insightsRouter,
  forecasting: forecastingRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
