
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

import * as config from '../config/index.json';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class SecurityInterceptor implements NestInterceptor {
    constructor(
        private logger: LoggerService
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.switchToHttp().getRequest().headers["x-api-key"] !== config.auth.application["x-api-key"]) {
            this.logger.logAuthResult(false);
            throw new UnauthorizedException();
        }

        this.logger.logAuthResult(true);
        return next.handle();
    }
}