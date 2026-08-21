/**
 * db.js — IndexedDB wrapper for Be Better
 * All data stays local on the device.
 */

const DB_NAME    = 'be-better-db';
const DB_VERSION = 1;

let _db = null;

/** Open (or upgrade) the database */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Objectives store
      if (!db.objectStoreNames.contains('objectives')) {
        const objStore = db.createObjectStore('objectives', { keyPath: 'id' });
        objStore.createIndex('category', 'category', { unique: false });
      }

      // Check-ins store (individual period completions)
      if (!db.objectStoreNames.contains('checkins')) {
        const ciStore = db.createObjectStore('checkins', { keyPath: 'id' });
        ciStore.createIndex('objectiveId', 'objectiveId', { unique: false });
        ciStore.createIndex('periodKey',   'periodKey',   { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = ()  => reject(req.error);
  });
}

/** Generic helpers */
function tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

function promisify(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function getAll(storeName) {
  return promisify(tx(storeName).getAll());
}

function getOne(storeName, key) {
  return promisify(tx(storeName).get(key));
}

function put(storeName, value) {
  return promisify(tx(storeName, 'readwrite').put(value));
}

function del(storeName, key) {
  return promisify(tx(storeName, 'readwrite').delete(key));
}

function getByIndex(storeName, indexName, value) {
  return promisify(tx(storeName).index(indexName).getAll(value));
}

/* ---- Objectives ---- */
export const Objectives = {
  getAll: ()      => getAll('objectives'),
  get:    (id)    => getOne('objectives', id),
  save:   (obj)   => put('objectives', obj),
  delete: (id)    => del('objectives', id),
};

/* ---- Check-ins ---- */
export const Checkins = {
  getAll:       ()        => getAll('checkins'),
  get:          (id)      => getOne('checkins', id),
  save:         (ci)      => put('checkins', ci),
  delete:       (id)      => del('checkins', id),
  byObjective:  (objId)   => getByIndex('checkins', 'objectiveId', objId),
  byPeriodKey:  (key)     => getByIndex('checkins', 'periodKey',   key),
};

/* ---- Settings ---- */
export const Settings = {
  get:   (key, fallback = null) =>
    getOne('settings', key).then(r => r ? r.value : fallback),
  set:   (key, value) => put('settings', { key, value }),
};
