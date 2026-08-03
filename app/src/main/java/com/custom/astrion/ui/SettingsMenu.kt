package com.custom.astrion.ui

import android.app.Activity
import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BrightnessMedium
import androidx.compose.material.icons.filled.SettingsSuggest
import androidx.compose.material.icons.filled.Vibration
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.custom.astrion.R
import com.custom.astrion.cards.CardContext
import com.custom.astrion.ha.ConnectionState
import java.net.Inet4Address
import java.net.NetworkInterface

/**
 * Settings panel in the style of HaRemote (their SettingActivity /
 * SettingDisplayActivity, decompiled to understand the layout): live
 * brightness, Wi-Fi and Android system shortcuts, wake-on-motion, and
 * HA/Harmony connection status — without duplicating their whole menu
 * (account, language, lock screen, etc. not covered here, addable if
 * needed).
 *
 * Lives in `ui/` rather than `cards/impl/` because it is no longer a
 * dashboard.json-driven card: Dashboard renders it directly from its
 * swipe-down-from-top overlay, not through CardRegistry/CardConfig like
 * the swipeable-page cards are.
 */
@Composable
fun SettingsMenu(ctx: CardContext) {
    val context = LocalContext.current
    val activity = context as? Activity

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFF161616))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Text(
            stringResource(R.string.settings_title),
            color = Color(0xFFE6E6E6),
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
        )

        localIpAddress()?.let { ip ->
            Text(
                "Local config: http://$ip:8080",
                color = Color(0xFF6EA8FE),
                fontSize = 12.sp,
            )
        }

        ConnectionStatusSection(ctx)

        BrightnessSlider(activity)

        SettingRow(icon = Icons.Filled.Wifi, label = stringResource(R.string.wifi_network)) {
            context.startActivity(
                Intent(Settings.ACTION_WIFI_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }

        SettingRow(icon = Icons.Filled.SettingsSuggest, label = stringResource(R.string.android_system)) {
            context.startActivity(
                Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }

        WakeOnMotionRow(ctx)
    }
}

@Composable
private fun ConnectionStatusSection(ctx: CardContext) {
    val haConnection by ctx.client.connection.collectAsState()
    val haConnected = haConnection == ConnectionState.CONNECTED

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        ConnectionStatusRow(
            label = "Home Assistant",
            connected = haConnected,
            detail = if (haConnected) stringResource(R.string.connected)
            else haConnection.name.lowercase().replaceFirstChar { it.uppercase() },
        )
        ConnectionStatusRow(
            label = "Harmony Hub",
            connected = ctx.harmonyConnected,
            detail = stringResource(if (ctx.harmonyConnected) R.string.connected else R.string.disconnected),
        )
    }
}

@Composable
private fun ConnectionStatusRow(label: String, connected: Boolean, detail: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF232323))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(if (connected) Color(0xFF4CAF50) else Color(0xFFE53935))
        )
        Text(label, color = Color(0xFFCFCFCF), fontSize = 14.sp)
        Spacer(Modifier.weight(1f))
        Text(detail, color = Color(0xFF9A9A9A), fontSize = 13.sp)
    }
}

@Composable
private fun BrightnessSlider(activity: Activity?) {
    val context = LocalContext.current
    var canWrite by remember { mutableStateOf(Settings.System.canWrite(context)) }
    var brightness by remember {
        mutableIntStateOf(
            runCatching {
                Settings.System.getInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS)
            }.getOrDefault(128)
        )
    }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(Icons.Filled.BrightnessMedium, contentDescription = null, tint = Color(0xFF9A9A9A))
            Text(stringResource(R.string.brightness), color = Color(0xFFCFCFCF), fontSize = 14.sp)
            Spacer(Modifier.weight(1f))
            Text("${(brightness / 255f * 100).toInt()}%", color = Color(0xFF9A9A9A), fontSize = 13.sp)
        }

        if (!canWrite) {
            SettingRow(icon = null, label = stringResource(R.string.allow_brightness_write)) {
                context.startActivity(
                    Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
                canWrite = Settings.System.canWrite(context)
            }
        } else {
            Slider(
                value = brightness.toFloat(),
                valueRange = 10f..255f,
                onValueChange = { v ->
                    brightness = v.toInt()
                    activity?.let { act ->
                        val attrs = act.window.attributes
                        attrs.screenBrightness = brightness / 255f
                        act.window.attributes = attrs
                    }
                    runCatching {
                        Settings.System.putInt(
                            context.contentResolver,
                            Settings.System.SCREEN_BRIGHTNESS,
                            brightness,
                        )
                    }
                },
                colors = SliderDefaults.colors(
                    thumbColor = Color(0xFF6EA8FE),
                    activeTrackColor = Color(0xFF6EA8FE),
                    inactiveTrackColor = Color(0xFF2A2A2A),
                ),
            )
        }
    }
}

@Composable
private fun WakeOnMotionRow(ctx: CardContext) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(Icons.Filled.Vibration, contentDescription = null, tint = Color(0xFF9A9A9A))
        Text(stringResource(R.string.wake_on_motion), color = Color(0xFFCFCFCF), fontSize = 14.sp)
        Spacer(Modifier.weight(1f))
        Switch(
            checked = ctx.wakeOnMotionEnabled,
            onCheckedChange = { ctx.setWakeOnMotionEnabled(it) },
            colors = SwitchDefaults.colors(checkedTrackColor = Color(0xFF6EA8FE)),
        )
    }
}

@Composable
private fun SettingRow(icon: ImageVector?, label: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF232323))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        icon?.let { Icon(it, contentDescription = null, tint = Color(0xFF9A9A9A)) }
        Text(label, color = Color(0xFFCFCFCF), fontSize = 14.sp)
    }
}

private fun localIpAddress(): String? =
    runCatching {
        NetworkInterface.getNetworkInterfaces().asSequence()
            .flatMap { it.inetAddresses.asSequence() }
            .firstOrNull { !it.isLoopbackAddress && it is Inet4Address }
            ?.hostAddress
    }.getOrNull()