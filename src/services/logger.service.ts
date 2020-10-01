import * as bunyan from 'bunyan';
import { Injectable } from '@nestjs/common';

import * as config from '../config/index.json';

@Injectable()
export class LoggerService {
    private logger;

    constructor() {
        this.logger = bunyan.createLogger({
            name: config.logging.name
        });;
    }

    logAuthResult = (authorized: boolean) => this.logger.info({ source: "Auth", }, authorized ? 'Authorized' : 'Unauthorized');

    logDBinfo = (msg: string, orderID?: number, state?: string) => {
        if (orderID) {
            this.logger.info({
                source: "MongoDB",
                orderID,
                state,
            }, msg);
        } else {
            this.logger.info({
                source: "MongoDB",
            }, msg);
        }
    }

    logDBerror = (e: Error) => this.logger.error({ source: "MongoDB" }, e.message);

    logAPIinfo = (source: string, msg: string, orderID: number, state: string) => this.logger.info({ source, state, orderID }, msg);

    logAPIerror(e, source: string, msg: string) {
        this.logger.error({
            source,
            status: e.response.status,
            statusText: e.response.statusText,
            data: e.response.data,
            url: e.config.url,
        }, msg);
    }
}
