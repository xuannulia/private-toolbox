import { tool as xmlXmlValidator } from './xml-validator/meta';
import { tool as xmlXmlBeautifier } from './xml-beautifier/meta';
import { tool as xmlXmlMinifier } from './xml-minifier/meta';
import { tool as xmlXPathEvaluator } from './xpath-evaluator/meta';

export const xmlTools = [
  xmlXmlBeautifier,
  xmlXmlMinifier,
  xmlXmlValidator,
  xmlXPathEvaluator
];
