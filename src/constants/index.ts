import * as process from 'process';
import { IGenerateTokenPayload } from '../types';

const NODE_ENV = `.${process.env.NODE_ENV}.env`;
const PRIVATE_KEY_ACCESS = process.env.PRIVATE_KEY_ACCESS;
const PRIVATE_KEY_REFRESH = process.env.PRIVATE_KEY_REFRESH;
const EXPIRE_TIME_ACCESS: number = 20; // seconds
const EXPIRE_TIME_REFRESH: number = 7; // day

const payloadJwt = (payloadUser: IGenerateTokenPayload) => {
  return {
    sub: payloadUser._id,
    username: payloadUser.username,
    role: payloadUser.role,
  };
};
export {
  NODE_ENV,
  PRIVATE_KEY_ACCESS,
  PRIVATE_KEY_REFRESH,
  EXPIRE_TIME_ACCESS,
  EXPIRE_TIME_REFRESH,
  payloadJwt,
};
