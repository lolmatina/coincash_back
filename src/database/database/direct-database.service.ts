import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { IDatabaseService } from '../interfaces/database.interface';
import { User, Manager } from '../types/database.types';
import { Pool } from 'pg';

@Injectable()
export class DirectDatabaseService implements IDatabaseService, OnModuleInit {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      client.release();
      console.log('✅ Direct PostgreSQL connection established');
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  // User operations
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO users (
        name, lastname, email, password, profile_type, 
        email_verified_at, email_verification_code, email_verification_expires_at,
        document_front_url, document_back_url, document_selfie_url,
        documents_submitted_at, documents_verified_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      userData.name, userData.lastname, userData.email, userData.password, userData.profile_type,
      userData.email_verified_at, userData.email_verification_code, userData.email_verification_expires_at,
      userData.document_front_url, userData.document_back_url, userData.document_selfie_url,
      userData.documents_submitted_at, userData.documents_verified_at, now, now
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    
    try {
      const result = await this.pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  async findUserById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }
  
  async findUserByResetToken(token: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE password_reset_token = $1';
    
    try {
      const result = await this.pool.query(query, [token]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find user by reset token: ${error.message}`);
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    // Create dynamic update query
    const setValues = [];
    const values = [];
    let paramIndex = 1;
    
    console.log(`[DirectDatabaseService] Updating user ${id} with:`, JSON.stringify(updates, null, 2));
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        setValues.push(`${key} = $${paramIndex}`);
        values.push(value);
        
        // Debug log for password
        if (key === 'password' && typeof value === 'string') {
          console.log(`[DirectDatabaseService] Setting password hash: ${value.substring(0, 10)}...`);
        }
        
        paramIndex++;
      }
    }
    
    // Add updated_at
    setValues.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;
    
    // Add id for WHERE clause
    values.push(id);
    
    const query = `
      UPDATE users 
      SET ${setValues.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    console.log(`[DirectDatabaseService] Generated SQL: ${query}`);
    console.log(`[DirectDatabaseService] Parameter count: ${values.length}`);
    
    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error(`User with id ${id} not found`);
      }
      
      console.log(`[DirectDatabaseService] User updated successfully, returned ${result.rows.length} rows`);
      
      // Debug log for returned password
      if (updates.password) {
        console.log(`[DirectDatabaseService] Returned password hash: ${result.rows[0].password.substring(0, 10)}...`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`[DirectDatabaseService] Failed to update user:`, error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }
  
  async resetUserPassword(id: number, hashedPassword: string): Promise<void> {
    console.log(`[DirectDatabaseService] Directly resetting password for user ${id}`);
    console.log(`[DirectDatabaseService] Using password hash: ${hashedPassword.substring(0, 10)}...`);
    
    // Use a direct SQL query to ensure the password is set correctly
    const query = `
      UPDATE users 
      SET password = $1, updated_at = $2
      WHERE id = $3
    `;
    
    try {
      const result = await this.pool.query(query, [
        hashedPassword, 
        new Date().toISOString(), 
        id
      ]);
      
      if (result.rowCount === 0) {
        throw new Error(`User with id ${id} not found`);
      }
      
      console.log(`[DirectDatabaseService] Password reset successful for user ${id}`);
      
      // Verify the password was updated correctly
      const verifyQuery = `SELECT password FROM users WHERE id = $1`;
      const verifyResult = await this.pool.query(verifyQuery, [id]);
      
      if (verifyResult.rows.length > 0) {
        const storedHash = verifyResult.rows[0].password;
        console.log(`[DirectDatabaseService] Verified password hash in DB: ${storedHash.substring(0, 10)}...`);
        
        // Check if the hashes match
        const hashesMatch = storedHash === hashedPassword;
        console.log(`[DirectDatabaseService] Password hashes match: ${hashesMatch}`);
      }
    } catch (error) {
      console.error(`[DirectDatabaseService] Failed to reset password:`, error);
      throw new Error(`Failed to reset password: ${error.message}`);
    }
  }

  async deleteUser(id: number): Promise<void> {
    const query = 'DELETE FROM users WHERE id = $1';
    
    try {
      const result = await this.pool.query(query, [id]);
      if (result.rowCount === 0) {
        throw new Error(`User with id ${id} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Manager operations
  async createManager(managerData: Omit<Manager, 'id' | 'created_at' | 'updated_at'>): Promise<Manager> {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO managers (name, telegram_chat_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    try {
      const result = await this.pool.query(query, [managerData.name, managerData.telegram_chat_id, now, now]);
      return result.rows[0];
    } catch (error) {
      console.error('Direct DB createManager error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findManagerByTelegramId(telegramChatId: string): Promise<Manager | null> {
    const query = 'SELECT * FROM managers WHERE telegram_chat_id = $1';
    
    try {
      const result = await this.pool.query(query, [telegramChatId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Direct DB findManagerByTelegramId error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAllManagers(): Promise<Manager[]> {
    const query = 'SELECT * FROM managers';
    
    try {
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Direct DB getAllManagers error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getUnprocessedUsers(): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE documents_submitted_at IS NOT NULL 
      AND documents_verified_at IS NULL 
      ORDER BY documents_submitted_at ASC
    `;
    
    try {
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Direct DB getUnprocessedUsers error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getAllUsersWithDocuments(): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE documents_submitted_at IS NOT NULL
    `;
    
    try {
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Direct DB getAllUsersWithDocuments error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
