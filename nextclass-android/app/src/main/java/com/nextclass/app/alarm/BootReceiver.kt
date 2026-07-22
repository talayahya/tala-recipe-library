package com.nextclass.app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.nextclass.app.data.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Re-arms alarms after a reboot, but ONLY if the master toggle is currently ON.
 * If it's OFF, we do nothing — the phone stays silent.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_LOCKED_BOOT_COMPLETED
        ) {
            return
        }

        val appContext = context.applicationContext
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                val settings = SettingsRepository(appContext).current()
                if (settings.inSchool) {
                    AlarmScheduler.armForToday(appContext, settings)
                }
            } finally {
                pendingResult.finish()
            }
        }
    }
}
