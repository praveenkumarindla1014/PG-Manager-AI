/**
 * Reset the database to fresh demo data:  npm run seed
 */
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/db.js';
import { seedDatabase } from './services/seedData.js';

dotenv.config();

try {
  await connectDB();
  await seedDatabase();
  console.log('🎉 Seed complete');
} catch (error) {
  console.error('❌ Seed error:', error);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
