import {
  type JsonValue,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';
import {
  assertNetworkDataSourceEnabled,
  mergeNetworkToolConfig,
  type NetworkToolConfig
} from '../config.js';
import { networkConfigFromContext } from '../context.js';
import { fetchJsonLimited } from '../http.js';
import { assertPublicIpForLookup } from '../security.js';

export type IpLookupInput = {
  ip: string;
};

export type IpLookupOutput = {
  ip: string;
  source: string;
  data: JsonValue;
};

export const lookupIpPure = async (
  input: IpLookupInput,
  override?: Partial<NetworkToolConfig>
): Promise<IpLookupOutput> => {
  const config = mergeNetworkToolConfig(override);
  assertNetworkDataSourceEnabled('ippure', config);
  const ip = assertPublicIpForLookup(input.ip);
  const source = `${config.ipPureLookupBaseUrl.replace(
    /\/$/,
    ''
  )}/${encodeURIComponent(ip)}`;
  const response = await fetchJsonLimited(source, config);

  return {
    ip,
    source: response.url,
    data: response.data
  };
};

export const ipTools: ToolboxTool[] = [
  {
    name: 'ip.lookup',
    title: 'IP Information Lookup',
    description:
      'Lookup public IP information through the IPPure search endpoint captured from the IPPure web flow.',
    channels: ['api', 'mcp'],
    risks: ['network'],
    inputSchema: {
      type: 'object',
      required: ['ip'],
      additionalProperties: false,
      properties: {
        ip: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['ip', 'source', 'data'],
      properties: {
        ip: { type: 'string' },
        source: { type: 'string' },
        data: { type: 'object' }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await lookupIpPure(
            input as IpLookupInput,
            networkConfigFromContext(context)
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
