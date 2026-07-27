import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import { parseTableData } from './data'
import type { TableStoredProps } from './props'

export const TableEditor: React.FC<ModuleComponentProps<TableStoredProps>> = ({
  props,
  mcClassName,
  nodeWrapperProps,
}) => {
  const table = parseTableData(props.columns, props.rows)

  return (
    <table {...nodeWrapperProps} className={mcClassName}>
      {props.caption ? <caption>{props.caption}</caption> : null}
      <thead>
        <tr>
          {table.columns.map((column, index) => (
            <th key={index} scope="col">{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) =>
              props.firstColumnHeader && cellIndex === 0
                ? <th key={cellIndex} scope="row">{cell}</th>
                : <td key={cellIndex}>{cell}</td>,
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
