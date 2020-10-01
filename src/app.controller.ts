import { UseInterceptors, Controller, Post, Body, Res } from '@nestjs/common';
import * as moment from 'moment';
import * as countries from 'country-list';
import * as Joi from 'joi';

import { Order, TransformedOrder, TransformedShipping, TransformedDeliveryAddress, TransformedProduct } from './interfaces/orders';
import { SecurityInterceptor } from './interceptors/security.interceptor';
import { DbService } from './services/db.service';
import { OPTigerAPIService } from './services/optigerapi.service';
import { PartnerAPIService } from './services/partnerapi.service';
import { LoggerService } from './services/logger.service';
import { OrderService } from './services/order.service';
import * as config from './config/index.json';

@UseInterceptors(SecurityInterceptor)
@Controller('api/orders')
export class AppController {
  constructor(
    private oPTigerAPI: OPTigerAPIService,
    private partnerAPI: PartnerAPIService,
    private logger: LoggerService,
    private db: DbService,
    private orderService: OrderService,
  ) { }

  getCarierCode(carrierKey: string): number {
    return config.carriers[carrierKey];
  }

  transformOrder(order: Order): TransformedOrder {
    return {
      OrderID: order.id.toString(),
      InvoiceSendLater: false,
      Issued: moment().toISOString(),
      OrderType: "standard",
    }
  }

  transformShipping(order: Order): TransformedShipping {
    return {
      CarrierID: this.getCarierCode(order.carrierKey),
    }
  };

  transformDeliveryAddress(order: Order): TransformedDeliveryAddress {
    return {
      AddressLine1: order.addressLine1,
      AddressLine2: order.addressLine2,
      City: order.city,
      Company: order.company,
      CountryCode: countries.getCode("Czechia"),
      Email: order.email,
      PersonName: order.fullName,
      Phone: order.phone,
      State: order.country,
      Zip: order.zipCode.toString()
    };
  }

  transformProduct(order: Order): Array<TransformedProduct> {
    return order.details.map(product => ({
      Barcode: product.eanCode,
      OPTProductID: product.eanCode,
      Qty: product.quantity,
    }));
  }

  isOderInvalid(order: Order) {
    const countryNames = Object.keys(countries.getNameList());
    const carrierKeys = Object.keys(config.carriers);

    const schema = Joi.object({
      id: Joi.number().required(),
      fullName: Joi.string().required(),
      email: Joi.string()
        .regex(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/)
        .required(),

      phone: Joi.string()
        .regex(/^[+]?[()/0-9. -]{9,}$/)
        .required(),

      addressLine1: Joi.string().required(),
      addressLine2: Joi.string().allow(null),
      company: Joi.string().allow(null),
      zipCode: Joi.string().required(),
      city: Joi.string().required(),
      country: Joi.string().valid(...countryNames).insensitive().required(),
      carrierKey: Joi.string().valid(...carrierKeys).required(),
      status: Joi.string().required(),
      details: Joi.array().items(Joi.object()
        .keys({
          productId: Joi.number().required(),
          name: Joi.string().required(),
          quantity: Joi.number().required(),
          weight: Joi.number().required(),
          eanCode: Joi.string().required(),
        })
      )
    });

    const { error } = schema.validate(order);
    return error;
  }

  @Post()
  async postOrder(@Body() order: Order, @Res() res): Promise<any> {
    let orderState = config.ordersStates.first;

    if (this.isOderInvalid(order)) {
      orderState = config.ordersStates.invalid;
    }

    const transformedOrder = this.transformOrder(order);
    const transformedShipping = this.transformShipping(order);
    const transformedDeliveryAddress = this.transformDeliveryAddress(order);
    const transformedProducts = this.transformProduct(order);

    try {
      await this.db.saveOrder(
        transformedOrder,
        transformedShipping,
        transformedDeliveryAddress,
        transformedProducts,
        orderState,
      );
      this.logger.logDBinfo('Order saved', order.id, orderState);
    } catch (e) {
      this.logger.logDBerror(e);
      res.status(500).send(e.message);
      return;
    }

    if (orderState === config.ordersStates.invalid) {
      try {
        await this.partnerAPI.patchOrderState(order.id, config.ordersStates.final);
        this.logger.logAPIinfo("Partner API", "Patch Order", order.id, config.ordersStates.final);
        res.status(200).send();
      } catch (e) {
        this.logger.logAPIerror(e, "Partner API", "Patch Order");
        res.status(500).send(e.message);
      } finally {
        return;
      }      
    }

    const completeOrder = {
      ...transformedOrder,
      Shipping: {
        ...transformedShipping,
        DeliveryAddress: transformedDeliveryAddress,
      },
      Products: transformedProducts,
    };

    let result;

    try {
      result = await this.oPTigerAPI.postOrder(completeOrder);
      this.logger.logAPIinfo("OP Tiger API", "Post Order", order.id, config.ordersStates.first);
    } catch (e) {
      this.logger.logAPIerror(e, "OP Tiger API", "Post Order");
      res.status(e.response.status).send(e.response.data);
      return;
    }

    setTimeout(() =>
      this.orderService.processOrder(order.id, config.ordersStates.first), config.orderCheckInterval
    );

    res.status(result.status).send(result.data);
  }
}
