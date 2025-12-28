
import { Task, Thought, JournalEntry, Project, Habit, ChatMessage, ChatSession } from '../types';

const DB_NAME = 'SerafimOS_DB';
const DB_VERSION = 3; 

export interface SerafimData {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  sessions: ChatSession[];
}

class DBService {
  private db: IDBDatabase | null = null;

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('thoughts')) db.createObjectStore('thoughts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('journal')) db.createObjectStore('journal', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('habits')) db.createObjectStore('habits', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('chat_sessions')) db.createObjectStore('chat_sessions', { keyPath: 'id' });
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveItem(storeName: string, item: any): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteItem(storeName: string, id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAll(storeName: string, items: any[]): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        items.forEach(item => store.add(item));
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async migrateFromLocalStorage(): Promise<boolean> {
    const keys = {
      tasks: 'sb_tasks',
      thoughts: 'sb_thoughts',
      journal: 'sb_journal',
      projects: 'sb_projects',
      habits: 'sb_habits'
    };

    let migrated = false;
    for (const [store, lsKey] of Object.entries(keys)) {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (Array.isArray(data) && data.length > 0) {
            await this.saveAll(store, data);
            migrated = true;
          }
        } catch (e) {
          console.error(`Migration error for ${lsKey}:`, e);
        }
      }
    }
    return migrated;
  }
}

export const dbService = new DBService();
