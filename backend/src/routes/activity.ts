
import { Hono } from 'hono';
import { db } from '../db';
import { activityLog, serverHosts } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

const router = new Hono();

router.get('/', async (c) => {
  const hostId = c.req.query('hostId');

  const query = db
    .select({
      id: activityLog.id,
      actionType: activityLog.actionType,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      hostId: activityLog.hostId,
      hostAlias: serverHosts.alias,
    })
    .from(activityLog)
    .leftJoin(serverHosts, eq(activityLog.hostId, serverHosts.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(20);

  if (hostId) {
    query.where(eq(activityLog.hostId, Number(hostId)));
  }

  const activities = await query;
  return c.json(activities);
});

router.post('/', async (c) => {
  const { hostId, actionType, details } = await c.req.json();
  if (!hostId || !actionType) {
    return c.json({ error: 'Host ID and action type are required' }, 400);
  }

  try {
    const newActivity = await db.insert(activityLog).values({ hostId, actionType, details, createdAt: new Date() }).returning();
    return c.json(newActivity[0], 201);
  } catch (error) {
    console.error('Failed to log activity:', error);
    return c.json({ error: 'Failed to log activity' }, 500);
  }
});

export default router;
