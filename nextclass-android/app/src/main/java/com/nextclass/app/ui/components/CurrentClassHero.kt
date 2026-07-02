package com.nextclass.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.nextclass.app.data.model.LearningMode
import com.nextclass.app.data.model.Period
import com.nextclass.app.ui.formatClock

/** Prominent card for the class happening right now, with a live progress ring. */
@Composable
fun CurrentClassHero(
    period: Period,
    mode: LearningMode,
    modeLabel: String?,
    progress: Float,
    minutesLeft: Long,
    modifier: Modifier = Modifier
) {
    val soft = period.isSoft
    val container = if (soft) {
        MaterialTheme.colorScheme.tertiaryContainer
    } else {
        MaterialTheme.colorScheme.primaryContainer
    }
    val onContainer = if (soft) {
        MaterialTheme.colorScheme.onTertiaryContainer
    } else {
        MaterialTheme.colorScheme.onPrimaryContainer
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = container, contentColor = onContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (soft) relaxedLabel(period) else "Happening now",
                    style = MaterialTheme.typography.labelLarge,
                    color = onContainer.copy(alpha = 0.7f)
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = period.subject,
                    style = MaterialTheme.typography.headlineMedium
                )
                Spacer(Modifier.height(12.dp))
                ModeBadge(mode = mode, modeLabel = modeLabel)
                Spacer(Modifier.height(10.dp))
                Text(
                    text = "${period.start.formatClock()} – ${period.end.formatClock()}",
                    style = MaterialTheme.typography.bodyLarge,
                    color = onContainer.copy(alpha = 0.8f)
                )
            }
            ProgressRing(
                progress = progress,
                minutesLeft = minutesLeft,
                trackColor = onContainer.copy(alpha = 0.15f),
                progressColor = onContainer
            )
        }
    }
}

private fun relaxedLabel(period: Period): String =
    if (period.isHomeroom) "Homeroom · take it easy" else "Health break · relax"

@Composable
private fun ProgressRing(
    progress: Float,
    minutesLeft: Long,
    trackColor: Color,
    progressColor: Color
) {
    val animated by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 700),
        label = "ring"
    )
    Box(
        modifier = Modifier.size(104.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(104.dp)) {
            val stroke = 10.dp.toPx()
            val inset = stroke / 2
            val arcSize = androidx.compose.ui.geometry.Size(
                size.width - stroke,
                size.height - stroke
            )
            val topLeft = androidx.compose.ui.geometry.Offset(inset, inset)
            drawArc(
                color = trackColor,
                startAngle = 0f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round)
            )
            drawArc(
                color = progressColor,
                startAngle = -90f,
                sweepAngle = 360f * animated,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round)
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = if (minutesLeft <= 0) "0" else minutesLeft.toString(),
                style = MaterialTheme.typography.titleLarge,
                textAlign = TextAlign.Center
            )
            Text(
                text = "min left",
                style = MaterialTheme.typography.labelLarge,
                color = progressColor.copy(alpha = 0.7f)
            )
        }
    }
}
