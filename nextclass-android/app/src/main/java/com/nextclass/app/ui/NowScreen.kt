package com.nextclass.app.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.nextclass.app.data.Schedule
import com.nextclass.app.data.ScheduleRepository
import com.nextclass.app.data.model.DaySchedule
import com.nextclass.app.notify.Notifications
import com.nextclass.app.ui.components.CurrentClassHero
import com.nextclass.app.ui.components.InSchoolToggle
import com.nextclass.app.ui.components.TimelineRow
import com.nextclass.app.ui.components.UpNextCard
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.DayOfWeek
import java.time.format.TextStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NowScreen(
    state: NowUiState,
    onToggleInSchool: (Boolean) -> Unit,
    onSelectDay: (DayOfWeek) -> Unit,
    onOpenSettings: () -> Unit
) {
    val context = LocalContext.current
    var showExactAlarmDialog by remember { mutableStateOf(false) }

    // After the notification permission dialog resolves, arm the toggle either
    // way — alarms are still scheduled; only the visible post depends on grant.
    val notifPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ ->
        onToggleInSchool(true)
        if (!Notifications.canScheduleExactAlarms(context)) showExactAlarmDialog = true
    }

    fun handleToggle(on: Boolean) {
        if (!on) {
            onToggleInSchool(false)
            return
        }
        val needsNotifPermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !Notifications.hasPostPermission(context)
        if (needsNotifPermission) {
            notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            onToggleInSchool(true)
            if (!Notifications.canScheduleExactAlarms(context)) showExactAlarmDialog = true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("NextClass") },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = "Settings")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            InSchoolToggle(
                checked = state.settings.inSchool,
                onCheckedChange = { handleToggle(it) },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )
            DaySwitcher(
                selectedDay = state.selectedDay,
                today = state.today,
                onSelectDay = onSelectDay
            )
            DayPager(state = state, onSelectDay = onSelectDay)
        }
    }

    if (showExactAlarmDialog) {
        ExactAlarmDialog(
            onConfirm = {
                showExactAlarmDialog = false
                Notifications.exactAlarmSettingsIntent(context)?.let { context.startActivity(it) }
            },
            onDismiss = { showExactAlarmDialog = false }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DaySwitcher(
    selectedDay: DayOfWeek,
    today: DayOfWeek,
    onSelectDay: (DayOfWeek) -> Unit
) {
    val selectedIndex = Schedule.weekdays.indexOf(selectedDay).coerceAtLeast(0)
    ScrollableTabRow(
        selectedTabIndex = selectedIndex,
        edgePadding = 16.dp
    ) {
        Schedule.weekdays.forEach { day ->
            val isToday = day == today
            Tab(
                selected = day == selectedDay,
                onClick = { onSelectDay(day) },
                text = {
                    Text(
                        text = day.getDisplayName(TextStyle.SHORT, Locale.getDefault()) +
                            if (isToday) " •" else ""
                    )
                }
            )
        }
    }
}

@Composable
private fun DayPager(
    state: NowUiState,
    onSelectDay: (DayOfWeek) -> Unit
) {
    val initial = Schedule.weekdays.indexOf(state.selectedDay).coerceAtLeast(0)
    val pagerState = rememberPagerState(initialPage = initial) { Schedule.weekdays.size }
    val scope = rememberCoroutineScope()

    // Tab tap -> animate pager.
    LaunchedEffect(state.selectedDay) {
        val target = Schedule.weekdays.indexOf(state.selectedDay).coerceAtLeast(0)
        if (pagerState.currentPage != target) {
            scope.launch { pagerState.animateScrollToPage(target) }
        }
    }
    // Swipe -> update selected day.
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.settledPage }.collect { page ->
            val day = Schedule.weekdays[page]
            if (day != state.selectedDay) onSelectDay(day)
        }
    }

    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
        val day = Schedule.weekdays[page]
        DayContent(
            day = day,
            state = state,
            schedule = ScheduleRepository.scheduleFor(day)
        )
    }
}

@Composable
private fun DayContent(
    day: DayOfWeek,
    state: NowUiState,
    schedule: DaySchedule?
) {
    if (schedule == null) {
        EmptyState("No classes on ${day.getDisplayName(TextStyle.FULL, Locale.getDefault())}")
        return
    }

    val isToday = day == state.today
    val status = if (isToday) {
        ScheduleRepository.statusAt(day, state.nowTime)
    } else {
        null
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        if (isToday) {
            item { LiveHeader(status!!, state) }
        }

        item {
            Text(
                text = "Full day",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(top = 8.dp, bottom = 8.dp)
            )
        }

        items(schedule.periods) { period ->
            val isCurrent = isToday &&
                !state.nowTime.isBefore(period.start) && state.nowTime.isBefore(period.end)
            val isPast = isToday && !period.end.isAfter(state.nowTime)
            TimelineRow(period = period, isCurrent = isCurrent, isPast = isPast)
        }
    }
}

@Composable
private fun LiveHeader(status: com.nextclass.app.data.DayStatus, state: NowUiState) {
    val schedule = ScheduleRepository.scheduleFor(state.today) ?: return
    // Wrap in a Column: a single LazyColumn item must emit one layout node,
    // otherwise the hero and up-next card would overlap.
    Column(modifier = Modifier.fillMaxWidth()) {
    when (status) {
        is com.nextclass.app.data.DayStatus.InClass -> {
            val period = status.current
            val total = period.durationMinutes.coerceAtLeast(1)
            val elapsed = Duration.between(period.start, state.nowTime).toMinutes()
            val minutesLeft = Duration.between(state.nowTime, period.end).toMinutes()
            CurrentClassHero(
                period = period,
                mode = schedule.mode,
                modeLabel = schedule.modeLabel,
                progress = elapsed.toFloat() / total.toFloat(),
                minutesLeft = minutesLeft
            )
            status.next?.let { next ->
                Spacer(Modifier.height(12.dp))
                UpNextCard(
                    next = next,
                    minutesUntil = Duration.between(state.nowTime, next.start).toMinutes()
                )
            }
        }

        is com.nextclass.app.data.DayStatus.BeforeSchool -> {
            val next = status.next
            UpNextCard(
                next = next,
                minutesUntil = Duration.between(state.nowTime, next.start).toMinutes()
            )
        }

        is com.nextclass.app.data.DayStatus.BetweenClasses -> {
            val next = status.next
            UpNextCard(
                next = next,
                minutesUntil = Duration.between(state.nowTime, next.start).toMinutes()
            )
        }

        com.nextclass.app.data.DayStatus.AfterSchool ->
            EmptyState("No classes right now — you're done for today 🎉")

        com.nextclass.app.data.DayStatus.NoSchedule ->
            EmptyState("No classes right now")
    }
    }
}

@Composable
private fun EmptyState(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.titleLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ExactAlarmDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Allow exact alarms") },
        text = {
            Text(
                "To notify you at the exact minute before each class, NextClass needs " +
                    "permission to schedule exact alarms. Open settings to allow it?"
            )
        },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Open settings") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Not now") } }
    )
}
