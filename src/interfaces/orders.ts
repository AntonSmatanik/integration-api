export interface Product {
    productId: number,
    name: string,
    quantity: number,
    weight: number,
    eanCode: string
}

export interface Order {
    id: number,
    fullName: string,
    email: string,
    phone: string,
    addressLine1: string,
    addressLine2?: string,
    company?: string,
    zipCode: 13000,
    city: string,
    country: string,
    carrierKey: string,
    status: string,
    details: Array<Product>
}

export interface TransformedProduct {
    Barcode: string,
    OPTProductID: string,
    Qty: number
}

export interface TransformedDeliveryAddress {
    AddressLine1: string,
    AddressLine2: string,
    City: string,
    Company: string,
    CountryCode: string,
    Email: string,
    PersonName: string,
    Phone: string,
    State: string,
    Zip: string
}

export interface TransformedShipping {
    CarrierID: number,
    DeliveryAddress?: TransformedDeliveryAddress,
}

export interface TransformedOrder {
    OrderID: string,
    InvoiceSendLater: boolean,
    Issued: string,
    OrderType: string,
    Shipping?: TransformedShipping,
    Products?: Array<TransformedProduct>
}