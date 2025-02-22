import DataEditor, {
  CellClickedEventArgs,
  CompactSelection,
  DataEditorProps,
  DataEditorRef,
  getMiddleCenterBias,
  GridCell,
  GridCellKind,
  GridColumn,
  GridMouseEventArgs,
  GridSelection,
  HeaderClickedEventArgs,
  Item,
  Rectangle,
  Theme,
} from '@glideapps/glide-data-grid';
import { DrawHeaderCallback } from '@glideapps/glide-data-grid/dist/dts/internal/data-grid/data-grid-types';
import * as io from 'io-ts';
import _ from 'lodash';
import { observable, useObservable } from 'micro-observables';
import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DropdownEvent, MenuItem } from 'kit/Dropdown';
import { type Theme as HewTheme, useTheme } from 'kit/Theme';
import useMobile from 'kit/useMobile';
import { Loadable } from 'kit/utils/loadable';

import { ColumnDef, MIN_COLUMN_WIDTH } from './columns';
import {
  ContextMenu,
  ContextMenuCompleteHandlerProps,
  ContextMenuComponentProps,
  ContextMenuProps,
} from './contextMenu';
import {
  customRenderers,
  drawArrow,
  drawTextWithEllipsis,
  getCheckboxDimensions,
  LinkCell,
  LOADING_CELL,
} from './custom-renderers';
import { drawTypeBadge } from './custom-renderers/utils';
import css from './DataGrid.module.scss';
import { getHeaderIcons } from './icons';
import { HeaderMenu, HeaderMenuProps } from './menu';
import { useTableTooltip } from './tooltip';
import '@glideapps/glide-data-grid/dist/index.css';

const directionType = io.keyof({ asc: null, desc: null });
export type DirectionType = io.TypeOf<typeof directionType>;

export const validSort = io.type({
  column: io.string,
  direction: directionType,
});
export type ValidSort = io.TypeOf<typeof validSort>;

const sort = io.partial(validSort.props);
export type Sort = io.TypeOf<typeof sort>;

/**
 * Glide Table Theme Reference
 * https://github.com/glideapps/glide-data-grid/blob/main/packages/core/API.md#theme
 */
export const getTheme = (appTheme: HewTheme): DataEditorProps['theme'] => {
  return {
    accentLight: appTheme.float,
    bgBubble: appTheme.ixStrong,
    bgCell: appTheme.surface,
    bgHeader: appTheme.surface,
    bgHeaderHovered: appTheme.surfaceStrong,
    borderColor: appTheme.ixBorder,
    fontFamily: appTheme.fontFamily,
    headerBottomBorderColor: appTheme.ixBorder,
    headerFontStyle: 'normal 12px',
    linkColor: appTheme.surfaceOn,
    textBubble: appTheme.surfaceBorderStrong,
    textDark: appTheme.surfaceOnWeak,
    textHeader: appTheme.surfaceOnWeak,
  };
};

export interface DataGridHandle {
  gridRef?: DataEditorRef;
  scrollToTop: () => void;
}

interface DataGridCommonProps<T, ContextAction = void | string, ContextActionData = void> {
  columns: ColumnDef<T>[];
  renderContextMenuComponent?: (
    props: ContextMenuComponentProps<T, ContextAction, ContextActionData>,
  ) => JSX.Element;
  data: Loadable<T>[];
  /** return a color value to use for each row */
  getRowAccentColor?: (rowData: T) => string;
  getHeaderMenuItems?: (columnId: string, colIdx: number) => MenuItem[];
  onHeaderClicked?: (columnId: string, colIdx: number) => void;
  height?: CSSProperties['height'];
  /** only display pinned columns */
  hideUnpinned?: boolean;
  onColumnResize?: (columnId: string, width: number) => void;
  onContextMenuComplete?: ContextMenuCompleteHandlerProps<ContextAction, ContextActionData>;
  onPinnedColumnsCountChange?: (count: number) => void;
  onSelectionChange?: HandleSelectionChangeType;
  onColumnsOrderChange?: (newColumnsOrder: string[]) => void;
  pinnedColumnsCount?: number;
  imperativeRef?: React.Ref<DataGridHandle>;
  rowHeight?: number;
  selection?: GridSelection;
  /** only used to draw correct arrow icon in header */
  sorts?: Sort[];
  /** always static columns, such as a checkbox column for row selection */
  staticColumns: string[];
  smoothScrollX?: boolean;
  smoothScrollY?: boolean;
}

