import { Hono } from "hono";
import { exec } from "child_process";
import path from "path";

const nbaRoute = new Hono();

// Fast Path Cache
const cache = new Map<string, { data: any, timestamp: number }>();
const SCORE_CACHE_TTL = 15 * 1000; 
const LIVE_DETAIL_CACHE_TTL = 5 * 1000;

// NBA Official API Endpoints (The fast ones)
const SCOREBOARD_URL = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json";

nbaRoute.get("/scores", async (c) => {
  const date = c.req.query("date") || new Date().toISOString().split('T')[0];
  const cacheKey = `scores_${date}`;
  
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < SCORE_CACHE_TTL)) {
    return c.json(cached.data);
  }

  // --- STANDARD PATH (Python) ---
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
    exec(`python3 ${scriptPath} --date ${date}`, (error, stdout) => {
      try {
        const result = JSON.parse(stdout);
        if (result.games && result.games.length > 0) {
            cache.set(cacheKey, { data: result, timestamp: Date.now() });
        }
        resolve(c.json(result));
      } catch (e) {
        resolve(c.json({ error: "Parse error", games: [] }));
      }
    });
  });
});

// Deep Stats endpoints remain on Python but with shorter cache
nbaRoute.get("/pbp", async (c) => {
  const gameId = c.req.query("gameId");
  const cacheKey = `pbp_${gameId}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < LIVE_DETAIL_CACHE_TTL)) {
    return c.json(cached.data);
  }

  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
    exec(`python3 ${scriptPath} --gameId ${gameId} --type pbp`, (err, stdout) => {
      try {
        const res = JSON.parse(stdout);
        cache.set(cacheKey, { data: res, timestamp: Date.now() });
        resolve(c.json(res));
      } catch (e) { resolve(c.json({ plays: [], momentum: [] })); }
    });
  });
});

nbaRoute.get("/boxscore", async (c) => {
  const gameId = c.req.query("gameId");
  const cacheKey = `box_${gameId}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < LIVE_DETAIL_CACHE_TTL)) {
    return c.json(cached.data);
  }

  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
    exec(`python3 ${scriptPath} --gameId ${gameId} --type boxscore`, (err, stdout) => {
      try {
        const res = JSON.parse(stdout);
        cache.set(cacheKey, { data: res, timestamp: Date.now() });
        resolve(c.json(res));
      } catch (e) { resolve(c.json({ players: [], teamStats: {} })); }
    });
  });
});

nbaRoute.get("/standings", async (c) => {
  if (cache.has("standings")) return c.json(cache.get("standings")!.data);
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
    exec(`python3 ${scriptPath} --type standings`, (err, stdout) => {
      try {
        const res = JSON.parse(stdout);
        cache.set("standings", { data: res, timestamp: Date.now() });
        resolve(c.json(res));
      } catch (e) { resolve(c.json({ standings: [] })); }
    });
  });
});

nbaRoute.get("/team", async (c) => {
  const teamId = c.req.query("teamId");
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
    exec(`python3 ${scriptPath} --teamId ${teamId} --type team`, (err, stdout) => {
      try { resolve(c.json(JSON.parse(stdout))); }
      catch (e) { resolve(c.json({ teamDetails: {} })); }
    });
  });
});

nbaRoute.get("/player", async (c) => {
  const playerId = c.req.query("playerId");
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
    exec(`python3 ${scriptPath} --playerId ${playerId} --type player`, (err, stdout) => {
      try { resolve(c.json(JSON.parse(stdout))); }
      catch (e) { resolve(c.json({ playerInfo: {} })); }
    });
  });
});

nbaRoute.get("/shots", async (c) => {
  const gameId = c.req.query("gameId");
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
    exec(`python3 ${scriptPath} --gameId ${gameId} --type shots`, (err, stdout) => {
      try { resolve(c.json(JSON.parse(stdout))); }
      catch (e) { resolve(c.json({ shots: [] })); }
    });
  });
});

export default nbaRoute;