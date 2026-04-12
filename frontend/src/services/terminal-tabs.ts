import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export interface TerminalTabSummary {
  id: string;
  name: string;
  sessionName: string;
  createdAt: number;
  lastActive: number;
}

export const listTerminalTabs = async (sessionId: string) => {
  const response = await axios.get(`${API_URL}/terminal/tabs`, {
    params: { sessionId },
  });
  return response.data.tabs as TerminalTabSummary[];
};

export const createTerminalTab = async (sessionId: string, name?: string) => {
  const response = await axios.post(`${API_URL}/terminal/tabs`, {
    sessionId,
    name,
  });
  return response.data.tab as TerminalTabSummary;
};

export const closeTerminalTab = async (
  sessionId: string,
  terminalTabId: string,
) => {
  await axios.post(`${API_URL}/terminal/tabs/close`, {
    sessionId,
    terminalTabId,
  });
};
