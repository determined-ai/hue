import { Tabs, TabsProps } from 'antd';
import React, { KeyboardEvent, MouseEvent, ReactNode } from 'react';

import { useTheme } from 'kit/internal/Theme/theme';

import css from './Pivot.module.scss';

export type TabItem = {
  children?: ReactNode;
  forceRender?: boolean;
  key: string;
  label: ReactNode;
};

export type PivotTabType = 'primary' | 'secondary';

interface PivotProps {
  activeKey?: string;
  defaultActiveKey?: string;
  destroyInactiveTabPane?: boolean;
  items?: TabItem[];
  onChange?: (activeKey: string) => void;
  onTabClick?: (key: string, event: MouseEvent | KeyboardEvent) => void;
  tabBarExtraContent?: ReactNode;
  type?: PivotTabType;
}

const convertTabType = (type: PivotTabType): TabsProps['type'] => {
  switch (type) {
    case 'primary':
      return 'line';
    case 'secondary':
      return 'card';
    default:
      return 'line';
  }
};

const Pivot: React.FC<PivotProps> = ({ type = 'primary', ...props }: PivotProps) => {
  const { themeSettings: { className: themeClass } } = useTheme();
  const tabType = convertTabType(type);
  const classes = [themeClass, css.base];
  return <Tabs className={classes.join(' ')} type={tabType} {...props} />;
};

export default Pivot;
