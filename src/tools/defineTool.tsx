import ToolLayout from '../components/ToolLayout';
import React, { JSXElementConstructor, LazyExoticComponent } from 'react';
import { IconifyIcon } from '@iconify/react';
import type { FullI18nKey, I18nNamespaces } from '../i18n';
import { useTranslation } from 'react-i18next';
import { getDefaultToolProcessing, type ToolProcessing } from './processing';

export type UserType = 'generalUsers' | 'developers';

export interface ToolMeta {
  path: string;
  component: LazyExoticComponent<JSXElementConstructor<ToolComponentProps>>;
  keywords: string[];
  icon: IconifyIcon | string;
  processing?: ToolProcessing;
  i18n: {
    name: FullI18nKey;
    description: FullI18nKey;
    shortDescription: FullI18nKey;
    longDescription?: FullI18nKey;
    userTypes?: UserType[];
  };
}

export type ToolCategory =
  | 'string'
  | 'image-generic'
  | 'png'
  | 'number'
  | 'gif'
  | 'list'
  | 'json'
  | 'time'
  | 'csv'
  | 'video'
  | 'pdf'
  | 'audio'
  | 'xml'
  | 'converters'
  | 'network'
  | 'ops';

export interface DefinedTool {
  type: ToolCategory;
  path: string;
  name: FullI18nKey;
  description: FullI18nKey;
  shortDescription: FullI18nKey;
  icon: IconifyIcon | string;
  keywords: string[];
  processing: ToolProcessing;
  component: () => JSX.Element;
  userTypes?: UserType[];
}

export interface ToolComponentProps {
  title: string;
  longDescription?: string;
}

const getToolNamespaces = (category: ToolCategory): I18nNamespaces[] => {
  if (['png', 'image-generic'].includes(category)) {
    return ['translation', 'image'];
  }

  if (category === 'gif') {
    return ['translation', 'video'];
  }

  if (
    [
      'string',
      'number',
      'video',
      'list',
      'json',
      'time',
      'csv',
      'pdf',
      'audio',
      'xml',
      'converters',
      'network',
      'ops'
    ].includes(category)
  ) {
    return ['translation', category as I18nNamespaces];
  }

  return ['translation'];
};

export const defineTool = (
  basePath: ToolCategory,
  options: ToolMeta
): DefinedTool => {
  const { icon, path, keywords, component, i18n, processing } = options;
  const Component = component;
  const fullPath = `${basePath}/${path}`;
  const namespaces = getToolNamespaces(basePath);
  return {
    type: basePath,
    path: fullPath,
    name: i18n.name,
    icon,
    description: i18n.description,
    shortDescription: i18n.shortDescription,
    keywords,
    processing:
      processing ??
      getDefaultToolProcessing({
        category: basePath,
        path: fullPath
      }),
    userTypes: i18n.userTypes,
    component: function ToolComponent() {
      const { t } = useTranslation(namespaces);
      return (
        <ToolLayout type={basePath} i18n={i18n} fullPath={fullPath}>
          <Component
            title={t(i18n.name)}
            longDescription={
              i18n.longDescription ? t(i18n.longDescription) : undefined
            }
          />
        </ToolLayout>
      );
    }
  };
};
