import { decrypt } from '../crypto';
import { prisma } from '../prisma';

export abstract class BaseService {
  protected userId: string;
  protected provider: string;

  constructor(userId: string, provider: string) {
    this.userId = userId;
    this.provider = provider;
  }

  /**
   * Fetches the decrypted access token from the database
   */
  protected async getAccessToken(): Promise<string> {
    const connection = await prisma.connection.findUnique({
      where: {
        userId_provider: {
          userId: this.userId,
          provider: this.provider,
        },
      },
    });

    if (!connection || !connection.accessToken) {
      throw new Error(`No connection found for ${this.provider} for user ${this.userId}`);
    }

    // Decrypt the token before using it
    return decrypt(connection.accessToken);
  }

  /**
   * The main method to fetch and process data from the service
   * Must be implemented by each specific service
   */
  abstract fetchData(): Promise<any>;

  /**
   * Standard error handling for API calls
   */
  protected handleError(error: any): never {
    console.error(`Error in ${this.provider} service:`, error);
    throw new Error(`Failed to fetch data from ${this.provider}`);
  }
}
