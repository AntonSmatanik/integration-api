import { Injectable } from '@nestjs/common';

import { DbService } from '../services/db.service';
import { OPTigerAPIService } from '../services/optigerapi.service';
import { PartnerAPIService } from '../services/partnerapi.service';
import { LoggerService } from '../services/logger.service';
import * as config from '../config/index.json';

@Injectable()
export class OrderService {
    constructor(
        private oPTigerAPI: OPTigerAPIService,
        private partnerAPI: PartnerAPIService,
        private logger: LoggerService,
        private db: DbService,
    ) { }

    processOrder = async (id: number, previousState: string) => {
        let actualState;

        try {
            const result = await this.oPTigerAPI.getOrderState(id);
            actualState = result.data["State"];
            this.logger.logAPIinfo("OP Tiger API", "Get Order", id, actualState);
        } catch (e) {
            this.logger.logAPIerror(e, "OP Tiger API", "Get Order");
            setTimeout(() => this.processOrder(id, previousState), config.orderCheckInterval);
            return;
        }

        if (previousState !== actualState) {
            if (actualState === config.ordersStates.final) {
                try {
                    await this.partnerAPI.patchOrderState(id, actualState);
                    this.logger.logAPIinfo("Partner API", "Patch Order", id, actualState);
                } catch (e) {
                    this.logger.logAPIerror(e, "Partner API", "Patch Order");
                    setTimeout(() => this.processOrder(id, previousState), config.orderCheckInterval);
                    return;
                }
            }

            try {
                await this.db.updateOrderById(id, actualState);
                this.logger.logDBinfo('Order updated', id, actualState);
            } catch (e) {
                this.logger.logDBerror(e);
                setTimeout(() => this.processOrder(id, previousState), config.orderCheckInterval);
                return;
            }
        }

        if (actualState !== config.ordersStates.final) {
            setTimeout(() => this.processOrder(id, actualState), config.orderCheckInterval);
        }
    }
}