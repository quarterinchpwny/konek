import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Client as SSHClient } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';

// Types
interface SSHSession {
  client: SSHClient;
  isConnected: boolean;
  lastActive: number;
}

// State - Keeping it simple (In-Memory) as per your original design
const sessions = new Map<string, SSHSession>();

const app = new Hono();

// Middleware
app.use('/*', cors({
  origin: ['http://localhost:5173'], // Your Vue App URL
  credentials: true,
}));

// Helper: Cleanup Session
const cleanupSession = (sessionId: string) => {
  const session = sessions.get(sessionId);
  if (session) {
    session.client.end();
    sessions.delete(sessionId);
    console.log(`Session ${sessionId} closed`);
  }
};

/**
 * 1. CONNECT Endpoint
 * Handles SSH connection and stores the client instance in memory.
 */
app.post('/api/connect', async (c) => {
  const body = await c.req.json();
  const { host, port, username, password, privateKey } = body;

  return new Promise((resolve) => {
    const client = new SSHClient();
    const sessionId = uuidv4();

    client.on('ready', () => {
      sessions.set(sessionId, {
        client,
        isConnected: true,
        lastActive: Date.now(),
      });
      
      resolve(c.json({ 
        status: 'success', 
        sessionId, 
        message: 'Connected successfully' 
      }));
    });

    client.on('error', (err) => {
      resolve(c.json({ status: 'error', message: err.message }, 500));
    });

    // Connection Config
    const config: any = {
      host,
      port: port || 22,
      username,
      readyTimeout: 20000,
    };

    if (privateKey) config.privateKey = privateKey;
    else if (password) config.password = password;

    try {
      client.connect(config);
    } catch (err: any) {
      resolve(c.json({ status: 'error', message: err.message }, 500));
    }
  });
});

/**
 * 2. LIST FILES Endpoint
 * Equivalent to your `listFiles` route.
 */
app.get('/api/files/list', async (c) => {
  const sessionId = c.req.query('sessionId');
  const path = c.req.query('path') || '/';

  if (!sessionId || !sessions.has(sessionId)) {
    return c.json({ error: 'Session not found or disconnected' }, 401);
  }

  const session = sessions.get(sessionId)!;
  session.lastActive = Date.now();

  return new Promise((resolve) => {
    // Using 'ls -la' just like your original code
    // In a production app, consider using SFTP.readdir for better parsing
    const cmd = `ls -la --time-style=long-iso "${path}"`;

    session.client.exec(cmd, (err, stream) => {
      if (err) return resolve(c.json({ error: err.message }, 500));

      let output = '';
      stream.on('data', (data: Buffer) => output += data.toString());
      
      stream.on('close', (code: number) => {
        if (code !== 0) return resolve(c.json({ error: 'Command failed' }, 500));
        
        // Simple Parser (You can swap this with your complex parser)
        const lines = output.split('\n').slice(1); // Skip total
        const files = lines
          .filter(line => line.trim().length > 0)
          .map(line => {
            const parts = line.split(/\s+/);
            const permissions = parts[0];
            const name = parts.slice(7).join(' '); // Rough estimation
            return {
              name,
              permissions,
              isDirectory: permissions.startsWith('d'),
              size: parts[4],
              path: path === '/' ? `/${name}` : `${path}/${name}`
            };
          })
          .filter(f => f.name !== '.' && f.name !== '..');

        resolve(c.json({ path, files }));
      });
    });
  });
});

/**
 * 3. READ FILE Endpoint
 * Streams content back to the frontend.
 */
app.get('/api/files/read', async (c) => {
  const sessionId = c.req.query('sessionId');
  const filePath = c.req.query('path');

  if (!sessionId || !sessions.has(sessionId)) return c.json({ error: 'No Session' }, 401);
  if (!filePath) return c.json({ error: 'No path provided' }, 400);

  const session = sessions.get(sessionId)!;
  
  // We use SFTP here for safer file reading compared to 'cat'
  return new Promise((resolve) => {
    session.client.sftp((err, sftp) => {
      if (err) return resolve(c.json({ error: 'SFTP not available' }, 500));

      // Hono streaming response
      const stream = sftp.createReadStream(filePath);
      
      // We wrap the Node stream into a Hono-friendly response
      // For simple text files, we can just buffer it (easier for text editors)
      const chunks: Buffer[] = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => {
        const content = Buffer.concat(chunks).toString('utf-8');
        resolve(c.json({ content }));
      });
      stream.on('error', (e) => resolve(c.json({ error: e.message }, 500)));
    });
  });
});

/**
 * 4. DISCONNECT
 */
app.post('/api/disconnect', async (c) => {
  const { sessionId } = await c.req.json();
  cleanupSession(sessionId);
  return c.json({ status: 'disconnected' });
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
