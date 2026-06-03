const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

export const toLocalDateString = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const pad = (n) => String(n).padStart(2, "0")

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const parseDateInputValue = (value) => {
  if (!value) return null
  if (value instanceof Date) return value

  const match = String(value).match(DATE_INPUT_PATTERN)

  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return new Date(value)
}

export const toDateInputValue = (value, options = {}) => {
  if (!value) return ""

  if (options.preferStoredDate && typeof value === "string") {
    const match = value.match(DATE_INPUT_PATTERN)
    if (match) return match[0]
  }

  return toLocalDateString(value)
}
