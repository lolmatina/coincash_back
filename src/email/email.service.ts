import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async generateSixDigitCode(): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000);
    return String(code);
  }

  async sendVerificationEmail(email: string, code: string, ttlMinutes: number): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Код подтверждения email - CoinCash',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🔐 Подтверждение Email</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; color: #333;">Здравствуйте!</p>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Для завершения регистрации на платформе CoinCash введите следующий код подтверждения:
              </p>
              
              <div style="background: #fff3cd; border: 2px solid #f97316; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px;">
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 4px;">
                  ${code}
                </p>
              </div>
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                ⏰ Код действителен в течение <strong>${ttlMinutes} минут</strong>
              </p>
              
              <div style="background: #e8f4fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1976d2; font-size: 14px;">
                  ⚠️ Если вы не запрашивали подтверждение email, проигнорируйте это письмо.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                Спасибо за выбор CoinCash!<br>
                Если у вас возникли вопросы, свяжитесь с нашей службой поддержки.
              </p>
            </div>
          </div>
        `,
      });
      console.log(`📧 Код подтверждения отправлен на ${email}: код=${code}`);
    } catch (error) {
      console.error('❌ Ошибка отправки email подтверждения:', error);
      throw new Error('Не удалось отправить email подтверждения');
    }
  }

  async sendDocumentApprovalEmail(email: string, name: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Документы одобрены - CoinCash',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">✅ Документы одобрены!</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; color: #333;">Здравствуйте, <strong>${name}</strong>!</p>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Отличные новости! Ваши документы были успешно проверены и одобрены нашими модераторами.
              </p>
              
              <div style="background: #e8f5e8; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #2d5a2d; font-weight: bold;">
                  🎉 Теперь у вас есть полный доступ ко всем функциям платформы!
                </p>
              </div>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Вы можете войти в свой аккаунт и начать пользоваться всеми доступными услугами.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/signin" 
                   style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Войти в аккаунт
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                Спасибо за использование нашей платформы!<br>
                Если у вас есть вопросы, свяжитесь с нашей службой поддержки.
              </p>
            </div>
          </div>
        `,
      });
      console.log(`📧 Email об одобрении документов отправлен на ${email}`);
    } catch (error) {
      console.error('❌ Ошибка отправки email об одобрении документов:', error);
      throw new Error('Не удалось отправить email об одобрении документов');
    }
  }

  async sendDocumentDenialEmail(email: string, name: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Документы отклонены - CoinCash',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f44336, #d32f2f); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">❌ Документы отклонены</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; color: #333;">Здравствуйте, <strong>${name}</strong>!</p>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                К сожалению, ваши документы не прошли проверку модераторов.
              </p>
              
              <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #c62828; font-weight: bold;">
                  📋 Возможные причины отклонения:
                </p>
                <ul style="color: #c62828; margin: 10px 0 0 20px;">
                  <li>Нечеткое качество фотографий</li>
                  <li>Неполная информация в документах</li>
                  <li>Несоответствие требованиям</li>
                </ul>
              </div>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Пожалуйста, проверьте ваши документы и загрузите их повторно. Убедитесь, что:
              </p>
              
              <ul style="color: #333; line-height: 1.6;">
                <li>Фотографии четкие и хорошо освещены</li>
                <li>Все данные хорошо видны</li>
                <li>Документы действительны</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/signin" 
                   style="background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Загрузить документы заново
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                Если у вас есть вопросы о процессе верификации, свяжитесь с нашей службой поддержки.<br>
                Мы готовы помочь вам пройти верификацию успешно.
              </p>
            </div>
          </div>
        `,
      });
      console.log(`📧 Email об отклонении документов отправлен на ${email}`);
    } catch (error) {
      console.error('❌ Ошибка отправки email об отклонении документов:', error);
      throw new Error('Не удалось отправить email об отклонении документов');
    }
  }
}


