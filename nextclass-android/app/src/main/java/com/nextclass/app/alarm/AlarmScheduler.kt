package com.nextclass.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.nextclass.app.data.AppSettings
import com.nextclass.app.data.ScheduleRepository
import com.nextclass.app.notify.Notifications
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

/**
 * Arms and cancels the exact pre-class alarms. This is the single mechanism
 * behind the "I'm in School" master rule:
 *
 *  - [armForToday] is only ever called when the toggle is ON.
 *  - [cancelAll] is called the instant the toggle flips OFF (and defensively
 *    before every re-arm), so no stale alarm can survive.
 *
 * Each period gets a stable, unique request code so its PendingIntent can be
 * cancelled individually.
 */
object AlarmScheduler {

    // Request codes. Period alarms occupy [BASE, BASE + MAX_PERIODS). The auto-off
    // alarm gets its own fixed code above that range.
    private const val BASE_REQUEST_CODE = 1000
    private const val MAX_PERIODS = 32
    private const val AUTO_OFF_REQUEST_CODE = 2000

    const val EXTRA_KIND = "extra_kind"
    const val EXTRA_PERIOD_INDEX = "extra_period_index"
    const val KIND_UPCOMING = "upcoming"
    const val KIND_AUTO_OFF = "auto_off"

    private fun alarmManager(context: Context): AlarmManager =
        context.getSystemService(AlarmManager::class.java)

    private fun requestCodeFor(index: Int) = BASE_REQUEST_CODE + index

    private fun pendingIntent(
        context: Context,
        requestCode: Int,
        kind: String,
        periodIndex: Int,
        mutableCreate: Boolean
    ): PendingIntent? {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra(EXTRA_KIND, kind)
            putExtra(EXTRA_PERIOD_INDEX, periodIndex)
        }
        // FLAG_NO_CREATE lets cancelAll() probe for an existing intent without
        // creating a new one; when arming we always create/update.
        val flags = if (mutableCreate) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags)
    }

    /**
     * Arm one exact alarm for every remaining period today whose alert time is
     * still in the future. No-op work items (breaks when notify-for-breaks is
     * off) are skipped. Safe to call repeatedly — it cancels first.
     */
    fun armForToday(
        context: Context,
        settings: AppSettings,
        now: LocalDateTime = LocalDateTime.now()
    ) {
        cancelAll(context)
        if (!settings.inSchool) return
        if (!Notifications.canScheduleExactAlarms(context)) return

        val today = now.toLocalDate()
        val nowTime = now.toLocalTime()
        val am = alarmManager(context)

        val remaining = ScheduleRepository.remainingPeriods(today.dayOfWeek, nowTime)
        for (item in remaining) {
            val period = item.period
            if (period.isBreak && !settings.notifyForBreaks) continue

            val alertTime = period.start.minusMinutes(settings.notifyMinutesBefore.toLong())
            // If we're already within the lead window the alert time is in the
            // past; skip rather than fire immediately for a class already noted.
            if (!alertTime.isAfter(nowTime)) continue

            val triggerAtMillis = today.atTime(alertTime).toEpochMillis()
            val pi = pendingIntent(
                context = context,
                requestCode = requestCodeFor(item.index),
                kind = KIND_UPCOMING,
                periodIndex = item.index,
                mutableCreate = true
            ) ?: continue
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
        }

        if (settings.autoOffAfterLastClass) {
            scheduleAutoOff(context, today, nowTime)
        }
    }

    private fun scheduleAutoOff(context: Context, today: LocalDate, nowTime: LocalTime) {
        val schedule = ScheduleRepository.scheduleFor(today.dayOfWeek) ?: return
        val lastEnd = schedule.lastEnd ?: return
        if (!lastEnd.isAfter(nowTime)) return
        val pi = pendingIntent(
            context = context,
            requestCode = AUTO_OFF_REQUEST_CODE,
            kind = KIND_AUTO_OFF,
            periodIndex = -1,
            mutableCreate = true
        ) ?: return
        val triggerAtMillis = today.atTime(lastEnd).toEpochMillis()
        alarmManager(context).setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerAtMillis,
            pi
        )
    }

    /** Cancel every period alarm plus the auto-off alarm. */
    fun cancelAll(context: Context) {
        val am = alarmManager(context)
        for (index in 0 until MAX_PERIODS) {
            pendingIntent(
                context = context,
                requestCode = requestCodeFor(index),
                kind = KIND_UPCOMING,
                periodIndex = index,
                mutableCreate = false
            )?.let { pi ->
                am.cancel(pi)
                pi.cancel()
            }
        }
        pendingIntent(
            context = context,
            requestCode = AUTO_OFF_REQUEST_CODE,
            kind = KIND_AUTO_OFF,
            periodIndex = -1,
            mutableCreate = false
        )?.let { pi ->
            am.cancel(pi)
            pi.cancel()
        }
    }

    private fun LocalDateTime.toEpochMillis(): Long =
        atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
}
