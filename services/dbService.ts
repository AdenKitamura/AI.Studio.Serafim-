import { Task, Thought, JournalEntry, Project, Habit, ChatSession, Memory } from '../types';
import { supabase } from './supabaseClient';
import { logger } from './logger';

const DB_NAME = 'SerafimOS_DB';
const DB_VERSION = 4;

class DBService {
  private db: IDBDatabase | null = null;
  private userId: string | null = null;

  // Called from App.tsx when Auth loads
  // Now async so App can await the initial sync if needed
  public async setAuth(userId: string | null) {
      this.userId = userId;
      if (userId) {
          logger.log('DB', `Authenticated user ${userId.substring(0,6)}...`, 'info');
          await this.syncAllTables();
      }
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const stores = ['tasks', 'thoughts', 'journal', 'projects', 'habits', 'chat_sessions', 'memories'];
        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
        });
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- GENERIC SYNC METHODS ---

  private async pushToCloud(storeName: string, item: any) {
    if (!this.userId) return;

    // Ensure item has user_id matching the Auth User ID
    const itemWithUser = { ...item, user_id: this.userId };
    const mappedItem = this.mapToSnakeCase(storeName, itemWithUser);
    
    // Silenced success logs to prevent spam
    // logger.log('Cloud', `Pushing to ${storeName}...`, 'info');
    
    const { error } = await supabase.from(storeName).upsert(mappedItem);
    if (error) {
        console.error(`Sync error [${storeName}]:`, error);
        logger.log('Cloud', `Sync Error: ${error.message}`, 'error');
    } else {
        // logger.log('Cloud', `Synced ${storeName} item`, 'success');
    }
  }

  private async deleteFromCloud(storeName: string, id: string) {
    if (!this.userId) return;
    // logger.log('Cloud', `Deleting from ${storeName}...`, 'info');
    await supabase.from(storeName).delete().eq('id', id);
  }

  private mapToSnakeCase(storeName: string, item: any): any {
    const res: any = { ...item };
    
    // Explicitly handle date/boolean/foreign keys using 'in' operator to handle null/false values
    if ('dueDate' in item) { res.due_date = item.dueDate; delete res.dueDate; }
    if ('isCompleted' in item) { res.is_completed = item.isCompleted; delete res.isCompleted; }
    if ('createdAt' in item) { res.created_at = item.createdAt; delete res.createdAt; }
    if ('projectId' in item) { res.project_id = item.projectId; delete res.projectId; }
    if ('columnId' in item) { res.column_id = item.columnId; delete res.column_id; }
    if ('completedDates' in item) { res.completed_dates = item.completedDates; delete res.completedDates; }
    if ('isArchived' in item) { res.is_archived = item.isArchived; delete res.isArchived; }
    if ('lastInteraction' in item) { res.last_interaction = item.lastInteraction; delete res.lastInteraction; }
    
    // Remove attachments for now as the column is missing in Cloud DB
    if ('attachments' in res) { delete res.attachments; }

    // CRITICAL: Explicitly ensure JSON fields for Projects are preserved during sync
    if (storeName === 'projects') {
        if (item.columns) res.columns = item.columns;
        if (item.boards) res.boards = item.boards;
    }

    return res;
  }
  
  private mapFromSnakeCase(item: any): any {
    const res: any = { ...item };
    if (res.due_date) { res.dueDate = res.due_date; delete res.due_date; }
    if (res.is_completed !== undefined) { res.isCompleted = res.is_completed; delete res.is_completed; }
    if (res.created_at) { res.createdAt = res.created_at; delete res.created_at; }
    if (res.project_id) { res.projectId = res.project_id; delete res.project_id; }
    if (res.column_id) { res.columnId = res.column_id; delete res.column_id; }
    if (res.completed_dates) { res.completedDates = res.completed_dates; delete res.completed_dates; }
    if (res.is_archived !== undefined) { res.isArchived = res.is_archived; delete res.is_archived; }
    if (res.last_interaction) { res.lastInteraction = res.last_interaction; delete res.last_interaction; }
    
    // JSON fields usually come back as-is from Supabase, but explicit mapping ensures consistency if types vary
    if (res.columns) res.columns = res.columns; 
    if (res.boards) res.boards = res.boards;

    return res;
  }

  public async syncAllTables() {
    if (!this.userId) return;

    // Initial sync log is fine, it happens once
    logger.log('Sync', 'Starting full synchronization...', 'info');
    const tables = ['tasks', 'thoughts', 'journal', 'projects', 'habits', 'chat_sessions', 'memories'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (!error && data) {
        // Map snake_case from DB to camelCase for App
        const localItems = data.map(item => this.mapFromSnakeCase(item));
        // Overwrite local DB with Cloud Truth
        await this.saveAll(table, localItems, false);
      } else if (error) {
        console.error('Sync Error on table ' + table, error);
        logger.log('Sync', `Error syncing ${table}: ${error.message}`, 'error');
      }
    }
    logger.log('Sync', 'Full synchronization complete.', 'success');
  }

  // --- CRUD ---

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
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await this.pushToCloud(storeName, item);
  }

  async deleteItem(storeName: string, id: string): Promise<void> {
    const db = await this.initDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    this.deleteFromCloud(storeName, id);
  }

  async saveAll(storeName: string, items: any[], syncCloud = true): Promise<void> {
    const db = await this.initDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      // Clear store before bulk save if getting from cloud to ensure consistency? 
      // For now, put overwrites existing IDs.
      items.forEach(item => store.put(item));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    
    if (syncCloud) {
      items.forEach(item => this.pushToCloud(storeName, item));
    }
  }

  async migrateFromLocalStorage(): Promise<boolean> {
    return false; 
  }
}

export const dbService = new DBService();