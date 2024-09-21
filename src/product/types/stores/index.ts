import { TSyncMeta } from '..';

export type TStore = {
  meta: TSyncMeta;
  id: string;
  name: string;
  pathName: string;
  code?: string;
  address?: string;
  externalCode?: string;
  count: number;
};

export type TStoreStock = {
  meta: TSyncMeta;
  name: string;
  stock: number;
  reserve: number;
  inTransit: number;
};

export type TProductStock = {
  meta: TSyncMeta;
  stockByStore: TStoreStock[];
};

export type TStoresResponse = {
  rows: TStore[];
};

export type TProductStocksResponse = {
  rows: TProductStock[];
};

export type TStoreWithStock = {
  id: string;
  name: string;
  pathName: string;
  code?: string;
  address?: string;
  externalCode?: string;
  count: number;
};
