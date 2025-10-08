import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ManagerModule } from '../manager/manager.module';
import { TelegramController } from './telegram.controller';
import { UserModule } from '../user/user.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [forwardRef(() => ManagerModule), forwardRef(() => UserModule), EmailModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}


