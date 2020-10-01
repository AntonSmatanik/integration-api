import { Module, HttpModule } from '@nestjs/common';

import { AppController } from './app.controller';
import { OrdersModule } from './orders/orders.module';
import { OPTigerAPIService } from './services/optigerapi.service';
import { PartnerAPIService } from './services/partnerapi.service';
import { LoggerService } from './services/logger.service';
import { OrderService } from './services/order.service';
import { DbService } from './services/db.service';

@Module({
  imports: [HttpModule, OrdersModule],
  controllers: [AppController],
  providers: [DbService, OPTigerAPIService, PartnerAPIService, LoggerService, OrderService],
})
export class AppModule {}
