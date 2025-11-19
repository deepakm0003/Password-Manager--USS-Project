import { createClient, type RedisClientType } from 'redis';

const REDIS_URL: string = process.env.REDIS_URL ?? 'redis://localhost:6379';

let redisClient: RedisClientType | null = null;

let connectionAttempted = false;
let connectionFailed = false;

export const initRedis = async (): Promise<RedisClientType | null> => {
  if (connectionAttempted) {
    return redisClient;
  }
  
  connectionAttempted = true;

  try {
    redisClient = createClient({ url: REDIS_URL });

    redisClient.on('error', (error: unknown) => {
      if (!connectionFailed) {
        connectionFailed = true;
        // Silently fail - Redis is optional, no need to spam logs
        redisClient = null;
      }
    });

    redisClient.on('connect', () => {
      if (connectionFailed) {
        connectionFailed = false;
      }
      console.log('✅ Redis connected');
    });

    // Set a timeout for connection
    const connectionPromise = redisClient.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 3000);
    });

    await Promise.race([connectionPromise, timeoutPromise]);
    return redisClient;
  } catch (error) {
    if (!connectionFailed) {
      connectionFailed = true;
      // Silently fail - Redis is optional, no need to spam logs
    }
    redisClient = null;
    return null;
  }
};

export const getRedisClient = (): RedisClientType | null => redisClient;

export const setRedis = async <T>(key: string, value: T, expirySeconds?: number | null): Promise<boolean> => {
  if (!redisClient) {
    return false;
  }

  try {
    const payload = JSON.stringify(value);
    if (typeof expirySeconds === 'number' && Number.isFinite(expirySeconds)) {
      await redisClient.setEx(key, expirySeconds, payload);
    } else {
      await redisClient.set(key, payload);
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Redis set error:', message);
    return false;
  }
};

export const getRedis = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) {
    return null;
  }

  try {
    const storedValue = await redisClient.get(key);
    if (storedValue === null) {
      return null;
    }
    return JSON.parse(storedValue) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Redis get error:', message);
    return null;
  }
};

export const deleteRedis = async (key: string): Promise<boolean> => {
  if (!redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Redis delete error:', message);
    return false;
  }
};

export const pushRedisList = async <T>(key: string, value: T): Promise<boolean> => {
  if (!redisClient) {
    return false;
  }

  try {
    await redisClient.rPush(key, JSON.stringify(value));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Redis list push error:', message);
    return false;
  }
};

export const getRedisList = async <T>(key: string): Promise<T[]> => {
  if (!redisClient) {
    return [];
  }

  try {
    const list = await redisClient.lRange(key, 0, -1);
    return list.map(item => JSON.parse(item) as T);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Redis list get error:', message);
    return [];
  }
};




