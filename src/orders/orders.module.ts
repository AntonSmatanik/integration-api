import { Module, HttpModule } from '@nestjs/common';

import { OrdersController } from './orders.controller';
import { OPTigerAPIService } from '../services/optigerapi.service';
import { PartnerAPIService } from '../services/partnerapi.service';
import { LoggerService } from '../services/logger.service';
import { OrderService } from '../services/order.service';
import { DbService } from '../services/db.service';

@Module({
  imports: [HttpModule],
  controllers: [OrdersController],
  providers: [DbService, OPTigerAPIService, PartnerAPIService, LoggerService, OrderService],
})
export class OrdersModule {}
