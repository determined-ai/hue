import React, { Children, useLayoutEffect, useMemo, useRef, useState } from 'react';

import useResize from './internal/useResize';
import css from './ResponsiveGroup.module.scss';
import { ShirtSize } from './Theme';

interface Props {
  children?: React.ReactNode;
  gap?: ShirtSize;
  maxVisible?: number;
  onChange?: (numberVisible: number) => void;
}

const gapMap = {
  [ShirtSize.Small]: 4,
  [ShirtSize.Medium]: 8,
  [ShirtSize.Large]: 16,
} as const;

function getPotentialWidth(el: HTMLElement | null) {
  if (!el) return 0;
  el.style.display = 'initial';
  const width = el.clientWidth;
  el.style.display = '';
  return width;
}

const ResponsiveGroup: React.FC<Props> = ({
  children,
  gap = ShirtSize.Medium,
  maxVisible = 3,
  onChange,
}: Props) => {
  const [, setNumVisible] = useState<number>();
  const childrenArray = useMemo(() => Children.toArray(children), [children]);
  const refs = useRef(new Array<HTMLDivElement | null>(childrenArray.length));
  const resizeRef = useRef<HTMLDivElement>(null);
  const resize = useResize(resizeRef);

  useLayoutEffect(() => {
    const { visible } = refs.current.reduce(
      (obj, el, i, arr) => {
        const newObj = structuredClone(obj);
        newObj.accumulatedWidth += getPotentialWidth(el);
        if (newObj.accumulatedWidth > resize.width) {
          if (el) el.style.display = 'none';
        } else {
          if (el) {
            el.style.display = 'initial';
            newObj.visible++;
          }
        }
        if (i !== arr.length - 1) newObj.accumulatedWidth += gapMap[gap];
        return newObj;
      },
      { accumulatedWidth: 0, visible: 0 },
    );
    setNumVisible((prev) => {
      if (prev !== visible) onChange?.(visible);
      return visible;
    });
  }, [childrenArray, gap, maxVisible, onChange, resize.width]);

  return (
    <div className={css.base} ref={resizeRef} style={{ gap: gapMap[gap] }}>
      {childrenArray.slice(0, maxVisible).map((child, idx) => (
        <div
          className={css.responsiveChild}
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}>
          {child}
        </div>
      ))}
    </div>
  );
};

export default ResponsiveGroup;
