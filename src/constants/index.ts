import * as process from 'process';
import { IGenerateTokenPayload } from '../types';

const NODE_ENV: string = `.${process.env.NODE_ENV}.env`;
const PRIVATE_KEY_REFRESH: string = process.env.PRIVATE_KEY_REFRESH;
const EXPIRE_TIME_ACCESS: number = 259200; // 3 day
const EXPIRE_TIME_REFRESH: number = 7; // day

const SERVER_URL: string = 'https://mobiart.am';

const MAILER_USER: string = 'mobiartstore@gmail.com';
const MAILER_PASSWORD: string = 'bzlo sizv hmxs sxgp';

const payloadJwt = (payloadUser: IGenerateTokenPayload) => {
  return {
    sub: payloadUser._id,
    username: payloadUser.username,
    role: payloadUser.role,
  };
};
export {
  NODE_ENV,
  SERVER_URL,
  PRIVATE_KEY_REFRESH,
  EXPIRE_TIME_ACCESS,
  EXPIRE_TIME_REFRESH,
  MAILER_USER,
  MAILER_PASSWORD,
  payloadJwt,
};
