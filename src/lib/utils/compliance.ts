import { differenceInDays, parseISO, isAfter } from 'date-fns'

export type DbsStatus = 'valid' | 'expiring_soon' | 'expired' | 'missing'

export function getDbsStatus(expiryDate: string | null): DbsStatus {
  if (!expiryDate) return 'missing'
  const expiry = parseISO(expiryDate)
  const today  = new Date()
  if (!isAfter(expiry, today)) return 'expired'
  const daysLeft = differenceInDays(expiry, today)
  if (daysLeft <= 60)  return 'expiring_soon'
  return 'valid'
}

export function getDbsDaysLeft(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  return differenceInDays(parseISO(expiryDate), new Date())
}

export type TrainingStatus = 'valid' | 'expiring_soon' | 'expired' | 'missing'

export function getTrainingStatus(expiryDate: string | null): TrainingStatus {
  if (!expiryDate) return 'missing'
  const expiry = parseISO(expiryDate)
  const today  = new Date()
  if (!isAfter(expiry, today)) return 'expired'
  const daysLeft = differenceInDays(expiry, today)
  if (daysLeft <= 30) return 'expiring_soon'
  return 'valid'
}

export function supervisionWeeksAgo(lastDate: string | null): number | null {
  if (!lastDate) return null
  return Math.floor(differenceInDays(new Date(), parseISO(lastDate)) / 7)
}

export function isSupervisionDue(lastDate: string | null, thresholdWeeks = 8): boolean {
  if (!lastDate) return true
  const weeks = supervisionWeeksAgo(lastDate)
  return weeks === null || weeks >= thresholdWeeks
}
