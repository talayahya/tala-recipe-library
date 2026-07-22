package com.nextclass.app.data

import com.nextclass.app.data.model.DaySchedule
import com.nextclass.app.data.model.Period
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime

/** Where the clock places us within a day's timetable. */
sealed interface DayStatus {
    /** Weekend or a day with no timetable. */
    data object NoSchedule : DayStatus

    /** Before the first period starts. */
    data class BeforeSchool(val next: Period) : DayStatus

    /** Inside a period right now. */
    data class InClass(val current: Period, val next: Period?) : DayStatus

    /** Between two periods (a gap not modeled as a BREAK block). */
    data class BetweenClasses(val previous: Period, val next: Period) : DayStatus

    /** After the last period has ended. */
    data object AfterSchool : DayStatus
}

/**
 * Pure schedule queries over the bundled [Schedule]. No Android dependencies so
 * it stays trivially testable. Callers pass in "now" for determinism.
 */
object ScheduleRepository {

    fun scheduleFor(day: DayOfWeek): DaySchedule? = Schedule.forDay(day)

    fun todaySchedule(today: LocalDate = LocalDate.now()): DaySchedule? =
        scheduleFor(today.dayOfWeek)

    /**
     * Compute the timetable status for [day] at wall-clock time [now]. Only
     * meaningful when [day] is the actual current weekday, but kept general so
     * the "today" screen and the day-switcher share one code path.
     */
    fun statusAt(day: DayOfWeek, now: LocalTime): DayStatus {
        val schedule = scheduleFor(day) ?: return DayStatus.NoSchedule
        val periods = schedule.periods
        if (periods.isEmpty()) return DayStatus.NoSchedule

        val current = periods.firstOrNull { !now.isBefore(it.start) && now.isBefore(it.end) }
        val next = periods.firstOrNull { it.start.isAfter(now) }

        return when {
            current != null -> DayStatus.InClass(current, next)
            next != null && periods.none { !now.isBefore(it.start) } ->
                DayStatus.BeforeSchool(next)
            next != null -> DayStatus.BetweenClasses(
                previous = periods.last { !it.end.isAfter(now) }, // end <= now
                next = next
            )
            else -> DayStatus.AfterSchool
        }
    }

    /**
     * Periods on [day] that still need an alarm relative to [now]: their start
     * time is strictly in the future. Used when arming alarms for today.
     */
    fun remainingPeriods(day: DayOfWeek, now: LocalTime): List<IndexedPeriod> {
        val schedule = scheduleFor(day) ?: return emptyList()
        return schedule.periods
            .mapIndexed { index, period -> IndexedPeriod(index, period) }
            .filter { it.period.start.isAfter(now) }
    }
}

/** A period paired with its stable index within the day, for alarm request codes. */
data class IndexedPeriod(val index: Int, val period: Period)
