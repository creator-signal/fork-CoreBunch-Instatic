import type {
  ComponentLibraryField,
  ComponentLibraryRepeaterItemField,
} from '@core/component-library'
import { Button } from '@ui/components/Button'
import { Input } from '@ui/components/Input'
import { Select } from '@ui/components/Select'
import { Switch } from '@ui/components/Switch'
import styles from './ComponentPropertiesView.module.css'

type RepeaterField = Extract<ComponentLibraryField, { type: 'repeater' }>

interface RepeaterFieldControlProps {
  field: RepeaterField
  value: unknown
  disabled: boolean
  onChange: (value: Array<Record<string, unknown>>) => void
}

export function RepeaterFieldControl({
  field,
  value,
  disabled,
  onChange,
}: RepeaterFieldControlProps) {
  const items = repeaterItems(value)
  const atMaximum = field.maxItems !== undefined && items.length >= field.maxItems
  const atMinimum = items.length <= field.minItems

  function updateItem(index: number, key: string, next: unknown) {
    onChange(items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: next } : item,
    ))
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    onChange(next)
  }

  function removeItem(index: number) {
    if (atMinimum) return
    onChange(items.filter((_item, itemIndex) => itemIndex !== index))
  }

  return (
    <div className={styles.repeater}>
      <div className={styles.repeaterHeader}>
        <div>
          <span>{field.label}</span>
          <span>{items.length}{field.maxItems === undefined ? '' : ` / ${field.maxItems}`}</span>
        </div>
        <Button
          variant="secondary"
          size="xs"
          disabled={disabled || atMaximum}
          onClick={() => onChange([...items, newRepeaterItem(field)])}
        >
          Add {field.itemLabel.toLowerCase()}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>No {field.itemLabel.toLowerCase()}s added.</p>
      ) : (
        <div className={styles.repeaterItems}>
          {items.map((item, index) => (
            <fieldset key={index} className={styles.repeaterItem}>
              <legend>{field.itemLabel} {index + 1}</legend>
              {field.itemFields.map((itemField) => (
                <RepeaterItemControl
                  key={itemField.key}
                  field={itemField}
                  value={item[itemField.key]}
                  inputId={`${field.key}-${index}-${itemField.key}`}
                  disabled={disabled}
                  onChange={(next) => updateItem(index, itemField.key, next)}
                />
              ))}
              <div className={styles.repeaterActions}>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={disabled || index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  Move up
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  Move down
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={disabled || atMinimum}
                  onClick={() => removeItem(index)}
                >
                  Remove
                </Button>
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </div>
  )
}

function RepeaterItemControl({
  field,
  value,
  inputId,
  disabled,
  onChange,
}: {
  field: ComponentLibraryRepeaterItemField
  value: unknown
  inputId: string
  disabled: boolean
  onChange: (value: unknown) => void
}) {
  if (field.type === 'boolean') {
    return (
      <label className={styles.repeaterBoolean} htmlFor={inputId}>
        <span>{field.label}</span>
        <Switch
          id={inputId}
          checked={value === true}
          disabled={disabled}
          onCheckedChange={onChange}
          switchSize="sm"
        />
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <label className={styles.repeaterControl} htmlFor={inputId}>
        <span>{field.label}</span>
        <Select
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          fieldSize="sm"
          options={(field.options ?? []).map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    )
  }

  return (
    <label className={styles.repeaterControl} htmlFor={inputId}>
      <span>{field.label}</span>
      <Input
        id={inputId}
        type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'}
        value={field.type === 'number'
          ? (typeof value === 'number' && Number.isFinite(value) ? value : 0)
          : (typeof value === 'string' ? value : '')}
        disabled={disabled}
        fieldSize="sm"
        required={field.required}
        onChange={(event) => onChange(
          field.type === 'number' ? event.target.valueAsNumber : event.target.value,
        )}
      />
    </label>
  )
}

function repeaterItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? [{ ...(item as Record<string, unknown>) }]
      : [],
  )
}

function newRepeaterItem(field: RepeaterField): Record<string, unknown> {
  return Object.fromEntries(field.itemFields.map((itemField) => {
    if (itemField.type === 'boolean') return [itemField.key, false]
    if (itemField.type === 'number') return [itemField.key, 0]
    if (itemField.type === 'select') {
      return [itemField.key, itemField.options?.[0]?.value ?? '']
    }
    return [itemField.key, '']
  }))
}
