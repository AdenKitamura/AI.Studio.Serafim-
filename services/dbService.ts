import { Task, Thought, JournalEntry, Project, Habit, ChatSession, Memory } from '../types';
import { getSupabase } from './supabaseClient';

const DB_NAME = 'SerafimOS_DB';
const DB_VERSION = 4;

class DBService {
  private db: IDBDatabase | null = null;
  private userId: string | null = null;
  private clerkToken: string | null = null;

  // Called from App.tsx when Clerk loads
  public setAuth(userId: string | null, token: string | null) {
      this.userId = userId;
      this.clerkToken = token;
      if (this.userId && this.clerkToken) {
          this.syncAllTables();
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
    const supabase = await getSupabase(this.clerkToken);
    if (!this.userId || !supabase) return;

    // Ensure item has user_id matching the Clerk User ID
    const itemWithUser = { ...item, user_id: this.userId };
    const mappedItem = this.mapToSnakeCase(storeName, itemWithUser);
    
    const { error } = await supabase.from(storeName).upsert(mappedItem);
    if (error) console.error(`Sync error [${storeName}]:`, error);
  }

  private async deleteFromCloud(storeName: string, id: string) {
    const supabase = await getSupabase(this.clerkToken);
    if (!this.userId || !supabase) return;
    await supabase.from(storeName).delete().eq('id', id);
  }

  private mapToSnakeCase(storeName: string, item: any): any {
    const res: any = { ...item };
    if (item.dueDate) { res.due_date = item.dueDate; delete res.dueDate; }
    if (item.isCompleted !== undefined) { res.is_completed = item.isCompleted; delete res.isCompleted; }
    if (item.createdAt) { res.created_at = item.createdAt; delete res.createdAt; }
    if (item.projectId) { res.project_id = item.projectId; delete res.projectId; }
    if (item.columnId) { res.column_id = item.columnId; delete res.columnId; }
    if (item.completedDates) { res.completed_dates = item.completedDates; delete res.completedDates; }
    if (item.isArchived !== undefined) { res.is_archived = item.isArchived; delete res.isArchived; }
    if (item.lastInteraction) { res.last_interaction = item.lastInteraction; delete res.lastInteraction; }
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
    return res;
  }

  public async syncAllTables() {
    const supabase = await getSupabase(this.clerkToken);
    if (!this.userId || !supabase) return;

    console.log('☁️ Starting Clerk<->Supabase Sync...');
    const tables = ['tasks', 'thoughts', 'journal', 'projects', 'habits', 'chat_sessions', 'memories'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (!error && data) {
        const localItems = data.map(item => this.mapFromSnakeCase(item));
        await this.saveAll(table, localItems, false);
      } else if (error) {
        console.error('Sync Error on table ' + table, error);
      }
    }
    console.log('☁️ Sync Complete');
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
    this.pushToCloud(storeName, item);
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