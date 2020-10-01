import { Controller } from '@nestjs/common';

import { DbService } from '../services/db.service';
import { OrderService } from '../services/order.service';
import { LoggerService } from '../services/logger.service';

@Controller()
export class OrdersController {
    constructor(
        private orderService: OrderService,
        private logger: LoggerService,
        private db: DbService
    ) {
        this.processOrders();
    }

    processOrders = async () => {
        let orders;

        try {
            orders = await this.db.getUnprocessedOrders();
        } catch (e) {
            this.logger.logDBerror(e);
            return;
        }

        if (orders.length !== 0) {
            this.logger.logDBinfo('Unfinished Orders loaded for processing');
            orders.forEach(order => this.orderService.processOrder(order._id, order.state));
        } else {
            this.logger.logDBinfo('There are no unprocessed Orders');
        }
    }
}