interface Paginated {
  /** is displaying one page of results at a time, without infinite scroll */
  infiniteScroll?: false;
  total?: number;
  onPageUpdate?: (page: number) => void;
  page?: number;
  pageSize?: number;
}

interface InfiniteScroll {
  infiniteScroll?: true;
  /** total number of row items, for infinite scroll  */
  total: number;
  /** update page number, for infinite scroll */
  onPageUpdate: (page: number) => void;
  /** page number, for infinite scroll */
  page: number;
  /** pageSize, for infinite scroll */
  pageSize: number;
}

export type DataGridProps<
  T,
  ContextAction = void | string,
  ContextActionData = void,
> = DataGridCommonProps<T, ContextAction, ContextActionData> & (InfiniteScroll | Paginated);

export type RangelessSelectionType = 'add-all' | 'remove-all';
export type SelectionType = 'add' | 'remove' | 'set';
export interface HandleSelectionChangeType {
  (selectionType: RangelessSelectionType): void;
  (selectionType: SelectionType, range: [number, number]): void;
}

/**
 * Number of renders with gridRef.current !== null
 * needed for the table to be properly initialized.
 * We set the scroll position to the persisted page
 * this many times, and then consider the scroll position to be
 * 'set' for purposes of the `onScroll` in the parent component.
 * Otherwise `onScroll` would erroneously set the page to 0
 * when the table is first initialized.
 */
const SCROLL_SET_COUNT_NEEDED = 1;

const isLinkCell = (cell: GridCell): cell is LinkCell => {
  return !!(cell as LinkCell).data?.link?.href;
};

