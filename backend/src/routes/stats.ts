import { Hono } from "hono";
import { pollingService, metricsStore, statusStore } from "../services/monitor";

const statsRoute = new Hono();

/**
 * POST /api/stats/register
 */
statsRoute.post("/register", async (c) => {
  const { id } = await c.req.json();

  if (id) {
    pollingService.start(id);
  }

  return c.json({ message: "Started" });
});

/**
 * GET /api/stats/:id
 */
statsRoute.get("/:id", (c) => {
  const id = Number(c.req.param("id"));

  const metrics = metricsStore.get(id);
  const status = statusStore.get(id);

  if (!metrics) {
    return c.json(
      {
        error: "No metrics yet",
        status: status?.status || "unknown",
      },
      404
    );
  }

  return c.json({
    ...metrics,
    status: status?.status,
  });
});

/**
 * POST /api/stats/stop
 */
statsRoute.post("/stop", async (c) => {
  const { id } = await c.req.json();

  if (!id) {
    return c.json({ error: "Missing host ID" }, 400);
  }

  pollingService.stop(id);

  return c.json({ message: "Monitoring stopped" });
});

export default statsRoute;
