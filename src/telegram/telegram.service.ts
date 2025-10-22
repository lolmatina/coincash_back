import { Injectable, Inject, Optional } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import { ManagerService } from '../manager/manager.service';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { SupabaseService } from '../database/supabase.service';
import { DATABASE_SERVICE } from '../database/services.provider';
import { IDatabaseService } from '../database/interfaces/database.interface';

@Injectable()
export class TelegramService {
  private readonly botToken: string;

  constructor(
    private readonly managerService: ManagerService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly supabaseService: SupabaseService,
    @Inject(DATABASE_SERVICE) private readonly databaseService: IDatabaseService,
  ) {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  async handleUpdate(update: any): Promise<void> {
    if (!this.botToken) return;
    
    if (update.message && update.message.text) {
      const chatId = String(update.message.chat.id);
      const text: string = update.message.text.trim();
      
      // Handle authentication command (still needed for initial setup)
      if (text.startsWith('/auth')) {
        const parts = text.split(' ');
        const password = parts[1] || '';
        if (password && password === (process.env.MANAGER_PASSWORD || '')) {
          await this.managerService.registerManager(chatId);
          await this.sendMainMenu(chatId, '✅ Вы зарегистрированы как модератор.');
        } else {
          await this.sendMessage(chatId, '❌ Неверный пароль модератора.');
        }
      } 
      // Handle start command and show main menu
      else if (text === '/start' || text === '/help') {
        const managers = await this.managerService.getAllManagers();
        const isManager = managers.some(m => m.telegram_chat_id === chatId);
        
        if (isManager) {
          await this.sendMainMenu(chatId);
        } else {
          await this.sendMessage(chatId, 
            `🤖 **Бот верификации документов**\n\n` +
            `Сначала пройдите аутентификацию:\n` +
            `/auth <пароль>\n\n` +
            `После аутентификации вы получите доступ к интерфейсу с кнопками.`
          );
        }
      }
      // For any other text, show main menu if manager
      else {
        const managers = await this.managerService.getAllManagers();
        const isManager = managers.some(m => m.telegram_chat_id === chatId);
        
        if (isManager) {
          await this.sendMainMenu(chatId, 'Используйте кнопки ниже для навигации:');
        } else {
          await this.sendMessage(chatId, '❌ Вы не авторизованы. Сначала пройдите аутентификацию с помощью /auth <пароль>');
        }
      }
    } else if (update.callback_query) {
      const data: string = update.callback_query.data;
      const chatId = String(update.callback_query.message.chat.id);
      const messageId = update.callback_query.message.message_id;
      
      try {
        const parsed = JSON.parse(data);
        
        // Handle main menu actions
        if (parsed.type === 'show_pending') {
          await this.showPendingUsers(chatId, messageId);
        } else if (parsed.type === 'show_stats') {
          await this.showStats(chatId, messageId);
        } else if (parsed.type === 'back_to_menu') {
          await this.updateToMainMenu(chatId, messageId);
        } else if (parsed.type === 'refresh_pending') {
          await this.showPendingUsers(chatId, messageId, true);
        }
        // Handle user verification actions
        else if (parsed.type === 'approve' || parsed.type === 'deny') {
          const userId: number = parsed.userId;
          const userIndex = parsed.userIndex || 0;
          
          // Get user details for email notification
          const user = await this.userService.findOne(userId);
          
          if (parsed.type === 'approve') {
            await this.userService.update(userId, { documents_verified_at: new Date().toISOString() } as any);
            
            // Update the message to show approval status
            await this.editMessage(chatId, messageId, 
              `✅ **ОДОБРЕНО**\n\n` +
              `👤 **${user.name} ${user.lastname}**\n` +
              `📧 ${user.email}\n` +
              `⏰ Одобрено: ${new Date().toLocaleString('ru-RU')}`, 
              [[
                { text: '🔙 К ожидающим', callback_data: JSON.stringify({ type: 'refresh_pending' }) },
                { text: '🏠 Главное меню', callback_data: JSON.stringify({ type: 'back_to_menu' }) }
              ]]
            );
            
            // Send approval email to user
            try {
              await this.emailService.sendDocumentApprovalEmail(user.email, user.name);
              console.log(`📧 Email об одобрении отправлен на ${user.email}`);
            } catch (error) {
              console.error('❌ Ошибка отправки email об одобрении:', error);
            }
          } else if (parsed.type === 'deny') {
            await this.userService.update(userId, { 
              documents_verified_at: null,
            } as any);
            
            // Update the message to show denial status
            await this.editMessage(chatId, messageId, 
              `❌ **ОТКЛОНЕНО**\n\n` +
              `👤 **${user.name} ${user.lastname}**\n` +
              `📧 ${user.email}\n` +
              `⏰ Отклонено: ${new Date().toLocaleString('ru-RU')}`, 
              [[
                { text: '🔙 К ожидающим', callback_data: JSON.stringify({ type: 'refresh_pending' }) },
                { text: '🏠 Главное меню', callback_data: JSON.stringify({ type: 'back_to_menu' }) }
              ]]
            );
            
            // Send denial email to user
            try {
              await this.emailService.sendDocumentDenialEmail(user.email, user.name);
              console.log(`📧 Email об отклонении отправлен на ${user.email}`);
            } catch (error) {
              console.error('❌ Ошибка отправки email об отклонении:', error);
            }
          }
        }
        // Handle user detail view
        else if (parsed.type === 'view_user') {
          const userId = parsed.userId;
          await this.showUserDetails(chatId, messageId, userId);
        }
        // Handle pagination
        else if (parsed.type === 'page') {
          const page = parsed.page || 0;
          await this.showPendingUsers(chatId, messageId, true, page);
        }
        
        // Answer callback query to remove loading state
        await axios.post(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
          callback_query_id: update.callback_query.id
        });
        
      } catch (e) {
        console.error('Error parsing callback data:', e);
        await axios.post(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
          callback_query_id: update.callback_query.id,
          text: '❌ Ошибка обработки запроса'
        });
      }
    }
  }

  async sendDocumentSubmission(params: { email: string; name: string; frontPath: string; backPath: string; selfiePath: string; }): Promise<void> {
    if (!this.botToken) {
      console.log('Telegram bot not configured, skipping document submission:', params);
      return;
    }

    try {
      const managers = await this.managerService.getAllManagers();
      if (!managers.length) {
        console.log('No managers registered; skipping broadcast');
        return;
      }

      const userId = await this.resolveUserId(params.email);

      for (const manager of managers) {
        // Send notification message with quick action buttons
        await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
          chat_id: manager.telegram_chat_id,
          text: `🔔 **Новая подача документов**\n\n👤 **${params.name}**\n📧 ${params.email}\n⏰ ${new Date().toLocaleString('ru-RU')}`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { 
                  text: '👀 Просмотреть документы', 
                  callback_data: JSON.stringify({ 
                    type: 'view_user', 
                    userId: userId 
                  }) 
                },
              ],
              [
                { 
                  text: '✅ Быстрое одобрение', 
                  callback_data: JSON.stringify({ 
                    type: 'approve', 
                    userId: userId 
                  }) 
                },
                { 
                  text: '❌ Быстрое отклонение', 
                  callback_data: JSON.stringify({ 
                    type: 'deny', 
                    userId: userId 
                  }) 
                },
              ],
              [
                { 
                  text: '📋 Все ожидающие', 
                  callback_data: JSON.stringify({ 
                    type: 'show_pending' 
                  }) 
                }
              ]
            ],
          },
        });

        // Send documents individually (managers can still access them directly)
        // try {
        //   console.log('📎 Attempting to send documents:', {
        //     front: params.frontPath,
        //     back: params.backPath,
        //     selfie: params.selfiePath
        //   });
          
        //   await this.sendDocument(manager.telegram_chat_id, params.frontPath, 'passport_front.jpg');
        //   console.log('✅ Front document sent successfully');
          
        //   await this.sendDocument(manager.telegram_chat_id, params.backPath, 'passport_back.jpg');
        //   console.log('✅ Back document sent successfully');
          
        //   await this.sendDocument(manager.telegram_chat_id, params.selfiePath, 'selfie_with_passport.jpg');
        //   console.log('✅ Selfie document sent successfully');
          
        // } catch (docError) {
        //   console.error('❌ Failed to send documents to manager:', docError);
        //   console.error('Document paths:', {
        //     front: params.frontPath,
        //     back: params.backPath,
        //     selfie: params.selfiePath
        //   });
          
        //   // Send a follow-up message indicating document sending failed
        //   await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        //     chat_id: manager.telegram_chat_id,
        //     text: `⚠️ **Ошибка отправки документов**\n\nДокументы для ${params.name} не удалось отправить автоматически.\n\n📎 **Ссылки на документы:**\n` +
        //           `🔗 [Лицевая сторона](${params.frontPath})\n` +
        //           `🔗 [Обратная сторона](${params.backPath})\n` +
        //           `🔗 [Селфи с документом](${params.selfiePath})\n\n` +
        //           `Используйте кнопку "Просмотреть документы" выше для быстрого доступа.`,
        //     parse_mode: 'Markdown'
        //   });
        // }
      }

      console.log(`📧 Уведомление о подаче документов отправлено модераторам Telegram для пользователя: ${params.email}`);
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления о подаче документов в Telegram:', error);
      // Only throw if it's a critical error (like no managers or bot token issues)
      if (error.message.includes('bot token') || error.message.includes('No managers')) {
      throw new Error('Не удалось отправить уведомление о подаче документов модераторам');
      }
      // For other errors, log but don't throw to prevent blocking the user's submission
      console.log('Уведомление о подаче документов могло частично не отправиться, но подача пользователя была записана');
    }
  }

  private async resolveUserId(email: string): Promise<number> {
    const user = await this.userService.findByEmail(email);
    return user?.id;
  }

  private async sendMessage(chatId: string, text: string): Promise<void> {
    await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  }

  private async sendDocument(chatId: string, filePathOrUrl: string, filename: string): Promise<void> {
    try {
      console.log(`📤 Sending document: ${filename} from ${filePathOrUrl}`);
      
      const formData = new FormData();
      formData.append('chat_id', chatId);
      
      // Check if it's a URL or local file path
      if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
        console.log('🌐 Fetching file from URL:', filePathOrUrl);
        
        try {
          // It's a URL, fetch the file first
          const response = await axios.get(filePathOrUrl, { 
            responseType: 'stream',
            timeout: 30000, // 30 second timeout
            maxContentLength: 50 * 1024 * 1024, // 50MB max file size
          });
          
          console.log('📥 File fetched successfully, size:', response.headers['content-length']);
          formData.append('document', response.data, { filename });
          
        } catch (fetchError) {
          console.error('❌ Failed to fetch file from URL:', fetchError.message);
          throw new Error(`Failed to fetch file from URL: ${fetchError.message}`);
        }
      } else {
        // It's a local file path
        if (fs.existsSync(filePathOrUrl)) {
          console.log('📁 Reading local file:', filePathOrUrl);
          formData.append('document', fs.createReadStream(filePathOrUrl), { filename });
        } else {
          console.error(`❌ File not found: ${filePathOrUrl}`);
          throw new Error(`File not found: ${filePathOrUrl}`);
        }
      }
      
      console.log('📤 Sending document to Telegram...');
      await axios.post(`https://api.telegram.org/bot${this.botToken}/sendDocument`, formData, {
        headers: formData.getHeaders(),
        timeout: 60000, // 60 second timeout for upload
      });
      
      console.log('✅ Document sent successfully:', filename);
      
    } catch (error) {
      console.error(`❌ Error sending document ${filename}:`, error.message);
      
      // Provide more specific error messages
      if (error.message.includes('timeout')) {
        throw new Error(`Timeout sending document ${filename}: File too large or slow connection`);
      } else if (error.message.includes('413')) {
        throw new Error(`Document ${filename} too large for Telegram (max 50MB)`);
      } else if (error.message.includes('400')) {
        throw new Error(`Invalid document format for ${filename}`);
      } else {
        throw new Error(`Failed to send document ${filename}: ${error.message}`);
      }
    }
  }

  private async sendMainMenu(chatId: string, message?: string): Promise<void> {
    const text = message || '🤖 **Бот верификации документов**\n\nВыберите действие:';
    
    await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📋 Ожидающие верификации', callback_data: JSON.stringify({ type: 'show_pending' }) },
          ],
          [
            { text: '📊 Статистика', callback_data: JSON.stringify({ type: 'show_stats' }) },
          ]
        ],
      },
    });
  }

  private async updateToMainMenu(chatId: string, messageId: number): Promise<void> {
    const text = '🤖 **Бот верификации документов**\n\nВыберите действие:';
    
    await this.editMessage(chatId, messageId, text, [
      [
        { text: '📋 Ожидающие верификации', callback_data: JSON.stringify({ type: 'show_pending' }) },
      ],
      [
        { text: '📊 Статистика', callback_data: JSON.stringify({ type: 'show_stats' }) },
      ]
    ]);
  }

  private async showPendingUsers(chatId: string, messageId: number, isRefresh: boolean = false, page: number = 0): Promise<void> {
    try {
      const databaseType = process.env.DATABASE_TYPE || 'supabase';
      let unprocessedUsers;
      
      if (databaseType === 'supabase') {
        unprocessedUsers = await this.supabaseService.getUnprocessedUsers();
      } else {
        unprocessedUsers = await this.databaseService.getUnprocessedUsers();
      }
      
      if (unprocessedUsers.length === 0) {
        await this.editMessage(chatId, messageId, 
          '✅ **Нет ожидающих верификаций!**\n\nВсе документы обработаны.', 
          [[
            { text: '🔄 Обновить', callback_data: JSON.stringify({ type: 'refresh_pending' }) },
            { text: '🏠 Главное меню', callback_data: JSON.stringify({ type: 'back_to_menu' }) }
          ]]
        );
        return;
      }

      const itemsPerPage = 5;
      const totalPages = Math.ceil(unprocessedUsers.length / itemsPerPage);
      const startIndex = page * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, unprocessedUsers.length);
      const pageUsers = unprocessedUsers.slice(startIndex, endIndex);

      let text = `📋 **Ожидающие верификации**\n\n`;
      text += `📄 Всего: ${unprocessedUsers.length} пользователей\n`;
      text += `📅 Страница: ${page + 1}/${totalPages}\n\n`;
      
      const keyboard = [];
      
      // Add user buttons
      for (let i = 0; i < pageUsers.length; i++) {
        const user = pageUsers[i];
        const globalIndex = startIndex + i;
        const submittedDate = new Date(user.documents_submitted_at).toLocaleDateString('ru-RU');
        
        text += `${globalIndex + 1}. **${user.name} ${user.lastname}**\n`;
        text += `   📧 ${user.email}\n`;
        text += `   📅 ${submittedDate}\n\n`;
        
        keyboard.push([{
          text: `👤 ${globalIndex + 1}. ${user.name} ${user.lastname}`,
          callback_data: JSON.stringify({ 
            type: 'view_user', 
            userId: user.id,
            userIndex: globalIndex 
          })
        }]);
      }
      
      // Add pagination buttons if needed
      const paginationRow = [];
      if (page > 0) {
        paginationRow.push({
          text: '⬅️ Назад',
          callback_data: JSON.stringify({ type: 'page', page: page - 1 })
        });
      }
      if (page < totalPages - 1) {
        paginationRow.push({
          text: '➡️ Вперед',
          callback_data: JSON.stringify({ type: 'page', page: page + 1 })
        });
      }
      if (paginationRow.length > 0) {
        keyboard.push(paginationRow);
      }
      
      // Add control buttons
      keyboard.push([
        { text: '🔄 Обновить', callback_data: JSON.stringify({ type: 'refresh_pending' }) },
        { text: '🏠 Главное меню', callback_data: JSON.stringify({ type: 'back_to_menu' }) }
      ]);
      
      await this.editMessage(chatId, messageId, text, keyboard);
      
    } catch (error) {
      console.error('Error fetching pending users:', error);
      await this.editMessage(chatId, messageId, 
        '❌ **Ошибка**\n\nНе удалось загрузить ожидающих пользователей. Попробуйте еще раз.', 
        [[
          { text: '🔄 Повторить', callback_data: JSON.stringify({ type: 'refresh_pending' }) },
          { text: '🏠 Главное меню', callback_data: JSON.stringify({ type: 'back_to_menu' }) }
        ]]
      );
    }
  }

  private async showUserDetails(chatId: string, messageId: number, userId: number): Promise<void> {
    try {
      const user = await this.userService.findOne(userId);
      if (!user) {
        await this.editMessage(chatId, messageId, '❌ Пользователь не найден', [[{ 
          text: '🔙 Назад', 
          callback_data: JSON.stringify({ type: 'refresh_pending' }) 
        }]]);
        return;
      }

      const submittedDate = new Date(user.documents_submitted_at).toLocaleString('ru-RU');
      
      const text = `👤 **Детали пользователя**\n\n` +
                   `**Имя:** ${user.name} ${user.lastname}\n` +
                   `**Email:** ${user.email}\n` +
                   `**Подано:** ${submittedDate}\n\n` +
                   `📄 **Документы:**\n` +
                   `🔗 [Лицевая сторона](${user.document_front_url})\n` +
                   `🔗 [Обратная сторона](${user.document_back_url})\n` +
                   `🔗 [Селфи с документом](${user.document_selfie_url})`;

      const keyboard = [
        [
          { 
            text: '✅ Одобрить', 
            callback_data: JSON.stringify({ 
              type: 'approve', 
              userId: user.id
            }) 
          },
          { 
            text: '❌ Отклонить', 
            callback_data: JSON.stringify({ 
              type: 'deny', 
              userId: user.id
            }) 
          },
        ],
        [
          { text: '🔙 К списку', callback_data: JSON.stringify({ type: 'refresh_pending' }) },
          { text: '🏠 Главное меню', callback_data: JSON.stringify({ type: 'back_to_menu' }) }
        ]
      ];
      
      await this.editMessage(chatId, messageId, text, keyboard);
      
    } catch (error) {
      console.error('Error fetching user details:', error);
      await this.editMessage(chatId, messageId, '❌ Ошибка загрузки деталей пользователя', [[{ 
        text: '🔙 Назад', 
        callback_data: JSON.stringify({ type: 'refresh_pending' }) 
      }]]);
    }
  }

  private async showStats(chatId: string, messageId: number): Promise<void> {
    try {
      const databaseType = process.env.DATABASE_TYPE || 'supabase';
      let allUsers = [];
      let pendingUsers = [];
      
      if (databaseType === 'supabase') {
        // Get all users with submitted documents using Supabase client directly
        const supabaseClient = this.supabaseService.getClient();
        if (!supabaseClient) {
          throw new Error('Supabase client is not available');
        }
        
        const { data, error } = await supabaseClient
          .from('users')
          .select('*')
          .not('documents_submitted_at', 'is', null);
          
        if (error) {
          throw new Error(`Failed to fetch users: ${error.message}`);
        }
        
        allUsers = data;
        pendingUsers = await this.supabaseService.getUnprocessedUsers();
      } else {
        // Use database service interface for non-Supabase implementations
        // Use type assertion since we know the implementation has this method
        allUsers = await (this.databaseService as any).getAllUsersWithDocuments();
        pendingUsers = await this.databaseService.getUnprocessedUsers();
      }
      
      const approvedUsers = allUsers.filter(u => u.documents_verified_at !== null);
      const deniedUsers = allUsers.filter(u => u.documents_verified_at === null && u.documents_submitted_at !== null);
      
      const text = `📊 **Статистика**\n\n` +
                   `📄 **Всего подач:** ${allUsers.length}\n` +
                   `⏳ **Ожидают:** ${pendingUsers.length}\n` +
                   `✅ **Одобрены:** ${approvedUsers.length}\n` +
                   `❌ **Отклонены:** ${deniedUsers.length}\n\n` +
                   `📅 **Последнее обновление:** ${new Date().toLocaleString('ru-RU')}`;
      
      await this.editMessage(chatId, messageId, text, [
        [
          { text: '🔄 Обновить', callback_data: JSON.stringify({ type: 'show_stats' }) },
          { text: '🏠 Главное меню', callback_data: JSON.stringify({ type: 'back_to_menu' }) }
        ]
      ]);
      
    } catch (error) {
      console.error('Error fetching statistics:', error);
      await this.editMessage(chatId, messageId, '❌ Ошибка загрузки статистики', [[{ 
        text: '🏠 Главное меню', 
        callback_data: JSON.stringify({ type: 'back_to_menu' }) 
      }]]);
    }
  }

  private async editMessage(chatId: string, messageId: number, text: string, keyboard: any[][] = []): Promise<void> {
    try {
      await axios.post(`https://api.telegram.org/bot${this.botToken}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } catch (error) {
      // If edit fails (e.g., message is too old), send a new message
      console.log('Failed to edit message, sending new one:', error.response?.data?.description);
      await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    }
  }
}


