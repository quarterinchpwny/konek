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
*   **Docker Management:**
    *   List Docker containers on the remote host.
    *   Start, stop, and restart Docker containers.
    *   View logs for Docker containers.

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
*   **Docker Manager:**
    *   List, start, stop, and restart Docker containers.
    *   View container logs in real-time.


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

Alternatively, you can run both the frontend and backend development servers with a single command from the root of the project:
```bash
node dev.mjs
```

The application will be available at `http://localhost:5173`.

## Running with Docker

To run the application using Docker, ensure you have Docker and Docker Compose installed.

1.  **Build and start the services:**
    Navigate to the root directory of the project (where `docker-compose.yml` is located) and run:
    ```bash
    docker-compose up -d --build
    ```
    This command will:
    *   Build the `konek/frontend` and `konek/backend` Docker images based on their respective `Dockerfile`s.
    *   Start the `konek-backend` service. The entire `/app/backend` directory, which includes the SQLite database, is persisted in a Docker volume named `backend_data`.
    *   Start the `konek-frontend` service, serving the web application with Nginx.

2.  **Access the application:**
    Once the services are up and running, you can access the frontend application in your web browser at `http://localhost:6060`.

3.  **Stopping the services:**
    To stop the services and remove the containers, run:
    ```bash
    docker-compose down
    ```

4.  **Stopping services and removing volumes (if you want to reset the database or backend code):**
    If you have made changes to the backend code and want to rebuild the image and re-initialize the database, you need to remove the associated volume:
    ```bash
    docker-compose down -v
    ```
    Then, you can start them again with `docker-compose up -d --build`.

### Development Workflow with Docker

To streamline development with live code reloading, use the `docker-compose.dev.yml` override file. This setup mounts your local source code into the containers, allowing for instant reflection of changes.

1.  **Start Services in Development Mode:**
    Navigate to the root directory of the project and run:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
    ```
    This command will:
    *   Build the `konek-backend` and `konek-frontend` services in development mode, specifically targeting the `develop` stage for the frontend.
    *   Mount your local `./backend` directory into the `konek-backend` container. Changes in your local files will trigger automatic restarts via `tsx watch`.
    *   Mount your local `./frontend` directory into the `konek-frontend` container. Changes will trigger Vite's Hot Module Replacement (HMR).

2.  **Access the Development Application:**
    The frontend development server runs on port `5173`. Access your application at: **http://localhost:5173**

3.  **Stopping Development Services:**
    To stop the development services, run:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.dev.yml down
    ```

**Note:** If you switch between development and production setups, or if you encounter issues, it's often helpful to clean up Docker resources by running `docker-compose down -v` with the appropriate configuration files before restarting.
