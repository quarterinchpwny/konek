import { randomUUID } from "node:crypto";
import { HTTPException } from "hono/http-exception";

export interface TerminalTab {
  id: string;
  name: string;
  sessionName: string;
  createdAt: number;
  lastActive: number;
}

const terminalTabsBySession = new Map<string, Map<string, TerminalTab>>();

const getSessionTabs = (sessionId: string) => {
  const tabs = terminalTabsBySession.get(sessionId);
  if (tabs) {
    return tabs;
  }

  const createdTabs = new Map<string, TerminalTab>();
  terminalTabsBySession.set(sessionId, createdTabs);
  return createdTabs;
};

const getDefaultTabName = (sessionId: string) =>
  `Tab ${getSessionTabs(sessionId).size + 1}`;

const buildTerminalSessionName = (sessionId: string, tabId: string) => {
  const compactSessionId = sessionId.replace(/-/g, "").slice(0, 12);
  const compactTabId = tabId.replace(/-/g, "").slice(0, 12);
  return `konek-${compactSessionId}-${compactTabId}`;
};

export const listTerminalTabs = (sessionId: string) =>
  Array.from(getSessionTabs(sessionId).values()).sort(
    (left, right) => left.createdAt - right.createdAt,
  );

export const createTerminalTab = (sessionId: string, name?: string) => {
  const tabId = randomUUID();
  const now = Date.now();
  const tab: TerminalTab = {
    id: tabId,
    name: name?.trim() || getDefaultTabName(sessionId),
    sessionName: buildTerminalSessionName(sessionId, tabId),
    createdAt: now,
    lastActive: now,
  };

  getSessionTabs(sessionId).set(tab.id, tab);
  return tab;
};

export const getTerminalTab = (sessionId: string, tabId: string) => {
  const tab = getSessionTabs(sessionId).get(tabId);
  if (!tab) {
    throw new HTTPException(404, { message: "Terminal tab not found" });
  }
  return tab;
};

export const touchTerminalTab = (sessionId: string, tabId: string) => {
  const tab = getTerminalTab(sessionId, tabId);
  tab.lastActive = Date.now();
  return tab;
};

export const deleteTerminalTab = (sessionId: string, tabId: string) => {
  const tabs = getSessionTabs(sessionId);
  const tab = tabs.get(tabId);
  tabs.delete(tabId);
  return tab ?? null;
};

export const clearTerminalTabs = (sessionId: string) => {
  const tabs = listTerminalTabs(sessionId);
  terminalTabsBySession.delete(sessionId);
  return tabs;
};
