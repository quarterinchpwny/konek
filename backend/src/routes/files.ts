import { Hono } from "hono";
import { getRequestAuthSessionId } from "../middleware/auth";
import { assertArchiveName, shellEscape } from "../lib/shell";
import { getOwnedSession } from "../services/session";
import path from "path";

type FileDeleteResult = {
  path: string;
  status: "deleted" | "error";
  error?: string;
};

const summarizeDeleteResults = (results: PromiseSettledResult<FileDeleteResult>[]) => {
  const normalizedResults = results.map((result) =>
    result.status === "fulfilled" ? result.value : (result.reason as FileDeleteResult)
  );
  const deletedCount = normalizedResults.filter((result) => result.status === "deleted").length;
  const failedCount = normalizedResults.length - deletedCount;
  const status =
    failedCount === 0 ? "success" : deletedCount === 0 ? "error" : "partial";
  const message =
    status === "success"
      ? `Deleted ${deletedCount} item${deletedCount === 1 ? "" : "s"}.`
      : status === "partial"
        ? `Deleted ${deletedCount} item${deletedCount === 1 ? "" : "s"}; ${failedCount} failed.`
        : `Failed to delete ${failedCount} item${failedCount === 1 ? "" : "s"}.`;

  return {
    status,
    message,
    results: normalizedResults,
    deletedCount,
    failedCount,
  };
};

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg",
    ".bmp": "image/bmp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
  };
  return mimeTypes[ext] || "application/octet-stream";
};

const filesRoute = new Hono();

/**
 * GET /api/files/list
 */
filesRoute.get("/list", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const sessionId = c.req.query("sessionId");
  const requestedPath = c.req.query("path") || "/";

  if (!sessionId) {
    return c.json({ error: "Session not found or disconnected" }, 401);
  }

  const session = getOwnedSession(sessionId, ownerId);

  return new Promise<Response>((resolve) => {
    const cmd = `ls -la --time-style=long-iso ${shellEscape(requestedPath)}`;

    session.client.exec(cmd, (err, stream) => {
      if (err) {
        return resolve(c.json({ error: err.message }, 500));
      }

      let output = "";

      stream.on("data", (data: Buffer) => {
        output += data.toString();
      });

      stream.on("close", (code: number) => {
        if (code !== 0) {
          return resolve(c.json({ error: "Command failed" }, 500));
        }

        // Simple ls parser
        const lines = output.split("\n").slice(1);

        const files = lines
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            const parts = line.split(/\s+/);
            const permissions = parts[0];
            const name = parts.slice(7).join(" ");

            return {
              name,
              permissions,
              isDirectory: permissions.startsWith("d"),
              size: parts[4],
              path: requestedPath === "/" ? `/${name}` : `${requestedPath}/${name}`,
            };
          })
          .filter((f) => f.name !== "." && f.name !== "..");

        resolve(c.json({ path: requestedPath, files }));
      });
    });
  });
});

/**
 * GET /api/files/read
 */
filesRoute.get("/read", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const sessionId = c.req.query("sessionId");
  const filePath = c.req.query("path");

  if (!sessionId) {
    return c.json({ error: "No session" }, 401);
  }

  if (!filePath) {
    return c.json({ error: "Path is required" }, 400);
  }

  const session = getOwnedSession(sessionId, ownerId);

  return new Promise<Response>((resolve) => {
    session.client.sftp((err, sftp) => {
      if (err || !sftp) {
        return resolve(c.json({ error: "SFTP not available" }, 500));
      }

      const stream = sftp.createReadStream(filePath);
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => chunks.push(chunk));

      stream.on("end", () => {
        resolve(
          c.json({
            content: Buffer.concat(chunks).toString("utf-8"),
          })
        );
      });

      stream.on("error", (e: Error) => {
        resolve(c.json({ error: e.message }, 500));
      });
    });
  });
});

/**
 * POST /api/files/write
 */
