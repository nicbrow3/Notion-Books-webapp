const fs = require('fs').promises;
const path = require('path');

class FileStorage {
  constructor() {
    this.storageDir = path.join(__dirname, '..', 'data');
    this.ensureStorageDir();
  }

  async ensureStorageDir() {
    try {
      await fs.access(this.storageDir);
    } catch (error) {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  getFilePath(key) {
    return path.join(this.storageDir, `${key}.json`);
  }

  async set(key, data) {
    try {
      await this.ensureStorageDir();
      const filePath = this.getFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`FileStorage set error for key ${key}:`, error);
      return false;
    }
  }

  async get(key) {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`FileStorage get error for key ${key}:`, error);
      }
      return null;
    }
  }

  async delete(key) {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`FileStorage delete error for key ${key}:`, error);
      }
      return false;
    }
  }

  async exists(key) {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async list() {
    try {
      await this.ensureStorageDir();
      const files = await fs.readdir(this.storageDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('FileStorage list error:', error);
      return [];
    }
  }
}

module.exports = new FileStorage(); 