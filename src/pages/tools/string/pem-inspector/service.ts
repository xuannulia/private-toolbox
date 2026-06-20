import {
  inspectPem,
  type PemInspectInput,
  type PemInspectOutput
} from '@private-toolbox/core';

export const examplePem = `-----BEGIN PUBLIC KEY-----
MCwwDQYJKoZIhvcNAQEBBQADGwAwGAIRAMVBE4mdqIr5XX60jxOT2T8CAwEAAQ==
-----END PUBLIC KEY-----`;

export const inspectPemForTool = async ({
  pem
}: PemInspectInput): Promise<PemInspectOutput | null> => {
  if (!pem.trim()) return null;
  return inspectPem({ pem });
};

export const createPemInspectionText = async (
  input: PemInspectInput
): Promise<string> => {
  const result = await inspectPemForTool(input);
  return result ? JSON.stringify(result, null, 2) : '';
};