filesRoute.post("/write", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const { sessionId, path, content } = await c.req.json();

  if (!sessionId) {
    return c.json({ error: "No session" }, 401);
  }

  const session = getOwnedSession(sessionId, ownerId);

  return new Promise<Response>((resolve) => {
    session.client.sftp((err, sftp) => {
      if (err || !sftp) return resolve(c.json({ error: "SFTP error" }, 500));
      const stream = sftp.createWriteStream(path);
      stream.on("close", () => {
        sftp.end();
        resolve(c.json({ status: "success" }));
      });
      stream.on("error", (writeErr) => {
        sftp.end();
        resolve(c.json({ error: writeErr.message }, 500));
      });
      stream.end(content);
    });
  });
});

/**
 * POST /api/files/upload
 */
filesRoute.post("/upload", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const formData = await c.req.formData();
  const sessionId = formData.get("sessionId") as string;
  const destinationPath = (formData.get("path") as string) || "/";

  if (!sessionId) {
    return c.json({ error: "Session not found or disconnected" }, 401);
  }

  const session = getOwnedSession(sessionId, ownerId);

  const files = formData.getAll("files") as unknown as File[];
  if (!files || files.length === 0) {
    return c.json({ error: "No files to upload" }, 400);
  }

  return new Promise<Response>((resolve) => {
    session.client.sftp(async (err, sftp) => {
      if (err || !sftp) {
        return resolve(c.json({ error: "SFTP not available" }, 500));
      }

      const uploadPromises = files.map((file) => {
        return new Promise(async (resolveFile, rejectFile) => {
          const remotePath = path.posix.join(destinationPath, file.name);
          const writeStream = sftp.createWriteStream(remotePath);
          const fileBuffer = Buffer.from(await file.arrayBuffer());

          writeStream.on("close", () => {
            resolveFile({ name: file.name, status: "uploaded" });
          });

          writeStream.on("error", (uploadErr) => {
            rejectFile({
              name: file.name,
              status: "error",
              error: uploadErr.message,
            });
          });

          writeStream.end(fileBuffer);
        });
      });

      const results = await Promise.allSettled(uploadPromises);
      sftp.end();

      resolve(c.json({ message: "Upload process finished.", results }));
    });
  });
});

/**
 * POST /api/files/delete
 */
filesRoute.post("/delete", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const { sessionId, items } = await c.req.json<{
    sessionId: string;
    items: { path: string; type: "file" | "directory" }[];
  }>();

  if (!sessionId) {
    return c.json({ error: "Session not found or disconnected" }, 401);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: "No items to delete provided" }, 400);
  }

  const session = getOwnedSession(sessionId, ownerId);

  return new Promise<Response>((resolve) => {
    session.client.sftp(async (err, sftp) => {
      if (err || !sftp) {
        return resolve(c.json({ error: "SFTP not available" }, 500));
      }

      const deletePromises = items.map((item) => {
        return new Promise((resolveFile, rejectFile) => {
          if (item.type === "file") {
            sftp.unlink(item.path, (unlinkErr) => {
              if (unlinkErr) {
                rejectFile({
                  path: item.path,
                  status: "error",
                  error: unlinkErr.message,
                });
              } else {
                resolveFile({ path: item.path, status: "deleted" });
              }
            });
          } else if (item.type === "directory") {
            // Need to handle recursive delete for directories via shell if they're not empty
            // For now, simple rmdir
            sftp.rmdir(item.path, (rmdirErr) => {
              if (rmdirErr) {
                rejectFile({
                  path: item.path,
                  status: "error",
                  error: rmdirErr.message,
                });
              } else {
                resolveFile({ path: item.path, status: "deleted" });
              }
            });
          } else {
            rejectFile({
              path: item.path,
              status: "error",
              error: `Unknown type for deletion: ${item.type}`,
            });
          }
        });
      });

      const results = await Promise.allSettled(deletePromises);
      const summary = summarizeDeleteResults(results);
      sftp.end();
      const statusCode = summary.status === "error" ? 500 : 200;
      resolve(c.json(summary, statusCode));
    });
  });
});

/**
 * POST /api/files/rename
 */
