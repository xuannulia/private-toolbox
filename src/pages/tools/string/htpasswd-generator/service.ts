import {
  generateHtpasswd,
  type HtpasswdGenerateInput,
  type HtpasswdScheme
} from '@private-toolbox/core';

export type HtpasswdGeneratorOptions = {
  username: string;
  password: string;
  scheme: HtpasswdScheme;
  salt: string;
};

export const createHtpasswdLine = async ({
  username,
  password,
  scheme,
  salt
}: HtpasswdGeneratorOptions): Promise<string> => {
  if (!username.trim() || !password) return '';

  const input: HtpasswdGenerateInput = {
    username,
    password,
    scheme
  };

  if (scheme === 'apr1' && salt.trim()) {
    input.salt = salt.trim();
  }

  return (await generateHtpasswd(input)).line;
};
