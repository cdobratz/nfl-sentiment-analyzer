import 'reflect-metadata';
import { container } from 'tsyringe';
import express, { Request, Response } from 'express';
import { TwitterService } from './services/twitter.service';
import { DataIntegrationService } from './services/data-integration.service';
import { DataCollectionController } from './controllers/data-collection.controller';
import { createLogger, format, transports } from 'winston';

// Configure logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

// Register services
container.register('Logger', { useValue: logger });
container.register(TwitterService, { useClass: TwitterService });
container.register(DataIntegrationService, { useClass: DataIntegrationService });
container.register(DataCollectionController, { useClass: DataCollectionController });

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize controller
const controller = container.resolve(DataCollectionController);

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/game/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const gameData = await controller.collectGameData(gameId);
    res.json(gameData);
  } catch (error) {
    logger.error('Error fetching game data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/game/:gameId/refresh', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    await controller.refreshGameData(gameId);
    res.json({ status: 'success' });
  } catch (error) {
    logger.error('Error refreshing game data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
