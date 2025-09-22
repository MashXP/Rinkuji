## Development

### Running Tests

#### Frontend Tests

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies (if not already installed):**
    ```bash
    npm install
    ```
3.  **Run tests:**
    *   **Run all tests:**
        ```bash
        npm test
        ```
    *   **Run tests with coverage:**
        ```bash
        npm test -- --coverage
        ```

#### Backend Tests

To run the backend tests, ensure you are in the project root directory and use the following commands:

1.  **Install dependencies:**
    ```bash
    pip install -r backend/requirements.txt
    ```
2.  **Run tests:**
    *   **Run all tests:**
        ```bash
        cd backend && pytest
        ```
    *   **Run tests with coverage:**
        ```bash
        cd backend && pytest --cov=src
        ```

### Running the Application Locally

To run the application locally, follow these steps:

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Install dependencies (if not already installed):**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run the Flask application:**
    ```bash
    export FLASK_APP=backend/app.py && flask run --debug

#### Accessing Locally Hosted App from Mobile Devices

To test the locally hosted application on a mobile device (or another device on the same network), follow these steps:

1.  **Find your PC's IP address:**
    On Linux, open a terminal and run `ip a` or `ifconfig`. Look for the IP address associated with your local network interface (e.g., `wlan0` for Wi-Fi, `eth0` for Ethernet). It will typically be in the `192.168.x.x` or `10.0.x.x` range.

2.  **Configure Flask to listen on all public IPs:**
    By default, `flask run` only listens on `127.0.0.1` (localhost), which is not accessible from other devices. You need to tell Flask to listen on `0.0.0.0`.
    From the project root, modify the command to run Flask:
    ```bash
    export FLASK_APP=backend/app.py && flask run --debug --host=0.0.0.0
    ```

3.  **Ensure firewall allows connections (if applicable):**
    If you have a firewall running on your PC, it might block incoming connections to Flask's default port (5000). You may need to temporarily disable it or add a rule to allow connections on port 5000.
    *   **For `ufw` (common on Ubuntu/Debian):**
        ```bash
        sudo ufw allow 5000
        ```
    *   **For `firewalld` (common on Fedora/RHEL):**
        ```bash
        sudo firewall-cmd --add-port=5000/tcp --permanent
        sudo firewall-cmd --reload
        ```

4.  **Access from your mobile device:**
    On your mobile device, open a web browser and navigate to `http://<YOUR_PC_IP_ADDRESS>:5000`. Replace `<YOUR_PC_IP_ADDRESS>` with the actual IP address you found in step 1.

**Important Security Note**: Listening on `0.0.0.0` makes your development server accessible to *any* device on your local network. Do not do this on untrusted networks or for production deployments.
