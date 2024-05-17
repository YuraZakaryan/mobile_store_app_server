export type TSyncMeta = {
  href: string;
  metadataHref: string;
  type: string;
  mediaType: string;
  uuidHref: string;
};

export type TSyncOwner = {
  meta: TSyncMeta;
};

export type TSyncGroup = {
  meta: TSyncMeta;
};

export type TSyncCurrency = {
  meta: TSyncMeta;
};

export type TSyncPrice = {
  meta: TSyncMeta;
  id: string;
  name: string;
  externalCode: string;
};

export type TSyncSalePrice = {
  value: number;
  currency: TSyncCurrency;
  priceType: TSyncPrice;
};

export type TSyncBarcode = {
  ean13: string;
};

export type TSyncUom = {
  meta: TSyncMeta;
};

export type TSyncImage = {
  meta: TSyncMeta;
  type: string;
  mediaType: string;
  size: number;
  limit: number;
  offset: number;
};

export type TSyncFile = {
  meta: TSyncMeta;
  type: string;
  mediaType: string;
  size: number;
  limit: number;
  offset: number;
};

export type TSyncProduct = {
  meta: TSyncMeta;
  id: string;
  accountId: string;
  owner: TSyncOwner;
  shared: boolean;
  group: TSyncGroup;
  updated: string;
  name: string;
  description: string;
  code: string;
  externalCode: string;
  archived: boolean;
  pathName: string;
  useParentVat: boolean;
  uom: TSyncUom;
  images: TSyncImage[];
  minPrice: {
    value: number;
    currency: TSyncCurrency;
  };
  salePrices: TSyncSalePrice[];
  buyPrice: {
    value: number;
    currency: TSyncCurrency;
  };
  barcodes: TSyncBarcode[];
  paymentItemType: string;
  discountProhibited: boolean;
  weight: number;
  volume: number;
  variantsCount: number;
  isSerialTrackable: boolean;
  trackingType: string;
  files: TSyncFile[];
  stock: number;
  reserve: number;
  inTransit: number;
  quantity: number;
};

export type TProductResponse = {
  rows: TSyncProduct[];
};
