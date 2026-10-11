import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_PATH = path.join(__dirname, '..', '.data', 'db');

let memoryServer = null;

const LOCAL_MONGO = 'mongodb://127.0.0.1:27017/pg_management_system';

async function tryConnect(uri, label) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
    console.log(`✅ MongoDB connected (${label})`);
    return true;
  } catch (error) {
    console.warn(`⚠️  Could not reach ${label}: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    return false;
  }
}

/**
 * Connect to MongoDB, in order:
 * 1. MONGODB_URI from .env (Atlas or any server)
 * 2. A MongoDB running locally on the default port
 * 3. An embedded MongoDB that persists to backend/.data/db, so the app
 *    always runs — even offline or when the cloud cluster is gone.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (process.env.USE_EMBEDDED_DB !== 'true') {
    if (uri && await tryConnect(uri, uri.startsWith('mongodb+srv') ? 'MongoDB Atlas' : uri.replace(/\/\/[^@]*@/, '//***@'))) return { mode: 'remote' };
    if (uri !== LOCAL_MONGO && await tryConnect(LOCAL_MONGO, 'local MongoDB')) return { mode: 'local' };
    console.warn('   Falling back to the built-in embedded database…');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  fs.mkdirSync(LOCAL_DB_PATH, { recursive: true });
  memoryServer = await MongoMemoryServer.create({
    instance: { dbPath: LOCAL_DB_PATH, storageEngine: 'wiredTiger', port: 27027 }
  });
  await mongoose.connect(memoryServer.getUri('pg_management_system'));
  console.log(`✅ Local MongoDB running (data saved in ${path.relative(process.cwd(), LOCAL_DB_PATH)})`);
  return { mode: 'local' };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop({ doCleanup: false });
}
