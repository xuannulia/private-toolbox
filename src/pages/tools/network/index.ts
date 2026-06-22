import { tool as dnsLookup } from './dns/meta';
import { tool as sslInspect } from './ssl/meta';
import { tool as ipLookup } from './ip-lookup/meta';
import { tool as httpRequest } from './http-request/meta';
import { tool as httpStatus } from './http-status/meta';
import { tool as cidrCalculator } from './cidr-calculator/meta';

export const networkTools = [
  httpRequest,
  httpStatus,
  cidrCalculator,
  dnsLookup,
  sslInspect,
  ipLookup
];
