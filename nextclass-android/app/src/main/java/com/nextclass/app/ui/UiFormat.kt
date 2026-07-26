package com.nextclass.app.ui

import androidx.compose.ui.graphics.Color
import com.nextclass.app.data.model.LearningMode
import com.nextclass.app.ui.theme.ModeFaceToFace
import com.nextclass.app.ui.theme.ModeHybrid
import com.nextclass.app.ui.theme.ModeOnline
import java.time.LocalTime
import java.time.format.DateTimeFormatter

private val TIME_FMT: DateTimeFormatter = DateTimeFormatter.ofPattern("h:mm a")

fun LocalTime.formatClock(): String = format(TIME_FMT)

fun LearningMode.label(customLabel: String?): String = customLabel ?: when (this) {
    LearningMode.ONLINE -> "Online"
    LearningMode.FACE_TO_FACE -> "Face-to-Face"
    LearningMode.HYBRID -> "Hybrid"
}

fun LearningMode.badgeColor(): Color = when (this) {
    LearningMode.ONLINE -> ModeOnline
    LearningMode.FACE_TO_FACE -> ModeFaceToFace
    LearningMode.HYBRID -> ModeHybrid
}

/** "12 min", "1 hr 5 min", "now". */
fun formatDuration(totalMinutes: Long): String {
    if (totalMinutes <= 0) return "now"
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return when {
        hours > 0 && minutes > 0 -> "$hours hr $minutes min"
        hours > 0 -> "$hours hr"
        else -> "$minutes min"
    }
}
