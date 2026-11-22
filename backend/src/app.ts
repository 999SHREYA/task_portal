// Builds the Express app. It does NOT connect to the database or listen
// on a port, so tests can import it and drive it with Supertest.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';

import env from './config/env';
import { notFound, errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import openapiSpec from './docs/openapi';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true })); // credentials = allow cookies
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (!env.isTest) app.use(morgan('dev'));

// Health check for Docker / load balancers.
app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    db: dbConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

// Interactive API docs.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
