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
2.  **Run all tests:**
    ```bash
    cd backend && pytest
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
