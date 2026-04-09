import { openDB } from 'idb';
import type { DBSchema } from 'idb';

import type { SearchFormStoreValue } from '../interface';

const databaseName = 'hammer-search-form-v2';
const databaseVersion = 1;
const storeName = 'SearchForm';
const indexName = 'formKey';

interface SearchFormDatabase extends DBSchema {
  SearchForm: {
    key: string;
    value: SearchFormStoreValue;
    indexes: {
      formKey: string;
    };
  };
}

/**
 * 这里故意把 IndexedDB 操作封装得很薄，只保留 SearchFormV2 真正需要的能力：
 * - 读当前表单下的全部字段配置
 * - 读某一个字段配置
 * - 批量覆盖写入当前表单配置
 *
 * 这样后续把组件迁到真实项目时，这层既可以直接复用，
 * 也可以很容易替换成 localStorage、接口持久化或其他存储实现。
 */
export async function connectStore(formKey: string) {
  const database = await openDB<SearchFormDatabase>(
    databaseName,
    databaseVersion,
    {
      upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
          /**
           * 表里每条记录的主键是 `${formKey}:${fieldKey}`，
           * 但我们平时最常见的读取场景是“取某个 SearchForm 的全部字段配置”，
           * 所以额外给 formKey 建一个二级索引。
           */
          const store = db.createObjectStore(storeName, {
            keyPath: 'id',
          });
          store.createIndex(indexName, indexName, {
            unique: false,
          });
        }
      },
    }
  );

  return {
    close() {
      database.close();
    },
    async getAll() {
      // 通过二级索引一次拿回同一个 SearchForm 的全部字段配置。
      return database.getAllFromIndex(storeName, indexName, formKey);
    },
    async get(key: string) {
      const transaction = database.transaction(storeName, 'readonly');
      // 单条读取时直接走主键，避免额外扫索引。
      const value = await transaction.store.get(`${formKey}:${key}`);
      await transaction.done;
      return value;
    },
    async put(value: SearchFormStoreValue | SearchFormStoreValue[]) {
      const rows = Array.isArray(value) ? value : [value];
      const transaction = database.transaction(storeName, 'readwrite');
      rows.forEach((item) => {
        /**
         * 主键统一收口成 formKey:key，有两个目的：
         * 1. 不同页面的同名字段互不覆盖。
         * 2. 同一个页面里批量写入时，天然就是“按字段覆盖更新”。
         */
        transaction.store.put({
          ...item,
          id: `${formKey}:${item.key}`,
          formKey,
        });
      });
      await transaction.done;
    },
    async clear() {
      const transaction = database.transaction(storeName, 'readwrite');
      const index = transaction.store.index(indexName);
      // clear 只清当前 formKey 下面的数据，不影响其他页面或其他 SearchForm。
      const keys = await index.getAllKeys(formKey);
      keys.forEach((key) => {
        transaction.store.delete(key);
      });
      await transaction.done;
    },
  };
}
