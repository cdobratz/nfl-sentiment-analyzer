export interface SentimentResponse {
  label: string;
  sentiment: {
    score: number;
    confidence: number;
  };
}

export interface ISentimentAnalyzer {
  analyze(text: string): Promise<SentimentResponse>;
}

export class SentimentAnalyzer implements ISentimentAnalyzer {
  private mlServiceUrl: string;

  constructor() {
    this.mlServiceUrl = process.env.ML_API_URL || 'http://localhost:8000';
  }

  async analyze(text: string): Promise<SentimentResponse> {
    try {
      const response = await fetch(`${this.mlServiceUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`ML service returned status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling ML service:', error);
      // Return neutral sentiment as fallback
      return {
        label: 'neutral',
        sentiment: {
          score: 0,
          confidence: 0.5
        }
      };
    }
  }
}
