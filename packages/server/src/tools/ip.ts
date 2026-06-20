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
import { fetchJsonLimited, fetchTextLimited, parseJsonText } from '../http.js';
import { assertPublicIpForLookup } from '../security.js';

export type CurrentIpOutput = {
  source: string;
  contentType: string;
  data: JsonValue | null;
  text: string | null;
};

export type IpLookupInput = {
  ip: string;
};

export type IpLookupOutput = {
  ip: string;
  source: string;
  data: JsonValue;
};

export const getCurrentIpPureCard = async (
  override?: Partial<NetworkToolConfig>
): Promise<CurrentIpOutput> => {
  const config = mergeNetworkToolConfig(override);
  assertNetworkDataSourceEnabled('ippure', config);
  const response = await fetchTextLimited(config.ipPureCardUrl, config);
  let data: JsonValue | null = null;
  let text: string | null = response.text;

  try {
    data = parseJsonText(response.text);
    text = null;
  } catch {
    data = null;
  }

  return {
    source: response.url,
    contentType: response.contentType,
    data,
    text
  };
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
    name: 'ip.current',
    title: 'Current Public IP',
    description: 'Query IPPure current outbound IP card data.',
    channels: ['api', 'mcp'],
    risks: ['network'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    },
    outputSchema: {
      type: 'object',
      required: ['source', 'contentType', 'data', 'text'],
      properties: {
        source: { type: 'string' },
        contentType: { type: 'string' },
        data: { type: ['object', 'null'] },
        text: { type: ['string', 'null'] }
      }
    },
    execute: async (_input, context) => {
      try {
        return ok(
          await getCurrentIpPureCard(networkConfigFromContext(context))
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
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
