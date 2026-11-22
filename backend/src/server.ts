// Entry point: connect to MongoDB, then start the HTTP server.
import app from './app';
import { connectDB } from './config/db';
import env from './config/env';

async function start() {
  try {
    await connectDB(env.mongoUri);
    app.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
  } catch (err) {
    console.error('Failed to start server:', (err as Error).message);
    process.exit(1);
  }
}

start();
