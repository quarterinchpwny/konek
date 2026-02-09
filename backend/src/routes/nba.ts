import { Hono } from "hono";
import { exec } from "child_process";
import path from "path";

const nbaRoute = new Hono();

nbaRoute.get("/scores", async (c) => {
  const date = c.req.query("date");
  
  return new Promise((resolve) => {
    // In Docker, python3 is in /usr/bin/python3
    // Locally, it might be different, so we'll try 'python3' directly
    const pythonCmd = "python3";
    const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
    
    const cmd = date ? `${pythonCmd} ${scriptPath} --date ${date}` : `${pythonCmd} ${scriptPath}`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return resolve(c.json({ error: error.message, games: [] }, 500));
      }
      
      try {
        const data = JSON.parse(stdout);
        resolve(c.json(data));
      } catch (e) {
        console.error(`parse error: ${e}, stdout: ${stdout}`);
        resolve(c.json({ error: "Failed to parse NBA data", games: [] }, 500));
      }
        });
      });
    });
    
    nbaRoute.get("/pbp", async (c) => {
      const gameId = c.req.query("gameId");
      if (!gameId) return c.json({ error: "gameId is required", plays: [] }, 400);
    
      return new Promise((resolve) => {
        const pythonCmd = "python3";
        const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
        const cmd = `${pythonCmd} ${scriptPath} --gameId ${gameId}`;
        
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return resolve(c.json({ error: error.message, plays: [] }, 500));
          }
          
          try {
            const data = JSON.parse(stdout);
            resolve(c.json(data));
          } catch (e) {
            console.error(`parse error: ${e}, stdout: ${stdout}`);
            resolve(c.json({ error: "Failed to parse NBA data", plays: [] }, 500));
          }
            });
          });
        });
        
        nbaRoute.get("/boxscore", async (c) => {
          const gameId = c.req.query("gameId");
          if (!gameId) return c.json({ error: "gameId is required", players: [] }, 400);
        
          return new Promise((resolve) => {
            const pythonCmd = "python3";
            const scriptPath = path.join(process.cwd(), "src", "lib", "nba_fetcher.py");
            const cmd = `${pythonCmd} ${scriptPath} --gameId ${gameId} --type boxscore`;
            
            exec(cmd, (error, stdout, stderr) => {
              if (error) {
                console.error(`exec error: ${error}`);
                return resolve(c.json({ error: error.message, players: [] }, 500));
              }
              
              try {
                const data = JSON.parse(stdout);
                resolve(c.json(data));
              } catch (e) {
                console.error(`parse error: ${e}, stdout: ${stdout}`);
                resolve(c.json({ error: "Failed to parse NBA data", players: [] }, 500));
              }
            });
          });
        });
        
        export default nbaRoute;
        