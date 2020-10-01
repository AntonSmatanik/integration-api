import { Injectable, HttpService } from '@nestjs/common';
import { AxiosResponse } from 'axios';

import * as config from '../config/index.json';
import { TransformedOrder } from '../interfaces/orders';

@Injectable()
export class OPTigerAPIService {
  private headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic VGVzdFVzZXI6MkFzZjI3ZERWY3ZkOHNkMWRmU2Zk',
  };

  constructor(private httpService: HttpService) { }

  postOrder(order: TransformedOrder): Promise<AxiosResponse<any>> {
    const url = `${config.opTigerAPI.baseURL}/orders`;
    return this.httpService.post(url, order, { headers: this.headers }).toPromise();
  }

  getOrderState(id: number): Promise<AxiosResponse<any>> {
    const url = `${config.opTigerAPI.baseURL}/orders/${id}/state`;
    return this.httpService.get(url, { headers: this.headers }).toPromise();
  }
}
