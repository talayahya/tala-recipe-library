package com.nextclass.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nextclass.app.data.DayStatus
import com.nextclass.app.data.ScheduleRepository
import com.nextclass.app.notify.Notifications
import com.nextclass.app.ui.NowScreen
import com.nextclass.app.ui.NowViewModel
import com.nextclass.app.ui.SettingsScreen
import com.nextclass.app.ui.theme.NextClassTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NextClassTheme {
                NextClassApp()
            }
        }
    }
}

private enum class Screen { NOW, SETTINGS }

@Composable
private fun NextClassApp() {
    val vm: NowViewModel = viewModel()
    val state by vm.uiState.collectAsStateWithLifecycle()
    var screen by remember { mutableStateOf(Screen.NOW) }
    val context = LocalContext.current

    // Keep the day switcher and clock fresh whenever we (re)enter the screen.
    LaunchedEffect(Unit) { vm.refreshNow() }

    // Best-effort persistent "current class" notification, refreshed while the
    // app is in the foreground. Governed by the master toggle.
    LaunchedEffect(state) {
        val s = state.settings
        if (s.inSchool && s.persistentCurrentClass) {
            val status = ScheduleRepository.statusAt(state.today, state.nowTime)
            if (status is DayStatus.InClass) {
                Notifications.postOngoing(context, status.current)
            } else {
                Notifications.cancelOngoing(context)
            }
        } else {
            Notifications.cancelOngoing(context)
        }
    }

    when (screen) {
        Screen.NOW -> NowScreen(
            state = state,
            onToggleInSchool = vm::setInSchool,
            onSelectDay = vm::selectDay,
            onOpenSettings = { screen = Screen.SETTINGS }
        )

        Screen.SETTINGS -> SettingsScreen(
            settings = state.settings,
            onBack = { screen = Screen.NOW },
            onNotifyMinutesChange = vm::setNotifyMinutesBefore,
            onPersistentChange = vm::setPersistentCurrentClass,
            onAutoOffChange = vm::setAutoOffAfterLastClass,
            onNotifyBreaksChange = vm::setNotifyForBreaks
        )
    }
}
