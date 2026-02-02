import { Hono } from "hono";
import { db } from "../db";
import { serverHosts } from "../db/schema";
import { Client as SSHClient } from "ssh2";
import { exec } from "../lib/ssh-utils";

const networkRoute = new Hono();

interface DockerContainer {
  ID: string;
  Names: string;
  Image: string;
  State: string;
}

interface PortMapping {
  protocol: string;
  port: number;
  service: string;
}

interface HostNode {
  id: string;
  name: string;
  type: 'host';
  children: Array<ServiceNode | PortGroupNode>;
}

interface ServiceNode {
  id: string;
  name: string;
  type: 'service';
  image: string;
  state: string;
}

interface PortGroupNode {
    id: string;
    name: string;
    type: 'port-group';
    children: PortNode[];
}

interface PortNode {
    id: string;
    name: string;
    type: 'port';
}

const connectAndFetch = (host: typeof serverHosts.$inferSelect): Promise<{ docker: DockerContainer[], ports: PortMapping[] }> => {
  return new Promise((resolve, reject) => {
    const client = new SSHClient();
    let connectionError = false;

    const connectTimeout = setTimeout(() => {
        if (!connectionError) {
            client.end();
            reject(new Error(`Connection timeout to ${host.hostname}`));
        }
    }, 10000); // 10-second timeout

    client.on("ready", async () => {
      clearTimeout(connectTimeout);
      try {
        const [dockerRes, portsRes] = await Promise.all([
          exec(client, "docker ps --format '{{json .}}'").catch(() => "[]"),
          exec(client, "ss -tuln").catch(() => "")
        ]);

        const docker: DockerContainer[] = dockerRes
          .split('\n')
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter((item): item is DockerContainer => item !== null);

        const ports: PortMapping[] = portsRes
          .split('\n')
          .slice(1) // Skip header
          .map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts[0] !== 'tcp' && parts[0] !== 'udp') return null;
            const portMatch = parts[4]?.match(/.*:(\d+)/);
            if (!portMatch) return null;
            return {
              protocol: parts[0],
              port: parseInt(portMatch[1], 10),
              service: 'unknown'
            };
          })
          .filter((item): item is PortMapping => item !== null);
          
        resolve({ docker, ports });
      } catch (err) {
        reject(err);
      } finally {
        client.end();
      }
    });

    client.on("error", (err) => {
      connectionError = true;
      clearTimeout(connectTimeout);
      reject(err);
    });

    client.connect({
      host: host.hostname,
      port: host.port || 22,
      username: host.username,
      password: host.password || undefined,
      readyTimeout: 10000,
    });
  });
};

networkRoute.get("/", async (c) => {
  const hosts = await db.select().from(serverHosts);
  const promises = hosts.map(async (host): Promise<HostNode> => {
    const hostNode: HostNode = {
      id: `host-${host.id}`,
      name: host.alias || host.hostname,
      type: 'host',
      children: []
    };

    if (host.sshEnabled) {
        try {
            const { docker, ports } = await connectAndFetch(host);

            if (docker.length > 0) {
                hostNode.children.push({
                    id: `host-${host.id}-docker`,
                    name: 'Docker Containers',
                    type: 'service-group',
                    children: docker.map(d => ({
                        id: `docker-${d.ID}`,
                        name: d.Names,
                        type: 'service',
                        image: d.Image,
                        state: d.State
                    }))
                });
            }
            if (ports.length > 0) {
                hostNode.children.push({
                    id: `host-${host.id}-ports`,
                    name: 'Open Ports',
                    type: 'port-group',
                    children: ports.map(p => ({
                        id: `port-${host.id}-${p.port}`,
                        name: `${p.port}/${p.protocol}`,
                        type: 'port',
                    }))
                });
            }
        } catch (error: any) {
            console.error(`Failed to fetch from ${host.hostname}:`, error.message);
            // You could add a child node indicating the error if you want
        }
    }

    return hostNode;
  });

  const results = await Promise.all(promises);
  return c.json(results);
});

export default networkRoute;
