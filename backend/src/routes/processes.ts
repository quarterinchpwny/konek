import { Hono } from 'hono';
import { getSSHService, sshPool } from '../lib/ssh-pool';
import { HTTPException } from 'hono/http-exception';
import { exec } from '../lib/ssh-utils';

const processes = new Hono();

// GET / - List all processes
processes.get('/', async (c) => {
  const hostId = c.req.param('hostId');
  let sshClient;
  try {
    sshClient = await getSSHService(hostId);
  } catch (error: any) {
    throw new HTTPException(404, { message: error.message || 'Host not found or SSH service unavailable' });
  }

  try {
    // Get processes with PID, User, %CPU, %Mem, RSS, and Command
    // Using 'ps -eo' for a consistent output format
    const stdout = await exec(sshClient, 'ps -eo pid,user,%cpu,%mem,rss,comm --sort=-%cpu');
    const lines = stdout.split('\n');
    const header = lines[0].trim().split(/\s+/);
    
    const processesList = lines.slice(1).map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) return null;
      
      return {
        pid: parts[0],
        user: parts[1],
        cpu: parseFloat(parts[2]),
        mem: parseFloat(parts[3]),
        rss: parseInt(parts[4]), // RSS is in KB
        command: parts.slice(5).join(' ')
      };
    }).filter(Boolean);

    return c.json({ processes: processesList });
  } catch (error: any) {
    console.error(`Failed to list processes for host ${hostId}:`, error);
    throw new HTTPException(500, { message: error.message || 'Failed to list processes' });
  } finally {
    if (sshClient) {
      sshPool.release(Number(hostId), sshClient);
    }
  }
});

// DELETE /:pid - Kill a process
processes.delete('/:pid', async (c) => {
  const hostId = c.req.param('hostId');
  const pid = c.req.param('pid');
  const signal = c.req.query('signal') || 'SIGTERM';

  let sshClient;
  try {
    sshClient = await getSSHService(hostId);
  } catch (error: any) {
    throw new HTTPException(404, { message: error.message || 'Host not found or SSH service unavailable' });
  }

  try {
    await exec(sshClient, `kill -s ${signal} ${pid}`);
    return c.json({ pid, status: 'killed' });
  } catch (error: any) {
    console.error(`Failed to kill process ${pid} on host ${hostId}:`, error);
    throw new HTTPException(500, { message: error.message || 'Failed to kill process' });
  } finally {
    if (sshClient) {
      sshPool.release(Number(hostId), sshClient);
    }
  }
});

export default processes;
