package com.nextclass.app.data.model

import java.time.DayOfWeek
import java.time.LocalTime

/** The pedagogical kind of a period, used for styling and notification rules. */
enum class PeriodType { CORE, ELECTIVE, BREAK, HOMEROOM }

/** How the day is delivered. Drives the mode badge color. */
enum class LearningMode { ONLINE, FACE_TO_FACE, HYBRID }

/** A single block in a day's timetable. Times are wall-clock, 24h. */
data class Period(
    val start: LocalTime,
    val end: LocalTime,
    val subject: String,
    val type: PeriodType
) {
    val isBreak: Boolean get() = type == PeriodType.BREAK
    val isHomeroom: Boolean get() = type == PeriodType.HOMEROOM
    /** BREAK and HOMEROOM are "soft" blocks, not graded subjects. */
    val isSoft: Boolean get() = isBreak || isHomeroom
    val durationMinutes: Long get() = java.time.Duration.between(start, end).toMinutes()
}

/**
 * A full weekday timetable. Each day carries its own start/end times exactly as
 * provided by the school — there is intentionally no shared time grid.
 */
data class DaySchedule(
    val day: DayOfWeek,
    val mode: LearningMode,
    val modeLabel: String?,
    val periods: List<Period>
) {
    val firstStart: LocalTime? get() = periods.firstOrNull()?.start
    val lastEnd: LocalTime? get() = periods.lastOrNull()?.end
}
