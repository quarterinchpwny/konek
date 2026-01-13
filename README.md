# Konek

Konek is a web-based remote server management tool. It provides a simple and intuitive interface for managing and interacting with remote hosts via SSH.

## Features

### Backend

*   **Host Management:**
    *   Add, and list remote hosts.
    *   Check the online status of hosts.
    *   **Wake-on-LAN (WOL):** Send magic packets to wake up offline machines.
*   **SSH Terminal:**
    *   Real-time interactive SSH terminal in the browser.
    *   Securely connects to remote hosts using SSH.
*   **File Management:**
    *   Browse the file system of remote hosts.
    *   View the contents of files.
*   **System Monitoring:**
    *   Polls remote hosts for system metrics (CPU, memory, disk, etc.).
    *   Provides real-time updates on system performance.

### Frontend

*   **Host Manager:**
    *   Add and manage a list of remote hosts, including configuring MAC addresses for Wake-on-LAN.
    *   Select a host to connect to.
*   **Wake-on-LAN (WOL):** Initiate Wake-on-LAN directly from the host list in the Dashboard Sidebar and Home View.
*   **SSH Terminal:**
    *   An interactive terminal to execute commands on the remote host.
*   **File Manager:**
    *   A simple file browser to navigate the remote host's file system.
*   **Dashboard:**
    *   Displays real-time system metrics of the connected host.

## API Endpoints

### Wake-on-LAN (WOL)

*   **Endpoint:** `POST /api/hosts/:id/wol`
*   **Description:** Sends a Wake-on-LAN magic packet to the specified host.
*   **Method:** `POST`
*   **URL Parameters:**
    *   `:id` (number): The ID of the host to wake up.
*   **Request Body:** None
*   **Responses:**
    *   `200 OK`: `{"message": "WOL packet sent successfully"}`
    *   `400 Bad Request`: `{"error": "MAC address not configured for this host"}`
    *   `404 Not Found`: `{"error": "Host not found"}`
    *   `500 Internal Server Error`: `{"error": "Failed to send WOL packet"}` or `{"error": "Internal server error"}`

## Getting Started

### Prerequisites

*   Node.js and npm
*   A running SSH server on the remote host.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/konek.git
    cd konek
    ```

2.  **Install backend dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Install frontend dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Application

1.  **Start the backend server:**
    ```bash
    cd ../backend
    npm start
    ```

2.  **Start the frontend development server:**
    ```bash
    cd ../frontend
    npm run dev
    ```

The application will be available at `http://localhost:5173`.
