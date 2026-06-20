import { replaceText as replaceTextCore } from '@private-toolbox/core';
import { InitialValuesType } from './initialValues';

function isFieldsEmpty(textField: string, searchField: string) {
  return !textField.trim() || !searchField.trim();
}

export function replaceText(options: InitialValuesType, text: string) {
  const { searchValue, searchRegexp, replaceValue, mode } = options;

  switch (mode) {
    case 'text':
      if (isFieldsEmpty(text, searchValue)) return text;
      return replaceTextCore({
        text,
        search: searchValue,
        replacement: replaceValue,
        mode: 'literal'
      }).output;
    case 'regexp':
      if (isFieldsEmpty(text, searchRegexp)) return text;
      return replaceTextWithRegexp(text, searchRegexp, replaceValue);
  }
}

function replaceTextWithRegexp(
  text: string,
  searchRegexp: string,
  replaceValue: string
) {
  try {
    return replaceTextCore({
      text,
      search: searchRegexp,
      replacement: replaceValue,
      mode: 'regex'
    }).output;
  } catch (err) {
    return text;
  }
}
