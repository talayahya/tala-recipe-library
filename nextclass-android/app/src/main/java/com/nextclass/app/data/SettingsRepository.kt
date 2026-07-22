package com.nextclass.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "nextclass_settings")

/** Immutable snapshot of everything the app persists. */
data class AppSettings(
    val inSchool: Boolean = false,
    val notifyMinutesBefore: Int = DEFAULT_NOTIFY_MINUTES,
    val persistentCurrentClass: Boolean = false,
    val autoOffAfterLastClass: Boolean = false,
    val notifyForBreaks: Boolean = false
) {
    companion object {
        const val DEFAULT_NOTIFY_MINUTES = 5
        const val MIN_NOTIFY_MINUTES = 1
        const val MAX_NOTIFY_MINUTES = 15
    }
}

/**
 * Persists the master "I'm in School" toggle and user settings via DataStore so
 * they survive process death and reboots.
 */
class SettingsRepository(private val context: Context) {

    private object Keys {
        val IN_SCHOOL = booleanPreferencesKey("in_school")
        val NOTIFY_MINUTES = intPreferencesKey("notify_minutes_before")
        val PERSISTENT = booleanPreferencesKey("persistent_current_class_notification")
        val AUTO_OFF = booleanPreferencesKey("auto_off_after_last_class")
        val NOTIFY_BREAKS = booleanPreferencesKey("notify_for_breaks")
    }

    val settings: Flow<AppSettings> = context.dataStore.data.map { p -> p.toSettings() }

    /** One-shot read for non-Compose callers (receivers, alarm handlers). */
    suspend fun current(): AppSettings = context.dataStore.data.first().toSettings()

    suspend fun setInSchool(value: Boolean) = edit { it[Keys.IN_SCHOOL] = value }

    suspend fun setNotifyMinutesBefore(value: Int) = edit {
        it[Keys.NOTIFY_MINUTES] = value.coerceIn(
            AppSettings.MIN_NOTIFY_MINUTES,
            AppSettings.MAX_NOTIFY_MINUTES
        )
    }

    suspend fun setPersistentCurrentClass(value: Boolean) = edit { it[Keys.PERSISTENT] = value }

    suspend fun setAutoOffAfterLastClass(value: Boolean) = edit { it[Keys.AUTO_OFF] = value }

    suspend fun setNotifyForBreaks(value: Boolean) = edit { it[Keys.NOTIFY_BREAKS] = value }

    private suspend fun edit(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        context.dataStore.edit(block)
    }

    private fun Preferences.toSettings() = AppSettings(
        inSchool = this[Keys.IN_SCHOOL] ?: false,
        notifyMinutesBefore = (this[Keys.NOTIFY_MINUTES] ?: AppSettings.DEFAULT_NOTIFY_MINUTES)
            .coerceIn(AppSettings.MIN_NOTIFY_MINUTES, AppSettings.MAX_NOTIFY_MINUTES),
        persistentCurrentClass = this[Keys.PERSISTENT] ?: false,
        autoOffAfterLastClass = this[Keys.AUTO_OFF] ?: false,
        notifyForBreaks = this[Keys.NOTIFY_BREAKS] ?: false
    )
}
