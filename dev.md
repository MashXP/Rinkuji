## Development

### Running Tests

To run the frontend tests, navigate to the `frontend` directory and use the following commands:

*   **Run all tests:**
    ```bash
    ./node_modules/.bin/jest
    ```
*   **Run tests with coverage:**
    ```bash
    ./node_modules/.bin/jest --coverage
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
