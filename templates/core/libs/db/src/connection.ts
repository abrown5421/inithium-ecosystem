import mongoose from 'mongoose';

export interface DbConnectionOptions {
  uri?: string;
}

export const connectDatabase = async (options: DbConnectionOptions = {}): Promise<typeof mongoose> => {
  const uri = options.uri || process.env['MONGO_URI'];

  if (!uri) {
    throw new Error('Database connection failure: MONGO_URI is missing from environment variables.');
  }

  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  return await mongoose.connect(uri);
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};