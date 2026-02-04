import { Hono } from 'hono';
import { getSSHService } from '../lib/ssh-pool';
import { HTTPException } from 'hono/http-exception';
import { exec } from '../lib/ssh-utils'; // Import the exec utility

const tmux = new Hono();

// GET /sessions/check - Check if tmux is installed
tmux.get('/sessions/check', async (c) => {
  const hostId = c.req.param('hostId');
  let sshClient;
  try {
    sshClient = await getSSHService(hostId);
  } catch (error: any) {
    throw new HTTPException(404, { message: error.message || 'Host not found or SSH service unavailable' });
  }

  try {
    // 'command -v' is a reliable way to check for a command's existence in the PATH
    const stdout = await exec(sshClient, 'command -v tmux');
    return c.json({ installed: stdout.trim() !== '' });
  } catch (error: any) {
    // If command fails, it's likely not installed or there's another issue
    return c.json({ installed: false });
  }
});


// GET /sessions - List active tmux sessions
tmux.get('/sessions', async (c) => {
  const hostId = c.req.param('hostId');
  let sshClient;
  try {
    sshClient = await getSSHService(hostId); // Await the promise
  } catch (error: any) {
    throw new HTTPException(404, { message: error.message || 'Host not found or SSH service unavailable' });
  }

  try {
    const stdout = await exec(sshClient, 'tmux ls -F "#{session_name}"');
    const sessions = stdout
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean); // Filter out empty strings

    return c.json({ sessions });
  } catch (error: any) {
    console.error(`Failed to list tmux sessions for host ${hostId}:`, error);
    throw new HTTPException(500, { message: error.message || 'Failed to list tmux sessions' });
  } finally {

  }
});

// POST /sessions - Create a new tmux session
tmux.post('/sessions', async (c) => {
  const hostId = c.req.param('hostId');
  const { command, sessionName } = await c.req.json(); // Expect command and optional sessionName

  if (!command) {
    throw new HTTPException(400, { message: 'Command is required' });
  }

  let sshClient;
  try {
    sshClient = await getSSHService(hostId);
  } catch (error: any) {
    throw new HTTPException(404, { message: error.message || 'Host not found or SSH service unavailable' });
  }

  // Sanitize session name or generate a default one
  const safeSessionName = sessionName
    ? sessionName.replace(/[^a-zA-Z0-9_-]/g, '_')
    : `session-${Date.now()}`;

  try {
    // Check if session already exists
    const hasSessionOutput = await exec(sshClient, `tmux has-session -t ${safeSessionName} 2>/dev/null || echo "no"`);
    if (!hasSessionOutput.trim().includes("no")) {
      throw new HTTPException(409, { message: `Tmux session '${safeSessionName}' already exists.` });
    }

    const tmuxCommand = `tmux new -d -s ${safeSessionName} "${command}"`;
    await exec(sshClient, tmuxCommand);
    return c.json({ sessionName: safeSessionName, status: 'created' }, 201);
  } catch (error: any) {
    console.error(`Failed to create tmux session for host ${hostId} with command "${command}":`, error);
    throw new HTTPException(500, { message: error.message || 'Failed to create tmux session' });
  } finally {
  }
});

// GET /sessions/:sessionName/logs - Get logs from a tmux session
tmux.get('/sessions/:sessionName/logs', async (c) => {
  const hostId = c.req.param('hostId');
  const sessionName = c.req.param('sessionName');

  let sshClient;
  try {
    sshClient = await getSSHService(hostId);
  } catch (error: any) {
    throw new HTTPException(404, { message: error.message || 'Host not found or SSH service unavailable' });
  }

  try {
    // Capture the entire pane content
    const stdout = await exec(sshClient, `tmux capture-pane -p -t ${sessionName}`);
    return c.json({ logs: stdout });
  } catch (error: any) {
    console.error(`Failed to get logs for tmux session ${sessionName} on host ${hostId}:`, error);
    throw new HTTPException(500, { message: error.message || 'Failed to get logs' });
  } finally {
  }
});

// DELETE /sessions/:sessionName - Kill a tmux session
tmux.delete('/sessions/:sessionName', async (c) => {
  const hostId = c.req.param('hostId');
  const sessionName = c.req.param('sessionName');

  let sshClient;
  try {
    sshClient = await getSSHService(hostId);
  } catch (error: any) {
    throw new HTTPException(404, { message: error.message || 'Host not found or SSH service unavailable' });
  }

  try {
    await exec(sshClient, `tmux kill-session -t ${sessionName}`);
    return c.json({ sessionName, status: 'killed' });
  } catch (error: any) {
    console.error(`Failed to kill tmux session ${sessionName} on host ${hostId}:`, error);
    throw new HTTPException(500, { message: error.message || 'Failed to kill tmux session' });
  } finally {
  }
});

export default tmux;
