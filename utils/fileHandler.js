const fs = require('fs/promises');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../data/tasks.json');

// Ensure data folder and file exist on startup
const initStore = async () => {
  try {
    const dir = path.dirname(FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(FILE_PATH);
    } catch {
      await fs.writeFile(FILE_PATH, JSON.stringify([]), 'utf8');
    }
  } catch (err) {
    console.error('Failed to initialize file store:', err);
  }
};

const readTasks = async () => {
  await initStore();
  const data = await fs.readFile(FILE_PATH, 'utf8');
  return JSON.parse(data || '[]');
};

const writeTasks = async (tasks) => {
  await initStore();
  const tempPath = `${FILE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(tasks, null, 2), 'utf8');
  await fs.rename(tempPath, FILE_PATH);
};

module.exports = { readTasks, writeTasks };