import { array, boolean, literal, number, string, undefined as undefinedType, union } from 'io-ts';

import { LogLevelFromApi, SettingsConfig } from 'kit/internal/types';

export interface Settings {
  agentId?: string[];
  allocationId?: string[];
  containerId?: string[];
  level?: LogLevelFromApi[];
  rankId?: number[];
  searchText?: string;
  enableRegex?: boolean;
}

export const settingsConfigForTask = (taskId: string): SettingsConfig<Settings> =>
  settingsConfigForLogs(taskId);

export const settingsConfigForTrial = (id: number): SettingsConfig<Settings> =>
  settingsConfigForLogs(id);

const settingsConfigForLogs = (id: number | string): SettingsConfig<Settings> => ({
  settings: {
    agentId: {
      defaultValue: undefined,
      storageKey: 'agentId',
      type: union([undefinedType, array(string)]),
    },
    allocationId: {
      defaultValue: undefined,
      storageKey: 'allocationId',
      type: union([undefinedType, array(string)]),
    },
    containerId: {
      defaultValue: undefined,
      storageKey: 'containerId',
      type: union([undefinedType, array(string)]),
    },
    enableRegex: {
      defaultValue: undefined,
      storageKey: 'enableRegex',
      type: union([undefinedType, boolean]),
    },
    level: {
      defaultValue: undefined,
      storageKey: 'level',
      type: union([
        undefinedType,
        array(
          union([
            literal(LogLevelFromApi.Critical),
            literal(LogLevelFromApi.Debug),
            literal(LogLevelFromApi.Error),
            literal(LogLevelFromApi.Info),
            literal(LogLevelFromApi.Trace),
            literal(LogLevelFromApi.Unspecified),
            literal(LogLevelFromApi.Warning),
          ]),
        ),
      ]),
    },
    rankId: {
      defaultValue: undefined,
      storageKey: 'rankId',
      type: union([undefinedType, array(number)]),
    },
    searchText: {
      defaultValue: undefined,
      storageKey: 'searchText',
      type: union([undefinedType, string]),
    },
  },
  storagePath: `log-viewer-filters-${id}`,
});
