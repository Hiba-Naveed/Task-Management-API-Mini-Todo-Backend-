# Task Management API (Mini Todo Backend) 🚀

A lightweight, robust REST API for managing tasks, built with **Node.js** and **Express.js**. This project uses a local JSON file for persistent data storage, making it perfect for lightweight applications or microservices without the overhead of a traditional database.

## Features ✨
* **RESTful Architecture:** Full CRUD capabilities (Create, Read, Update, Delete).
* **Local JSON Storage:** Thread-safe read/write operations using Node.js `fs/promises`.
* **Unique Identifiers:** Secure UUID generation for all tasks.
* **Pagination, Filtering, & Sorting:** Built-in queries for efficient data retrieval.
* **Custom Rate Limiting:** In-memory middleware to protect against API abuse.
* **Validation:** Robust data validation and duplicate title checks.

## Tech Stack 🛠️
* **Backend:** Node.js, Express.js
* **Utilities:** UUID for unique IDs, dotenv for environment variables
* **Storage:** Local JSON file (`data/tasks.json`)

## Quick Start 🏁

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/YourUsername/task-management-api.git](https://github.com/YourUsername/task-management-api.git)
   cd task-management-api
