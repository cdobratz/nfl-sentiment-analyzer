import { injectable } from 'tsyringe';
import axios from 'axios';
import { Logger } from 'winston';

@injectable()
export class SentimentAnalyzer {
  private readonly ML_API_URL: string;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.ML_API_URL = process.env.ML_API_URL || 'http://ml-service:5000';
  }

  async analyze(text: string): Promise<number> {
    try {
      const response = await axios.post(`${this.ML_API_URL}/analyze`, { text });
      return response.data.sentiment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error analyzing sentiment:', errorMessage);
      throw error;
    }
  }

  async analyzeBatch(texts: string[]): Promise<number[]> {
    try {
      const response = await axios.post(`${this.ML_API_URL}/analyze-batch`, { texts });
      return response.data.sentiments;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error analyzing batch sentiment:', errorMessage);
      throw error;
    }
  }
}
