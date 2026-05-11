import { openDB } from 'idb';
import type { DBSchema } from 'idb';

import type { TableStoreValue } from '../interface';

const databaseName = 'playground-pro-table';
const databaseVersion = 1;
const storeName = 'ProTable';
const indexName = 'tableKey';

interface ProTableDatabase extends DBSchema {
  ProTable: {
    key: string;
    value: TableStoreValue;
    indexes: {
      tableKey: string;
    };
  };
}

export async function connectStore(tableKey: string) {
  const database = await openDB<ProTableDatabase>(databaseName, databaseVersion, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: 'id',
        });
        store.createIndex(indexName, indexName, {
          unique: false,
        });
      }
    },
  });

  return {
    close() {
      database.close();
    },
    async getAll() {
      return database.getAllFromIndex(storeName, indexName, tableKey);
    },
    async get(key: string) {
      const transaction = database.transaction(storeName, 'readonly');
      const value = await transaction.store.get(`${tableKey}:${key}`);
      await transaction.done;
      return value;
    },
    async put(value: TableStoreValue | TableStoreValue[]) {
      const rows = Array.isArray(value) ? value : [value];
      const transaction = database.transaction(storeName, 'readwrite');

      rows.forEach((item) => {
        transaction.store.put({
          ...item,
          id: `${tableKey}:${item.key}`,
          tableKey,
        });
      });

      await transaction.done;
    },
    async clear() {
      const transaction = database.transaction(storeName, 'readwrite');
      const index = transaction.store.index(indexName);
      const keys = await index.getAllKeys(tableKey);
      keys.forEach((key) => {
        transaction.store.delete(key);
      });
      await transaction.done;
    },
  };
}
