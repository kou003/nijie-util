const RingBuffer = class {
    #buf;
    #map;
    #cur;

    constructor(n=1, defaultFanc, beforeDelete) {
      this.#buf = new Array(n);
      this.#map = new Map();
      this.#cur = 0;
      this.defaultFanc = defaultFanc;
      this.beforeDelete = beforeDelete;
    }

    get(key) {
      if (this.#map.has(key)) {
        return this.#map.get(key);
      }
      if (typeof this.defaultFanc == 'function') {
        const value = this.defaultFanc(key);
        if (value instanceof Promise) {
          return value.then(v=>this.set(key, value)).then(()=>this.get(key));
        } else {
          this.set(key, value);
          return this.get(key);
        }
      }
      return;
    }

    set(key, value) {
      if (this.#map.has(key)) {
        this.#map.set(key, value);
        return;
      }
      const old = this.#buf[this.#cur];
      if (typeof this.beforeDelete == 'function') {
        const res = this.beforeDelete(old, this.get(old));
        if (res instanceof Promise) return res.then(()=>this.#overSet(key, value))
      }
      return this.#overSet(key, value);
    }

    #overSet(key, value) {
      const old = this.#buf[this.#cur];
      this.#map.delete(old);
      this.#buf[this.#cur] = key;
      this.#cur = (this.#cur + 1) % this.#buf.length;
      this.#map.set(key, value);
    }

    has(key) {
      return this.#map.has(key);
    }
    
  }