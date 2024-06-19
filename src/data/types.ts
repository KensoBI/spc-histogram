import { Field } from '@grafana/data';

export type Characteristic = {
  table: {
    [field: string]: any;
  };
  timeseries?: {
    time: Field<any>;
    values: Field<any>;
  };
};

export type Feature = {
  uid: string;
  id: string;
  partId: string;
  refId: string;
  name: string;
  meta?: {
    calculationType?: string;
    [key: string]: any;
  };
  characteristics: {
    [characteristic: string]: Characteristic;
  };
};
