import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';

type MonacoWorkerLabel =
  | 'css'
  | 'handlebars'
  | 'html'
  | 'javascript'
  | 'json'
  | 'less'
  | 'scss'
  | 'typescript';

type MonacoEnvironmentTarget = typeof globalThis & {
  MonacoEnvironment: {
    getWorker(workerId: string, label: MonacoWorkerLabel): Worker;
  };
};

(self as unknown as MonacoEnvironmentTarget).MonacoEnvironment = {
  getWorker(_workerId: string, label: MonacoWorkerLabel) {
    switch (label) {
      case 'json':
        return new JsonWorker();
      default:
        return new EditorWorker();
    }
  }
};

loader.config({ monaco });
