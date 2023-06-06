import { Popover as AntdPopover, Dropdown as AntDropdown } from 'antd';
import { MenuProps as AntdMenuProps } from 'antd/es/menu/menu';
import { PropsWithChildren, useMemo } from 'react';
import * as React from 'react';

import css from './Dropdown.module.scss';

export interface MenuDivider {
  type: 'divider';
}

export interface MenuOption {
  danger?: boolean;
  disabled?: boolean;
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface MenuOptionGroup {
  children: MenuItem[];
  label: React.ReactNode;
  type: 'group';
}

export type MenuItem = MenuDivider | MenuOption | MenuOptionGroup;

export type Placement = 'bottomLeft' | 'bottomRight';

export type DropdownEvent = React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>;

interface BaseProps {
  content?: React.ReactNode;
  disabled?: boolean;
  isContextMenu?: boolean;
  menu?: MenuItem[];
  open?: boolean;
  placement?: Placement;
  onClick?: (key: string, e: DropdownEvent) => void | Promise<void>;
}

type ContentProps = {
  content?: React.ReactNode;
  menu?: never;
  selectable?: never;
  selectedKeys?: never;
};

type MenuProps = {
  content?: never;
  menu?: MenuItem[];
  selectable?: boolean;
  selectedKeys?: string[];
};

export type Props = (ContentProps | MenuProps) & BaseProps;

const Dropdown: React.FC<PropsWithChildren<Props>> = ({
  children,
  content,
  disabled,
  isContextMenu,
  menu = [],
  open,
  placement = 'bottomLeft',
  onClick,
  selectable,
  selectedKeys,
}) => {
  const antdMenu: AntdMenuProps = useMemo(() => {
    return {
      items: menu,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        onClick?.(info.key, info.domEvent);
      },
      selectable,
      selectedKeys,
    };
  }, [menu, onClick, selectable, selectedKeys]);

  const renderedChildren = useMemo(() => {
    return (
      <div>
        {/* wrap in div to prevent antd from overwriting classes for child button element */}
        {children}
      </div>
    );
  }, [children]);

  /**
   * Using `dropdownRender` for Dropdown causes some issues with triggering the dropdown.
   * Instead, Popover is used when rendering content (as opposed to menu).
   */
  return content ? (
    <AntdPopover
      className={css.base}
      content={content}
      open={open}
      placement={placement}
      showArrow={false}
      trigger="click">
      {renderedChildren}
    </AntdPopover>
  ) : (
    <AntDropdown
      className={css.base}
      disabled={disabled}
      menu={antdMenu}
      open={open}
      placement={placement}
      trigger={[isContextMenu ? 'contextMenu' : 'click']}>
      {renderedChildren}
    </AntDropdown>
  );
};

export default Dropdown;
