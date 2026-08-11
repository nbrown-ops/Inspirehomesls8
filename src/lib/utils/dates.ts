import { format, formatDistanceToNow, parseISO, differenceInYears } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const UK_TIMEZONE = 'Europe/London'

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const zoned = toZonedTime(d, UK_TIMEZONE)
  return format(zoned, pattern)
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm')
}

export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function calculateAge(dateOfBirth: string): number {
  return differenceInYears(new Date(), parseISO(dateOfBirth))
}
