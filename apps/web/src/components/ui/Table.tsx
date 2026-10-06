import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ className, children, ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-pharma bg-pharma-surface p-2 border border-pharma-muted/20">
      <table className={twMerge(clsx('w-full border-separate border-spacing-y-1.5', className))} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <thead className={twMerge(clsx('text-xs uppercase font-semibold text-pharma-muted select-none', className))} {...props}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return <tbody className={twMerge(clsx('', className))} {...props}>{children}</tbody>;
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <th
      className={twMerge(clsx('px-4 py-2 text-left font-semibold text-pharma-text/80 tracking-wider', className))}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => {
  // White rounded rows inside a pale-green panel
  return (
    <tr
      className={twMerge(
        clsx(
          'bg-pharma-white text-pharma-text text-sm transition-all duration-150',
          'shadow-sm hover:shadow-pharma-md hover:border-pharma-accent/40',
          'group',
          className
        )
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <td
      className={twMerge(
        clsx(
          'px-4 py-3 first:rounded-l-pharma last:rounded-r-pharma border-y first:border-l last:border-r border-pharma-muted/15',
          'group-hover:border-pharma-accent/30',
          className
        )
      )}
      {...props}
    >
      {children}
    </td>
  );
};
