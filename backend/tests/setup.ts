import 'reflect-metadata';
import { container } from 'tsyringe';
import { Logger } from 'winston';

// Mock winston logger
const mockLogger: Partial<Logger> = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Register mock logger
container.registerInstance('Logger', mockLogger as Logger);
