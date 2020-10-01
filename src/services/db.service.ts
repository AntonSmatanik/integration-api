import { Injectable } from '@nestjs/common';
import { MongoClient } from 'mongodb';

import * as config from '../config/index.json';
import { TransformedOrder, TransformedShipping, TransformedDeliveryAddress, TransformedProduct } from '../interfaces/orders';

@Injectable()
export class DbService {
    private client;
    private db;

    constructor() {
        const url = `mongodb+srv://${config.dbServer.user}:${config.dbServer.pass}@${config.dbServer.host}`;
        this.client = new MongoClient(url, { useUnifiedTopology: true });
    }

    async initConnection() {
        if (!this.db) {
            await this.client.connect();
            this.db = this.client.db(config.dbServer.databases[0].name);
        }
    }

    updateOrderById(id: number, state: string) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.initConnection();

                const orderRow = { _id: id.toString() };
                const result = await this.db
                    .collection(config.dbServer.databases[0].schemas.orders)
                    .updateOne(orderRow, { $set: { state } });

                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    }

    getUnprocessedOrders(): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.initConnection();
                const result = await this.db
                    .collection(config.dbServer.databases[0].schemas.orders)
                    .find({ state: { $nin: [config.ordersStates.invalid, config.ordersStates.final] } }).toArray();

                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    }

    saveOrder(
        order: TransformedOrder,
        shipping: TransformedShipping,
        deliveryAddress: TransformedDeliveryAddress,
        products: Array<TransformedProduct>,
        orderState: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            await this.initConnection();
            const session = this.client.startSession();

            const transactionOptions = {
                readPreference: 'primary',
                readConcern: { level: 'local' },
                writeConcern: { w: 'majority' }
            };

            const orderRow = { _id: order.OrderID, state: orderState, ...order };
            const shippingRow = { order_id: order.OrderID, ...shipping };
            const deliveryAddressRow = { order_id: order.OrderID, ...deliveryAddress };
            const productsRow = products.map(product => ({ order_id: order.OrderID, ...product }));

            try {
                await session.withTransaction(async () => {
                    const ordersCollection = this.db.collection(config.dbServer.databases[0].schemas.orders);
                    const shippingsCollection = this.db.collection(config.dbServer.databases[0].schemas.shippings);
                    const deliveryAddressesCollection = this.db.collection(config.dbServer.databases[0].schemas.deliveryAddresses);
                    const productsCollection = this.db.collection(config.dbServer.databases[0].schemas.products);

                    await ordersCollection.insertOne(orderRow, { session });
                    await shippingsCollection.insertOne(shippingRow, { session });
                    await deliveryAddressesCollection.insertOne(deliveryAddressRow, { session });
                    await productsCollection.insertMany(productsRow, { session });
                }, transactionOptions);

                await session.endSession();
                resolve(true);
            } catch (err) {
                await session.endSession();
                reject(err);
            }
        });
    }
}
