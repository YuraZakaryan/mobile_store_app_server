export type TAuditContext = {
  meta: {
    type: string;
    href: string;
  };
  uid: string;
  moment: string;
};

export type TAuditEventData = {
  meta: Record<string, any>;
  action: string;
  accountId: string;
};

export type TAuditData = {
  auditContext: TAuditContext;
  events: TAuditEventData[];
};

export type AuditLogProps = {
  meta: {
    href: string;
    metadataHref: string;
    type: string;
    mediaType: string;
  };
  id: string;
  uid: string;
  source: string;
  moment: string;
  objectCount: number;
  eventType: string;
  entityType: string;
  events: {
    meta: {
      href: string;
      type: string;
      mediaType: string;
      size: number;
      limit: number;
      offset: number;
    };
  };
};

interface AuditEvent {
  source: string;
  eventType: string;
  entityType: string;
  uid: string;
  moment: string;
  name: string;
  audit: {
    meta: {
      href: string;
      type: string;
      mediaType: string;
    };
  };
  entity: {
    meta: {
      href: string;
      metadataHref: string;
      type: string;
      mediaType: string;
      uuidHref: string;
    };
  };
}

export interface AuditLogResponse {
  context: {
    employee: {
      meta: {
        href: string;
        metadataHref: string;
        type: string;
        mediaType: string;
      };
    };
  };
  meta: {
    href: string;
    type: string;
    mediaType: string;
    size: number;
    limit: number;
    offset: number;
  };
  rows: AuditEvent[];
}
export type ProductInfoProps = {
  id: 'string';
  name: 'string';
  code: 'string';
  externalCode: 'string';
  description: 'string';
  group: {
    id: 'string';
    name: 'string';
    description: 'string';
  };
  owner: {
    id: 'string';
    name: 'string';
    email: 'string';
  };
  shared: 'boolean';
  salePrices: {
    value: number;
    currency: 'string';
    priceType: 'string';
  }[];
  minPrice: {
    value: number;
    currency: 'string';
  };
  buyPrice: {
    value: number;
    currency: 'string';
  };
  barcode: 'string';
  paymentItemType: 'string';
  discountProhibited: 'boolean';
  weight: number;
  volume: number;
  isSerialTrackable: 'boolean';
  trackingType: 'string';
  images: {
    meta: {
      href: string;
      type: string;
      mediaType: string;
      size: number;
      limit: number;
      offset: number;
    };
  };
  stock: number;
  reserve: number;
  inTransit: number;
  quantity: number;
  files: {
    href: 'string';
  };
};
