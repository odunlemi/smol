/* Simple in-memory Map used as a read-through cache
On a redirect hit, check here first before touching sqlite3
Entries are invalidated on expiry or deletion
*/

const store = new Map();

export const cache = {
  get(slug) {
    return store.get(slug) ?? null;
  },

  set(slug, link) {
    store.set(slug, link);
  },

  delete(slug) {
    store.delete(slug);
  },

  has(slug) {
    return store.has(slug);
  },
};
