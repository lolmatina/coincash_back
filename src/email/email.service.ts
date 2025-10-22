import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const isSecure = port === 465; // Port 465 requires SSL/TLS
    
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: isSecure, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Additional options for better compatibility
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing SMTP connection...');
      await this.transporter.verify();
      console.log('✅ SMTP connection successful');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      return false;
    }
  }

  async generateSixDigitCode(): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000);
    return String(code);
  }

  async sendVerificationEmail(email: string, code: string, ttlMinutes: number): Promise<void> {
    try {
      console.log(`📧 Starting email send process for: ${email}`);
      console.log('SMTP Config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        secure: parseInt(process.env.SMTP_PORT) === 465
      });
      
      // Test connection first
      console.log('🔍 Testing SMTP connection...');
      const connectionTest = await this.testConnection();
      if (!connectionTest) {
        throw new Error('SMTP connection test failed');
      }
      
      console.log(`📤 Sending verification email to: ${email}`);
      const result = await this.transporter.sendMail({
        from: {
          name: 'CoinCash Platform',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Email Verification Code - CoinCash',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification - CoinCash</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">CoinCash Platform</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Email Verification</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Hello!</h2>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Thank you for registering with CoinCash. To complete your account setup, please verify your email address using the code below:
                </p>
                
                <!-- Verification Code -->
                <div style="background-color: #f8f9fa; border: 2px solid #f97316; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center;">
                  <p style="margin: 0; font-size: 36px; font-weight: bold; color: #f97316; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                    ${code}
                  </p>
                </div>
                
                <p style="color: #666666; font-size: 14px; text-align: center; margin: 20px 0;">
                  This code will expire in <strong>${ttlMinutes} minutes</strong>
                </p>
                
                <!-- Security Notice -->
                <div style="background-color: #e8f4fd; border-left: 4px solid #2196F3; padding: 20px; margin: 30px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #1976d2; font-size: 14px;">
                    <strong>Security Notice:</strong> If you did not request this verification code, please ignore this email. Your account remains secure.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
                  <p style="color: #888888; font-size: 14px; text-align: center; margin: 0;">
                    Best regards,<br>
                    <strong>CoinCash Support Team</strong><br>
                    <a href="mailto:support@coincash.biz.kg" style="color: #f97316; text-decoration: none;">support@coincash.biz.kg</a>
                  </p>
                </div>
              </div>
              
            </div>
          </body>
          </html>
        `,
        text: `
          CoinCash Platform - Email Verification
          
          Hello!
          
          Thank you for registering with CoinCash. To complete your account setup, please verify your email address using the code below:
          
          Verification Code: ${code}
          
          This code will expire in ${ttlMinutes} minutes.
          
          Security Notice: If you did not request this verification code, please ignore this email. Your account remains secure.
          
          Best regards,
          CoinCash Support Team
          support@coincash.biz.kg
        `,
        headers: {
          'X-Mailer': 'CoinCash Platform',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'List-Unsubscribe': '<mailto:unsubscribe@coincash.biz.kg>',
        }
      });
      
      console.log(`✅ Email sent successfully to ${email}:`, {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        code: code
      });
      
    } catch (error) {
      console.error(`❌ Failed to send verification email to ${email}:`, {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack
      });
      
      // Provide more specific error messages
      if (error.code === 'ECONNREFUSED') {
        throw new Error('SMTP connection refused - check server settings');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('SMTP connection timeout - server may be unavailable');
      } else if (error.code === 'EAUTH') {
        throw new Error('SMTP authentication failed - check credentials');
      } else if (error.responseCode === 535) {
        throw new Error('SMTP authentication failed - invalid credentials');
      } else if (error.responseCode === 550) {
        throw new Error('SMTP server rejected the email - check recipient address');
      } else {
        throw new Error(`Email sending failed: ${error.message}`);
      }
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

  /**
   * Send password reset email with token
   * @param email User's email address
   * @param token Reset token
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    this.logger.log(`Sending password reset email to: ${email}`);
    
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
    
    try {
      await this.transporter.sendMail({
        from: {
          name: 'CoinCash Platform',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Password Reset Request - CoinCash',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - CoinCash</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">CoinCash Platform</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Password Reset</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Password Reset Request</h2>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  We received a request to reset your password for your CoinCash account. To proceed with resetting your password, please click the button below:
                </p>
                
                <!-- Reset Button -->
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #666666; font-size: 14px; margin: 20px 0;">
                  If the button above doesn't work, you can also copy and paste the following link into your browser:
                </p>
                
                <div style="background-color: #f5f5f5; border: 1px solid #e0e0e0; padding: 15px; border-radius: 5px; word-break: break-all;">
                  <a href="${resetLink}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">
                    ${resetLink}
                  </a>
                </div>
                
                <p style="color: #666666; font-size: 14px; text-align: center; margin: 20px 0;">
                  This link will expire in <strong>15 minutes</strong>.
                </p>
                
                <!-- Security Notice -->
                <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #856404; font-size: 14px;">
                    <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or contact support immediately. Your account security is important to us.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
                  <p style="color: #888888; font-size: 14px; text-align: center; margin: 0;">
                    Best regards,<br>
                    <strong>CoinCash Support Team</strong><br>
                    <a href="mailto:support@coincash.biz.kg" style="color: #3b82f6; text-decoration: none;">support@coincash.biz.kg</a>
                  </p>
                </div>
              </div>
              
            </div>
          </body>
          </html>
        `,
        text: `
          CoinCash Platform - Password Reset
          
          Password Reset Request
          
          We received a request to reset your password for your CoinCash account. To proceed with resetting your password, please use the link below:
          
          ${resetLink}
          
          This link will expire in 15 minutes.
          
          Security Notice: If you did not request a password reset, please ignore this email or contact support immediately. Your account security is important to us.
          
          Best regards,
          CoinCash Support Team
          support@coincash.biz.kg
        `,
      });
      
      this.logger.log(`Password reset email sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  /**
   * Send password reset confirmation email
   * @param email User's email address
   */
  async sendPasswordResetConfirmationEmail(email: string): Promise<void> {
    this.logger.log(`Sending password reset confirmation email to: ${email}`);
    
    const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/signin`;
    
    try {
      await this.transporter.sendMail({
        from: {
          name: 'CoinCash Platform',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Password Reset Successful - CoinCash',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Successful - CoinCash</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">CoinCash Platform</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Password Reset Successful</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <span style="font-size: 60px; color: #10b981;">✓</span>
                </div>
                
                <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0; text-align: center;">Your Password Has Been Reset</h2>
                
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Your password for your CoinCash account has been successfully reset. You can now log in with your new password.
                </p>
                
                <!-- Login Button -->
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${loginLink}" style="background-color: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Log In to Your Account
                  </a>
                </div>
                
                <!-- Security Tips -->
                <div style="background-color: #e8f4fd; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
                  <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: bold;">
                    Security Tips:
                  </p>
                  <ul style="color: #1e3a8a; font-size: 14px; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Never share your password with anyone</li>
                    <li style="margin-bottom: 8px;">Use a unique password for your CoinCash account</li>
                    <li style="margin-bottom: 8px;">Consider changing your password regularly</li>
                    <li>Log out when using shared computers</li>
                  </ul>
                </div>
                
                <!-- Footer -->
                <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
                  <p style="color: #888888; font-size: 14px; text-align: center; margin: 0;">
                    If you did not request this password change, please contact our support team immediately.<br><br>
                    Best regards,<br>
                    <strong>CoinCash Support Team</strong><br>
                    <a href="mailto:support@coincash.biz.kg" style="color: #10b981; text-decoration: none;">support@coincash.biz.kg</a>
                  </p>
                </div>
              </div>
              
            </div>
          </body>
          </html>
        `,
        text: `
          CoinCash Platform - Password Reset Successful
          
          Your Password Has Been Reset
          
          Your password for your CoinCash account has been successfully reset. You can now log in with your new password.
          
          Log in to your account: ${loginLink}
          
          Security Tips:
          - Never share your password with anyone
          - Use a unique password for your CoinCash account
          - Consider changing your password regularly
          - Log out when using shared computers
          
          If you did not request this password change, please contact our support team immediately.
          
          Best regards,
          CoinCash Support Team
          support@coincash.biz.kg
        `,
      });
      
      this.logger.log(`Password reset confirmation email sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset confirmation email to ${email}:`, error);
      throw new Error(`Failed to send password reset confirmation email: ${error.message}`);
    }
  }
}


