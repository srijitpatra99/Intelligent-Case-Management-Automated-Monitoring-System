/*
Custom classs to implement a simple caching framework using the LRU approach
*/
class Cache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.usageList = [];
  }

  get(key) {
    if (this.cache && this.cache.has(key)) {
      // move the key to end of list
      this.updateUsageList(key);
      return this.cache.get(key);
    }
  }

  set(key, value) {
    // LRU Approach: If the cache size exceeds the max-size, remove the LRU key from cache
    if (this.cache && this.cache.size >= this.maxSize) {
      const leastUsedKey = this.usageList.shift();
      this.cache.delete(leastUsedKey);
    }
    this.cache.set(key, value);
    // move the key to end of list
    this.updateUsageList(key);
  }

  clear() {
    this.cache.clear();
    this.usageList = [];
  }

  updateUsageList(key) {
    // If the usageList contains the key already, then remove from the list
    const index = this.usageList.indexOf(key);
    this.usageList.splice(index, 1);

    // again push the key to the usageList, the udpate the access status to latest
    this.usageList.push(key);
  }
}

// Preventing the creation of new instances of this class - Singleton pattern
var cacheInstance = Object.freeze(new Cache());

export default cacheInstance;
