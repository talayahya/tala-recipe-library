package com.nextclass.app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.nextclass.app.data.ScheduleRepository
import com.nextclass.app.data.SettingsRepository
import com.nextclass.app.notify.Notifications
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate

/**
 * Fires when a scheduled alarm goes off. Re-reads the master toggle from
 * DataStore as a defensive guard: even if a stale alarm somehow survived, an
 * OFF toggle means nothing is ever posted.
 */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val kind = intent.getStringExtra(AlarmScheduler.EXTRA_KIND) ?: return
        val periodIndex = intent.getIntExtra(AlarmScheduler.EXTRA_PERIOD_INDEX, -1)
        val appContext = context.applicationContext

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                val settings = SettingsRepository(appContext).current()

                when (kind) {
                    AlarmScheduler.KIND_AUTO_OFF -> {
                        // End-of-day auto-off: flip the master toggle off and
                        // clear everything so tomorrow stays silent until re-armed.
                        SettingsRepository(appContext).setInSchool(false)
                        AlarmScheduler.cancelAll(appContext)
                        Notifications.cancelOngoing(appContext)
                    }

                    AlarmScheduler.KIND_UPCOMING -> {
                        // Master rule: OFF means never post.
                        if (!settings.inSchool) return@launch
                        val schedule = ScheduleRepository.todaySchedule(LocalDate.now())
                        val period = schedule?.periods?.getOrNull(periodIndex) ?: return@launch
                        if (period.isBreak && !settings.notifyForBreaks) return@launch
                        Notifications.postUpcoming(
                            context = appContext,
                            notificationId = periodIndex,
                            period = period,
                            minutesBefore = settings.notifyMinutesBefore
                        )
                    }
                }
            } finally {
                pendingResult.finish()
            }
        }
    }
}
