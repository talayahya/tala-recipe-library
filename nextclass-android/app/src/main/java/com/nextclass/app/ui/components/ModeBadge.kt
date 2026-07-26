package com.nextclass.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.nextclass.app.data.model.LearningMode
import com.nextclass.app.ui.badgeColor
import com.nextclass.app.ui.label

/** Small pill showing the day's learning mode in its meaning color. */
@Composable
fun ModeBadge(
    mode: LearningMode,
    modeLabel: String?,
    modifier: Modifier = Modifier
) {
    val color = mode.badgeColor()
    Text(
        text = mode.label(modeLabel).uppercase(),
        style = MaterialTheme.typography.labelLarge,
        color = Color.White,
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(color)
            .padding(horizontal = 12.dp, vertical = 4.dp)
    )
}
