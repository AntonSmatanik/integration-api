import { Injectable, HttpService } from '@nestjs/common';
import { AxiosResponse } from 'axios';

import * as config from '../config/index.json';

@Injectable()
export class PartnerAPIService {
  private headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': config.auth.partnerAPI["x-api-key"],
  };

  constructor(private httpService: HttpService) { }

  patchOrderState(id: number, state: string): Promise<AxiosResponse<any>> {
    const body = { state };
    const url = `${config.partnerAPI.baseURL}/orders/${id}`;
    return this.httpService.patch(url, body, { headers: this.headers }).toPromise();
  }
}
