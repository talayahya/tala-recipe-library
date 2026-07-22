package com.nextclass.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nextclass.app.alarm.AlarmScheduler
import com.nextclass.app.data.AppSettings
import com.nextclass.app.data.SettingsRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime

/** UI state for the Now screen. Time fields tick so the ring/countdown stay live. */
data class NowUiState(
    val settings: AppSettings = AppSettings(),
    val today: DayOfWeek = LocalDate.now().dayOfWeek,
    val selectedDay: DayOfWeek = LocalDate.now().dayOfWeek,
    val nowTime: LocalTime = LocalTime.now(),
    val nowDate: LocalDate = LocalDate.now()
) {
    val isViewingToday: Boolean get() = selectedDay == today
}

class NowViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = SettingsRepository(app)

    private val selectedDay = MutableStateFlow(LocalDate.now().dayOfWeek)
    private val tick = MutableStateFlow(TimeTick())

    val uiState: StateFlow<NowUiState> =
        combine(repo.settings, selectedDay, tick) { settings, day, t ->
            NowUiState(
                settings = settings,
                today = t.date.dayOfWeek,
                selectedDay = day,
                nowTime = t.time,
                nowDate = t.date
            )
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = NowUiState()
        )

    init {
        // Re-emit the current time roughly every 30s so countdowns and the
        // progress ring advance without user interaction.
        viewModelScope.launch {
            while (true) {
                tick.value = TimeTick()
                delay(30_000)
            }
        }
    }

    fun selectDay(day: DayOfWeek) {
        selectedDay.value = day
    }

    /** Reset the day switcher back to the real weekday (used on resume). */
    fun refreshNow() {
        tick.value = TimeTick()
    }

    /**
     * The master toggle. ON persists + arms every remaining alarm today; OFF
     * persists + cancels everything. This is the single choke point that
     * guarantees "OFF = phone stays silent".
     */
    fun setInSchool(on: Boolean) {
        viewModelScope.launch {
            repo.setInSchool(on)
            val settings = repo.current()
            val context = getApplication<Application>()
            if (on) {
                AlarmScheduler.armForToday(context, settings)
            } else {
                AlarmScheduler.cancelAll(context)
                com.nextclass.app.notify.Notifications.cancelOngoing(context)
            }
        }
    }

    /** Re-arm after a settings change while the toggle is ON. */
    fun reArmIfOn() {
        viewModelScope.launch {
            val settings = repo.current()
            if (settings.inSchool) {
                AlarmScheduler.armForToday(getApplication(), settings)
            }
        }
    }

    fun setNotifyMinutesBefore(value: Int) = updateSetting { repo.setNotifyMinutesBefore(value) }
    fun setPersistentCurrentClass(value: Boolean) =
        updateSetting { repo.setPersistentCurrentClass(value) }

    fun setAutoOffAfterLastClass(value: Boolean) =
        updateSetting { repo.setAutoOffAfterLastClass(value) }

    fun setNotifyForBreaks(value: Boolean) = updateSetting { repo.setNotifyForBreaks(value) }

    private fun updateSetting(block: suspend () -> Unit) {
        viewModelScope.launch {
            block()
            reArmIfOnBlocking()
        }
    }

    private suspend fun reArmIfOnBlocking() {
        val settings = repo.current()
        if (settings.inSchool) {
            AlarmScheduler.armForToday(getApplication(), settings)
        }
    }

    private data class TimeTick(
        val time: LocalTime = LocalTime.now(),
        val date: LocalDate = LocalDate.now()
    )
}