export function DataGrid<T, ContextAction = void | string, ContextActionData = void>({
  columns,
  data,
  getHeaderMenuItems,
  onHeaderClicked: onHeaderClickedAddl,
  getRowAccentColor,
  hideUnpinned = false,
  height = '100%',
  onColumnResize,
  onContextMenuComplete,
  onPinnedColumnsCountChange,
  onSelectionChange,
  onColumnsOrderChange,
  infiniteScroll = false,
  page,
  pageSize,
  onPageUpdate,
  pinnedColumnsCount = 0,
  renderContextMenuComponent,
  rowHeight = 36,
  selection = {
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  },
  total,
  imperativeRef,
  sorts = [],
  staticColumns,
  smoothScrollX = true,
  smoothScrollY = true,
}: DataGridProps<T, ContextAction, ContextActionData>): JSX.Element {
  const gridRef = useRef<DataEditorRef>(null);
  const clickedCellRef = useRef<{ col: number; row: number } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number>();
  const [scrollPositionSetCount] = useState(observable(0));

  const onScroll = useCallback(
    ({ y, height }: Rectangle) => {
      if (
        !infiniteScroll ||
        _.isUndefined(pageSize) ||
        scrollPositionSetCount.get() < SCROLL_SET_COUNT_NEEDED
      )
        return;
      onPageUpdate?.(Math.floor((y + height) / pageSize));
    },
    [scrollPositionSetCount, onPageUpdate, pageSize, infiniteScroll],
  );

  useEffect(() => {
    if (scrollPositionSetCount.get() >= SCROLL_SET_COUNT_NEEDED) return;
    if (gridRef.current !== null && !_.isUndefined(page) && !_.isUndefined(pageSize)) {
      const rowOffset = Math.max(page * pageSize, 0);
      const bounds = gridRef.current.getBounds(0, rowOffset);
      if (bounds && !Number.isNaN(bounds.x)) {
        gridRef.current.scrollTo(0, rowOffset);
        scrollPositionSetCount.update((x) => x + 1);
      }
    }
  });

  const [headerMenuIsOpen, setHeaderMenuIsOpen] = useState(false);
  const [headerMenuProps, setHeaderMenuProps] = useState<Omit<HeaderMenuProps, 'open'>>({
    bounds: {
      height: 0,
      width: 0,
      x: 0,
      y: 0,
    },
    handleClose: () => setHeaderMenuIsOpen(false),
  });

  const [contextMenuOpen] = useState(observable(false));
  const contextMenuIsOpen = useObservable(contextMenuOpen);

  const [contextMenuProps, setContextMenuProps] = useState<null | Omit<
    ContextMenuProps<T, ContextAction, ContextActionData>,
    'open'
  >>(null);

  const {
    getThemeVar,
    themeSettings: { theme: appTheme },
  } = useTheme();
  const theme = getTheme(appTheme);

  const isMobile = useMobile();

  const headerIcons = useMemo(() => getHeaderIcons(appTheme), [appTheme]);

  const { tooltip, onItemHovered, closeTooltip } = useTableTooltip<T>({
    columns,
    data,
  });

  const scrollToTop = useCallback(() => {
    gridRef.current?.scrollTo(0, 0);
  }, []);

  const getRowThemeOverride: DataEditorProps['getRowThemeOverride'] = React.useCallback(
    (row: number): Partial<Theme> | undefined => {
      // to put a border on the bottom row (actually the top of the row below it)
      if (row === data.length) return;

      // avoid showing 'empty rows' below data
      if (!data[row]) {
        return { borderColor: getThemeVar('surface') };
      }

      const hoverStyle: { accentLight?: string; bgCell?: string } = {};
      if (row === hoveredRow) {
        hoverStyle.bgCell = getThemeVar('surfaceStrong');
        if (selection.rows.toArray().includes(hoveredRow)) {
          hoverStyle.accentLight = getThemeVar('floatStrong');
        }
      }

      const rowColorTheme = Loadable.match(data[row], {
        _: () => ({}),
        Loaded: (record) => {
          const accentColor = getRowAccentColor?.(record);
          return accentColor ? { accentColor } : {};
        },
      });

      return { ...rowColorTheme, ...hoverStyle };
    },
    [getRowAccentColor, data, getThemeVar, hoveredRow, selection.rows],
  );

  const handleColumnResize: DataEditorProps['onColumnResize'] = useCallback(
    (column: GridColumn, width: number) => {
      const columnId = column.id;
      if (columnId === undefined) return;
      onColumnResize?.(columnId, width);
    },
    [onColumnResize],
  );

  const onHeaderClicked: DataEditorProps['onHeaderClicked'] = React.useCallback(
    (col: number, { bounds, preventDefault }: HeaderClickedEventArgs) => {
      preventDefault();
      const columnId = columns[col].id;
      onHeaderClickedAddl?.(columnId, col);
      const items = getHeaderMenuItems?.(columnId, col);
      if (items?.length) {
        setHeaderMenuProps((prev) => ({ ...prev, bounds, items, title: `${columnId} menu` }));
        setHeaderMenuIsOpen(true);
      }
    },
    [columns, getHeaderMenuItems, onHeaderClickedAddl],
  );

  const getCellContent: DataEditorProps['getCellContent'] = React.useCallback(
    (cell: Item): GridCell => {
      const [col, row] = cell;

      const loadingCell: GridCell = {
        allowOverlay: true,
        copyData: '',
        data: { appTheme, kind: LOADING_CELL },
        kind: GridCellKind.Custom,
        readonly: true,
      };

      if (!data[row]) {
        // When data length is changed, data[row] can be undefined
        return loadingCell;
      }

      return Loadable.match(data[row], {
        _: () => loadingCell,
        Loaded: (rowData) => {
          let cell: GridCell | undefined = columns[col]?.renderer?.(rowData, row);
          if (
            cell &&
            (cell.kind === GridCellKind.Text || cell.kind === GridCellKind.Number) &&
            !cell.displayData
          ) {
            cell = {
              ...cell,
              displayData: '-',
              themeOverride: {
                ...cell.themeOverride,
                textDark: getThemeVar('surfaceOnWeak'),
              },
            };
          }
          return cell || loadingCell;
        }, // TODO correctly handle error state
      });
    },
    [appTheme, data, columns, getThemeVar],
  );

  const onCellClicked: DataEditorProps['onCellClicked'] = useCallback(
    (cell: Item, event: CellClickedEventArgs) => {
      const [col, row] = cell;

      Loadable.forEach(data[row], (rowData) => {
        const cell = columns[col].renderer(rowData, row);

        if (isLinkCell(cell)) {
          cell.data.onClick?.(event);
        } else {
          if (event.shiftKey) {
            if (clickedCellRef.current !== null) {
              const previousRow = clickedCellRef.current.row;
              const selectionType = selection.rows.toArray().includes(row) ? 'remove' : 'add';
              const range: [number, number] =
                previousRow < row ? [previousRow, row + 1] : [row, previousRow + 1];
              onSelectionChange?.(selectionType, range);
            }
          } else {
            if (selection.rows.hasIndex(row)) {
              onSelectionChange?.('remove', [row, row + 1]);
            } else {
              onSelectionChange?.('add', [row, row + 1]);
            }
          }
          clickedCellRef.current = { col, row };
        }
      });
    },
    [data, columns, onSelectionChange, selection],
  );

  const onCellContextMenu: DataEditorProps['onCellContextMenu'] = useCallback(
    (cell: Item, event: CellClickedEventArgs) => {
      const [col, row] = cell;

      // Close existing context menu.
      contextMenuOpen.set(false);

      Loadable.forEach(data[row], (rowData) => {
        // Prevent the browser native context menu from showing up.
        event.preventDefault();

        // Delay needed due to the call to close previously existing context menu.
        setTimeout(() => {
          const cell = columns[col].renderer(rowData, row);

          // Update the context menu based on the cell context.
          setContextMenuProps({
            cell,
            link: isLinkCell(cell) ? cell.data.link.href : undefined,
            onClose: (e?: DropdownEvent | Event) => {
              // Prevent the context menu closing click from triggering something else.
              if (contextMenuOpen.get()) e?.stopPropagation();
              contextMenuOpen.set(false);
            },
            renderContextMenuComponent,
            rowData,
            x: Math.max(0, event.bounds.x + event.localEventX - 4),
            y: Math.max(0, event.bounds.y + event.localEventY - 4),
          });

          contextMenuOpen.set(true);
        }, 50);
      });
    },
    [columns, data, renderContextMenuComponent, setContextMenuProps, contextMenuOpen],
  );

  const onColumnMoved: DataEditorProps['onColumnMoved'] = useCallback(
    (columnIdsStartIdx: number, columnIdsEndIdx: number): void => {
      // Prevent the static columns from moving.
      if (columnIdsStartIdx < staticColumns.length) return;

      // Update the pinned column count based on where the column is sourced from and where it lands.
      const pinnedColumnEnd = staticColumns.length + pinnedColumnsCount;
      const isIntoPinned =
        columnIdsStartIdx >= pinnedColumnEnd && columnIdsEndIdx < pinnedColumnEnd;
      const isOutOfPinned =
        columnIdsStartIdx < pinnedColumnEnd && columnIdsEndIdx >= pinnedColumnEnd;
      if (isIntoPinned) onPinnedColumnsCountChange?.(pinnedColumnsCount + 1);
      if (isOutOfPinned) onPinnedColumnsCountChange?.(pinnedColumnsCount - 1);

      const columnsOrder = columns.flatMap((c) => {
        if (staticColumns.includes(c.id)) return [];
        return [c.id];
      });
      const columnsOrderStartIdx = columnIdsStartIdx - staticColumns.length;
      const columnsOrderEndIdx = Math.max(columnIdsEndIdx - staticColumns.length, 0);
      const newCols = [...columnsOrder];
      const [toMove] = newCols.splice(columnsOrderStartIdx, 1);
      newCols.splice(columnsOrderEndIdx, 0, toMove);
      onColumnsOrderChange?.(newCols);
    },
    [onPinnedColumnsCountChange, onColumnsOrderChange, pinnedColumnsCount, columns, staticColumns],
  );

  const onColumnHovered = useCallback(
    (args: GridMouseEventArgs) => {
      const [, row] = args.location;
      setHoveredRow(args.kind !== 'cell' ? undefined : row);
      onItemHovered?.(args);
    },
    [onItemHovered],
  );

  const verticalBorder: DataEditorProps['verticalBorder'] = useCallback(
    (col: number) => !hideUnpinned && col === staticColumns.length + pinnedColumnsCount,
    [hideUnpinned, pinnedColumnsCount, staticColumns.length],
  );

  const sortMap = useMemo(() => {
    return sorts.reduce(
      (acc, sort) => {
        if (sort.column && sort.direction) acc[sort.column] = sort.direction;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [sorts]);

  const drawHeader: DrawHeaderCallback = useCallback(
    ({ ctx, column, columnIndex, rect, theme, spriteManager }) => {
      const sortDirection = column.id && sortMap[column.id];
      if (sortDirection) {
        const arrowDirection = sortDirection === 'asc' ? 'up' : 'down';
        ctx.strokeStyle = theme.textLight;
        drawArrow(ctx, arrowDirection, rect.x + rect.width - 16, 12);
      }

      if (
        column.icon === 'allSelected' ||
        column.icon === 'noneSelected' ||
        column.icon === 'someSelected'
      ) {
        const checkbox = getCheckboxDimensions(rect.x, rect.y, rect.width, rect.height);
        spriteManager.drawSprite(
          column.icon,
          'normal',
          ctx,
          checkbox.x - 0.8,
          checkbox.y,
          checkbox.size,
          theme,
        );
      } else if (column.title) {
        const xPad = theme.cellHorizontalPadding;
        const font = `${theme.baseFontStyle} ${theme.fontFamily}`;
        const middleCenterBias = getMiddleCenterBias(ctx, font);
        const x = rect.x + xPad;
        const y = rect.y + rect.height / 2 + middleCenterBias;
        const maxWidth = rect.width - (sortDirection ? 12 : 0) - 2 * theme.cellHorizontalPadding;
        ctx.fillStyle = theme.textHeader;
        const textMetrics = drawTextWithEllipsis(ctx, column.title, x, y, maxWidth);
        const typeName = columns[columnIndex].type;
        if (typeName !== undefined) {
          drawTypeBadge(ctx, theme, typeName, x + textMetrics.width + 10, y);
        }
      }
    },
    [columns, sortMap],
  );

  useImperativeHandle(
    imperativeRef,
    () => {
      return {
        gridRef: gridRef.current ?? undefined,
        scrollToTop, // using gridRef.scrollTo directly adds an offset
      };
    },
    [gridRef, scrollToTop],
  );

  return (
    <div
      className={css.wrapper}
      onWheel={() => {
        contextMenuOpen.set(false);
        closeTooltip();
      }}>
      {tooltip}
      <div className={css.base}>
        <DataEditor
          className={hideUnpinned ? css.horizontalScrollDisabled : undefined}
          columns={columns}
          customRenderers={customRenderers}
          drawHeader={drawHeader}
          freezeColumns={isMobile ? 0 : staticColumns.length + pinnedColumnsCount}
          getCellContent={getCellContent}
          getCellsForSelection // `getCellsForSelection` is required for double click column resize to content.
          getRowThemeOverride={getRowThemeOverride}
          gridSelection={selection}
          headerHeight={rowHeight}
          headerIcons={headerIcons}
          height={height}
          minColumnWidth={MIN_COLUMN_WIDTH}
          ref={gridRef}
          rowHeight={rowHeight}
          rows={infiniteScroll ? total ?? pageSize ?? data.length : data.length}
          smoothScrollX={smoothScrollX}
          smoothScrollY={smoothScrollY}
          theme={theme}
          verticalBorder={verticalBorder}
          width="100%"
          onCellClicked={onCellClicked}
          onCellContextMenu={renderContextMenuComponent ? onCellContextMenu : undefined}
          onColumnMoved={onColumnsOrderChange ? onColumnMoved : undefined}
          onColumnResize={onColumnResize ? handleColumnResize : undefined}
          onHeaderClicked={onHeaderClicked}
          onHeaderContextMenu={onHeaderClicked} // right-click
          onItemHovered={onColumnHovered}
          onVisibleRegionChanged={onScroll}
        />
      </div>
      <HeaderMenu {...headerMenuProps} open={headerMenuIsOpen} />
      {contextMenuProps && (
        <ContextMenu<T, ContextAction, ContextActionData>
          {...contextMenuProps}
          open={contextMenuIsOpen}
          onComplete={onContextMenuComplete}
        />
      )}
    </div>
  );
}

export default DataGrid;
