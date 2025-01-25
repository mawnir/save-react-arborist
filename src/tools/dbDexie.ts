// db.ts
import { noteType } from './types';
import Dexie, { type EntityTable } from 'dexie';

const db_Dexie = new Dexie('NotesDB') as Dexie & {
    notes: EntityTable<noteType, 'id'>;
};

// Schema declaration:
db_Dexie.version(1).stores({
    notes: '++id, name, order, parentId', // primary key "id" (for the runtime!)
});

export { db_Dexie };