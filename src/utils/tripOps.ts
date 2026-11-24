import type { AppState, Expense, Trip } from '../types';
import { addDays } from './format';

export function dayDate(trip: Trip, index: number): Date {
  return addDays(trip.startDate, index);
}

export function tripEnd(trip: Trip): Date {
  return dayDate(trip, Math.max(0, trip.days.length - 1));
}

export function totalsByStop(expenses: Expense[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of expenses) if (e.stopId) m.set(e.stopId, (m.get(e.stopId) ?? 0) + e.inr);
  return m;
}

export function totalsByDay(expenses: Expense[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of expenses) if (e.dayId) m.set(e.dayId, (m.get(e.dayId) ?? 0) + e.inr);
  return m;
}

export function totalSpent(expenses: Expense[]): number {
  return expenses.reduce((a, e) => a + e.inr, 0);
}

export function dayIndexById(state: AppState, dayId: string | undefined): number {
  if (!dayId) return -1;
  return state.trip.days.findIndex((d) => d.id === dayId);
}