filesRoute.post("/rename", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const { sessionId, oldPath, newPath } = await c.req.json();

  if (!sessionId) {
    return c.json({ error: "Session not found or disconnected" }, 401);
  }

  const session = getOwnedSession(sessionId, ownerId);

  return new Promise<Response>((resolve) => {
    session.client.sftp((err, sftp) => {
      if (err || !sftp) return resolve(c.json({ error: "SFTP error" }, 500));
      sftp.rename(oldPath, newPath, (renameErr) => {
        sftp.end();
        if (renameErr) return resolve(c.json({ error: renameErr.message }, 500));
        resolve(c.json({ status: "success" }));
      });
    });
  });
});

/**
 * POST /api/files/archive
 */
filesRoute.post("/archive", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const { sessionId, items, archiveName, format } = await c.req.json();

  if (!sessionId) {
    return c.json({ error: "No session" }, 401);
  }

  const session = getOwnedSession(sessionId, ownerId);
  const parentDir = path.posix.dirname(items[0]);
  const itemNames = items.map((item: string) => shellEscape(path.posix.basename(item))).join(" ");
  const safeArchiveName = assertArchiveName(archiveName);
  
  let cmd = "";
  if (format === "zip") {
    cmd = `cd ${shellEscape(parentDir)} && zip -r ${shellEscape(`${safeArchiveName}.zip`)} ${itemNames}`;
  } else {
    cmd = `cd ${shellEscape(parentDir)} && tar -czf ${shellEscape(`${safeArchiveName}.tar.gz`)} ${itemNames}`;
  }

  return new Promise<Response>((resolve) => {
    session.client.exec(cmd, (err, stream) => {
      if (err) return resolve(c.json({ error: err.message }, 500));
      stream.on("close", (code: number) => {
        if (code === 0) resolve(c.json({ status: "success" }));
        else resolve(c.json({ error: `Archive failed with code ${code}` }, 500));
      });
    });
  });
});

/**
 * POST /api/files/unarchive
 */
filesRoute.post("/unarchive", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const { sessionId, archivePath } = await c.req.json();

  if (!sessionId) {
    return c.json({ error: "No session" }, 401);
  }

  const session = getOwnedSession(sessionId, ownerId);
  const dir = path.posix.dirname(archivePath);
  const fileName = path.posix.basename(archivePath);
  
  let cmd = "";
  if (fileName.endsWith(".zip")) {
    cmd = `cd ${shellEscape(dir)} && unzip ${shellEscape(fileName)}`;
  } else if (fileName.endsWith(".tar.gz") || fileName.endsWith(".tgz")) {
    cmd = `cd ${shellEscape(dir)} && tar -xzf ${shellEscape(fileName)}`;
  }

  return new Promise<Response>((resolve) => {
    session.client.exec(cmd, (err, stream) => {
      if (err) return resolve(c.json({ error: err.message }, 500));
      stream.on("close", (code: number) => {
        if (code === 0) resolve(c.json({ status: "success" }));
        else resolve(c.json({ error: `Extraction failed with code ${code}` }, 500));
      });
    });
  });
});

/**
 * GET /api/files/view
 */
filesRoute.get("/view", async (c) => {
  const ownerId = getRequestAuthSessionId(c);
  const sessionId = c.req.query("sessionId");
  const filePath = c.req.query("path");

  if (!sessionId) {
    return c.json({ error: "Session not found or disconnected" }, 401);
  }

  if (!filePath) {
    return c.json({ error: "Path is required" }, 400);
  }

  const session = getOwnedSession(sessionId, ownerId);

  return new Promise<Response>((resolve) => {
    session.client.sftp((err, sftp) => {
      if (err || !sftp) {
        return resolve(c.json({ error: "SFTP not available" }, 500));
      }

      sftp.stat(filePath, (statErr, stats) => {
        if (statErr) {
          sftp.end();
          return resolve(
            c.json({ error: "File not found", details: statErr.message }, 404)
          );
        }

        const contentType = getMimeType(filePath);
        c.header("Content-Type", contentType);
        c.header("Content-Length", stats.size.toString());
        c.header("Accept-Ranges", "bytes");

        const stream = sftp.createReadStream(filePath);
        stream.on("close", () => {
          sftp.end();
        });
        stream.on("error", (streamErr) => {
          console.error("stream error", streamErr);
          sftp.end();
        });

        return resolve(c.body(stream as any));
      });
    });
  });
});

export default filesRoute;
