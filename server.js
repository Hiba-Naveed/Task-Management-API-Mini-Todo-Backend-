const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readTasks, writeTasks } = require('./utils/fileHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed Enum Constants
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['Pending', 'InProgress', 'Completed'];

// Global Middlewares
app.use(express.json());
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 min window
    max: 100, // 100 requests per IP per window
  })
);

// Async Handler wrapper for clean error catching
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ======================= API ROUTES =======================

/**
 * @route   POST /api/tasks
 * @desc    Create a new task (with title duplication check)
 */
app.post(
  '/api/tasks',
  asyncHandler(async (req, res) => {
    const { title, description, priority = 'Medium', status = 'Pending', dueDate } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title is required.' });
    }

    const tasks = await readTasks();

    // Prevent duplicate tasks by checking title (case-insensitive)
    const isDuplicate = tasks.some(
      (task) => task.title.toLowerCase() === title.trim().toLowerCase()
    );

    if (isDuplicate) {
      return res.status(409).json({
        error: 'Conflict Error',
        message: 'A task with this title already exists.',
      });
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (dueDate && isNaN(Date.parse(dueDate))) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid ISO dueDate format.' });
    }

    const newTask = {
      id: uuidv4(),
      title: title.trim(),
      description: description || '',
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    await writeTasks(tasks);

    res.status(201).json(newTask);
  })
);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with filtering, sorting, and pagination
 * @params  page, limit, status, sort (asc|desc)
 */
app.get(
  '/api/tasks',
  asyncHandler(async (req, res) => {
    let tasks = await readTasks();

    const { page, limit, status, sort } = req.query;

    // 1. Filtering by status
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          error: 'Invalid Query Parameter',
          message: `Status filter must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      tasks = tasks.filter((t) => t.status === status);
    }

    // 2. Sorting by dueDate
    if (sort) {
      const order = sort.toLowerCase();
      if (order !== 'asc' && order !== 'desc') {
        return res.status(400).json({
          error: 'Invalid Query Parameter',
          message: "Sort query must be 'asc' or 'desc'.",
        });
      }

      tasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const timeA = new Date(a.dueDate).getTime();
        const timeB = new Date(b.dueDate).getTime();
        return order === 'asc' ? timeA - timeB : timeB - timeA;
      });
    }

    // 3. Pagination
    const pageNum = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const limitNum = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : tasks.length || 10;

    const totalItems = tasks.length;
    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedTasks = tasks.slice(startIndex, startIndex + limitNum);

    res.json({
      meta: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
      data: paginatedTasks,
    });
  })
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID
 */
app.get(
  '/api/tasks/:id',
  asyncHandler(async (req, res) => {
    const tasks = await readTasks();
    const task = tasks.find((t) => t.id === req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Not Found', message: 'Task not found.' });
    }

    res.json(task);
  })
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update an existing task
 */
app.put(
  '/api/tasks/:id',
  asyncHandler(async (req, res) => {
    const tasks = await readTasks();
    const index = tasks.findIndex((t) => t.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Not Found', message: 'Task not found.' });
    }

    const { title, description, priority, status, dueDate } = req.body;

    // Validation
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title cannot be empty.' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (dueDate && isNaN(Date.parse(dueDate))) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid ISO dueDate format.' });
    }

    const currentTask = tasks[index];

    const updatedTask = {
      ...currentTask,
      title: title !== undefined ? title.trim() : currentTask.title,
      description: description !== undefined ? description : currentTask.description,
      priority: priority !== undefined ? priority : currentTask.priority,
      status: status !== undefined ? status : currentTask.status,
      dueDate: dueDate !== undefined ? new Date(dueDate).toISOString() : currentTask.dueDate,
      updatedAt: new Date().toISOString(),
    };

    tasks[index] = updatedTask;
    await writeTasks(tasks);

    res.json(updatedTask);
  })
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 */
app.delete(
  '/api/tasks/:id',
  asyncHandler(async (req, res) => {
    const tasks = await readTasks();
    const index = tasks.findIndex((t) => t.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Not Found', message: 'Task not found.' });
    }

    const deleted = tasks.splice(index, 1);
    await writeTasks(tasks);

    res.json({ message: 'Task deleted successfully', task: deleted[0] });
  })
);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route does not exist.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});