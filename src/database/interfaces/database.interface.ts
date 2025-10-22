import { User, Manager } from '../types/database.types';

export interface IDatabaseService {
  // User operations
  createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: number): Promise<User | null>;
  findUserByResetToken(token: string): Promise<User | null>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  resetUserPassword(id: number, hashedPassword: string): Promise<void>;
  deleteUser(id: number): Promise<void>;

  // Manager operations
  createManager(managerData: Omit<Manager, 'id' | 'created_at' | 'updated_at'>): Promise<Manager>;
  findManagerByTelegramId(telegramChatId: string): Promise<Manager | null>;
  getAllManagers(): Promise<Manager[]>;
  getUnprocessedUsers(): Promise<User[]>;
}
