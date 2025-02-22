import React from 'react';

import Icon from 'kit/Icon';
import { ansiToHtml, capitalize } from 'kit/internal/functions';
import { LogLevel } from 'kit/internal/types';
import { useTheme } from 'kit/Theme';
import Tooltip from 'kit/Tooltip';

import css from './LogViewerEntry.module.scss';

export interface LogEntry {
  formattedTime: string;
  level?: LogLevel;
  message: string; // Uses dangerouslySetInnerHTML, exercise extreme caution.
  htmlMessage?: boolean;
}

export interface Props extends LogEntry {
  noWrap?: boolean;
  style?: React.CSSProperties;
  timeStyle?: React.CSSProperties;
}

export const ICON_WIDTH = 26;

// Format the datetime to...
const DATETIME_PREFIX = '[';
const DATETIME_SUFFIX = ']';
export const DATETIME_FORMAT = `[${DATETIME_PREFIX}]YYYY-MM-DD HH:mm:ss${DATETIME_SUFFIX}`;

// Max datetime size: DATETIME_FORMAT (plus 1 for a space suffix)
export const MAX_DATETIME_LENGTH = 22;

const LogViewerEntry: React.FC<Props> = ({
  level = LogLevel.None,
  message,
  noWrap = false,
  formattedTime,
  style,
  htmlMessage,
}) => {
  const {
    themeSettings: { className: themeClass },
  } = useTheme();
  const classes = [css.base, themeClass];
  const levelClasses = [css.level, css[level]];
  const messageClasses = [css.message, css[level]];

  if (noWrap) classes.push(css.noWrap);

  return (
    <div className={classes.join(' ')} style={style} tabIndex={0}>
      <Tooltip content={`Level: ${capitalize(level)}`} placement="top">
        <div className={levelClasses.join(' ')}>
          <div className={css.levelLabel}>&lt;[{level}]&gt;</div>
          {level !== LogLevel.None && <Icon name={level} size="small" title={level} />}
        </div>
      </Tooltip>
      <div className={css.time}>{formattedTime}</div>
      <div
        className={messageClasses.join(' ')}
        dangerouslySetInnerHTML={{
          __html: htmlMessage
            ? message.replace(
                /(<|\u003c)script[\s\S]*(>|\u003e)[\s\S]*(<|\u003c)\/script(>|\u003e)/g,
                '?',
              )
            : ansiToHtml(message),
        }}
      />
    </div>
  );
};

export default LogViewerEntry;
