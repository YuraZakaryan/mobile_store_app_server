export type TReturnItem<T> = {
  total_items: number;
  items: T;
};

export type TCounterParty = {
  id: string;
  name: string;
  code: string;
  externalCode: string;
  archived: boolean;
  created: string;
  companyType: string;
  legalTitle: string;
  phone: string;
};
