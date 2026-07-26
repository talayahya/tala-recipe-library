package com.nextclass.app.notify

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.nextclass.app.MainActivity
import com.nextclass.app.R
import com.nextclass.app.data.model.Period
import java.time.format.DateTimeFormatter

/**
 * Central place for the notification channel, notification builders, and the
 * permission/exact-alarm capability checks used across the app.
 */
object Notifications {

    const val CHANNEL_ID = "upcoming_class"
    const val ONGOING_NOTIFICATION_ID = 1001

    private val TIME_FMT: DateTimeFormatter = DateTimeFormatter.ofPattern("h:mm a")

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.notification_channel_desc)
            enableVibration(true)
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    /** Whether we're allowed to post notifications (always true below Android 13). */
    fun hasPostPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }

    /** Whether exact alarms can be scheduled (always true below Android 12). */
    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val am = context.getSystemService(AlarmManager::class.java)
        return am?.canScheduleExactAlarms() == true
    }

    /** Intent that opens the system screen to grant exact-alarm permission. */
    fun exactAlarmSettingsIntent(context: Context): Intent? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
        return Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
            data = Uri.fromParts("package", context.packageName, null)
        }
    }

    private fun contentIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    /** Post the "class starting soon" alert for [period], if we're allowed to. */
    fun postUpcoming(context: Context, notificationId: Int, period: Period, minutesBefore: Int) {
        if (!hasPostPermission(context)) return
        val title = "${period.subject} starts soon"
        val text = "Starts at ${period.start.format(TIME_FMT)} — in about $minutesBefore min"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_class)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(contentIntent(context))
            .build()
        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }

    /** Post/refresh the optional persistent "current class" notification. */
    fun postOngoing(context: Context, period: Period) {
        if (!hasPostPermission(context)) return
        val text = "Now: ${period.subject} · until ${period.end.format(TIME_FMT)}"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_class)
            .setContentTitle("Class in progress")
            .setContentText(text)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(contentIntent(context))
            .build()
        NotificationManagerCompat.from(context).notify(ONGOING_NOTIFICATION_ID, notification)
    }

    fun cancelOngoing(context: Context) {
        NotificationManagerCompat.from(context).cancel(ONGOING_NOTIFICATION_ID)
    }
}
