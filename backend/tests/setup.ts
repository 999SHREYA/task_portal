// Runs before every test file: an in-memory MongoDB, wiped between tests.
import os from 'os';
import mongoose, { ConnectOptions } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;

// The first run downloads a MongoDB binary, so allow up to 2 minutes.
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  // The MongoDB driver loads Node's "os" module with a dynamic import(),
  // which Jest's CommonJS sandbox can't run. Without "os" the connection
  // handshake is rejected, so we hand the module to the driver directly.
  await mongoose.connect(mongo.getUri(), { runtimeAdapters: { os } } as ConnectOptions);
}, 120_000);

afterEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  jest.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
