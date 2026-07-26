package com.nextclass.app.data

import com.nextclass.app.data.model.DaySchedule
import com.nextclass.app.data.model.LearningMode
import com.nextclass.app.data.model.Period
import com.nextclass.app.data.model.PeriodType
import java.time.DayOfWeek
import java.time.LocalTime

/**
 * The bundled static timetable for SPT 11 - 1A. Ships with the app; no network,
 * no database. Times differ per day exactly as given by the school — do NOT
 * assume a shared time grid.
 */
object Schedule {

    const val SECTION = "SPT 11 - 1A"
    const val GRADE = "Grade 11"
    const val ADVISER = "Ms. Marbibi, Richelle"
    const val ASYNC_NOTE =
        "Independent learning (Asynchronous): 30 mins for CORE subjects, 1 hr for ELECTIVE subjects."

    private fun t(hhmm: String): LocalTime = LocalTime.parse(hhmm)

    private const val SCIENCE = "General Science"
    private const val MATH = "General Mathematics"
    private const val HEALTH_BREAK = "Health Break"
    private const val JAVA = "Computer Programming (JAVA)"
    private const val LCS = "Life and Career Skills"
    private const val FILIPINO = "Mabisang Komunikasyon"
    private const val ENGLISH = "Effective Communication"
    private const val HISTORY = "Pag-aaral ng Kasaysayan at Lipunang Pilipino"
    private const val HOMEROOM = "Homeroom"

    private val MONDAY = DaySchedule(
        day = DayOfWeek.MONDAY,
        mode = LearningMode.ONLINE,
        modeLabel = null,
        periods = listOf(
            Period(t("06:00"), t("06:40"), SCIENCE, PeriodType.CORE),
            Period(t("06:40"), t("07:20"), MATH, PeriodType.CORE),
            Period(t("07:20"), t("07:35"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("07:35"), t("08:15"), JAVA, PeriodType.ELECTIVE),
            Period(t("08:15"), t("08:55"), JAVA, PeriodType.ELECTIVE),
            Period(t("08:55"), t("09:10"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("09:10"), t("09:50"), LCS, PeriodType.CORE),
            Period(t("09:50"), t("10:30"), FILIPINO, PeriodType.CORE),
            Period(t("10:30"), t("11:10"), HISTORY, PeriodType.CORE)
        )
    )

    private val TUESDAY = DaySchedule(
        day = DayOfWeek.TUESDAY,
        mode = LearningMode.ONLINE,
        modeLabel = null,
        periods = listOf(
            Period(t("06:00"), t("06:50"), SCIENCE, PeriodType.CORE),
            Period(t("06:50"), t("07:40"), MATH, PeriodType.CORE),
            Period(t("07:40"), t("07:50"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("07:50"), t("08:40"), JAVA, PeriodType.ELECTIVE),
            Period(t("08:40"), t("09:30"), JAVA, PeriodType.ELECTIVE),
            Period(t("09:30"), t("09:45"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("09:45"), t("10:35"), LCS, PeriodType.CORE),
            Period(t("10:35"), t("11:25"), FILIPINO, PeriodType.CORE),
            Period(t("11:25"), t("12:15"), HISTORY, PeriodType.CORE)
        )
    )

    private val WEDNESDAY = DaySchedule(
        day = DayOfWeek.WEDNESDAY,
        mode = LearningMode.HYBRID,
        modeLabel = "Face-to-Face / Online",
        periods = listOf(
            Period(t("06:00"), t("06:50"), SCIENCE, PeriodType.CORE),
            Period(t("06:50"), t("07:40"), MATH, PeriodType.CORE),
            Period(t("07:40"), t("07:50"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("07:50"), t("08:40"), JAVA, PeriodType.ELECTIVE),
            Period(t("08:40"), t("09:30"), JAVA, PeriodType.ELECTIVE),
            Period(t("09:30"), t("09:45"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("09:45"), t("10:35"), LCS, PeriodType.CORE),
            Period(t("10:35"), t("11:25"), ENGLISH, PeriodType.CORE),
            Period(t("11:25"), t("12:15"), HISTORY, PeriodType.CORE)
        )
    )

    private val THURSDAY = DaySchedule(
        day = DayOfWeek.THURSDAY,
        mode = LearningMode.FACE_TO_FACE,
        modeLabel = null,
        periods = listOf(
            Period(t("06:00"), t("06:50"), SCIENCE, PeriodType.CORE),
            Period(t("06:50"), t("07:40"), MATH, PeriodType.CORE),
            Period(t("07:40"), t("07:50"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("07:50"), t("08:40"), JAVA, PeriodType.ELECTIVE),
            Period(t("08:40"), t("09:30"), JAVA, PeriodType.ELECTIVE),
            Period(t("09:30"), t("09:45"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("09:45"), t("10:35"), LCS, PeriodType.CORE),
            Period(t("10:35"), t("11:25"), ENGLISH, PeriodType.CORE),
            Period(t("11:25"), t("12:15"), HISTORY, PeriodType.CORE),
            Period(t("12:15"), t("12:45"), HOMEROOM, PeriodType.HOMEROOM)
        )
    )

    private val FRIDAY = DaySchedule(
        day = DayOfWeek.FRIDAY,
        mode = LearningMode.FACE_TO_FACE,
        modeLabel = null,
        periods = listOf(
            Period(t("06:00"), t("06:50"), SCIENCE, PeriodType.CORE),
            Period(t("06:50"), t("07:40"), MATH, PeriodType.CORE),
            Period(t("07:40"), t("07:50"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("07:50"), t("08:40"), JAVA, PeriodType.ELECTIVE),
            Period(t("08:40"), t("09:30"), JAVA, PeriodType.ELECTIVE),
            Period(t("09:30"), t("09:45"), HEALTH_BREAK, PeriodType.BREAK),
            Period(t("09:45"), t("10:35"), LCS, PeriodType.CORE),
            Period(t("10:35"), t("11:25"), ENGLISH, PeriodType.CORE),
            Period(t("11:25"), t("12:15"), HISTORY, PeriodType.CORE),
            Period(t("12:15"), t("12:45"), HOMEROOM, PeriodType.HOMEROOM)
        )
    )

    /** Weekday timetables. Saturday/Sunday intentionally absent (no classes). */
    val byDay: Map<DayOfWeek, DaySchedule> = mapOf(
        DayOfWeek.MONDAY to MONDAY,
        DayOfWeek.TUESDAY to TUESDAY,
        DayOfWeek.WEDNESDAY to WEDNESDAY,
        DayOfWeek.THURSDAY to THURSDAY,
        DayOfWeek.FRIDAY to FRIDAY
    )

    /** Ordered Mon–Fri list for the day switcher. */
    val weekdays: List<DayOfWeek> = listOf(
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY
    )

    fun forDay(day: DayOfWeek): DaySchedule? = byDay[day]
}
