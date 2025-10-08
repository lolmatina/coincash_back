import { Injectable } from '@nestjs/common';
import { SupabaseService, Manager } from '../database/supabase.service';

@Injectable()
export class ManagerService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async registerManager(chatId: string): Promise<Manager> {
      // Check if manager already exists
    const existingManager = await this.supabaseService.findManagerByTelegramId(chatId);
    if (existingManager) return existingManager;
    
    // Create new manager
    return this.supabaseService.createManager({
      name: 'Manager',
      telegram_chat_id: chatId,
    });
  }

  async getAllManagers(): Promise<Manager[]> {
    return this.supabaseService.getAllManagers();
  }
}


