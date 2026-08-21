package com.custom.astrion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.wifi.WifiManager
import android.util.Log

/**
 * Re-enables Wi-Fi on boot.
 * Some devices (e.g. HA100 running Android 8.1) don't restore the
 * previous Wi-Fi state automatically after a reboot.
 */
class WifiBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            try {
                val wifiManager =
                    context.applicationContext
                        .getSystemService(Context.WIFI_SERVICE) as WifiManager
                if (!wifiManager.isWifiEnabled) {
                    @Suppress("DEPRECATION")
                    wifiManager.isWifiEnabled = true
                    Log.d("WifiBootReceiver", "Wi-Fi re-enabled on boot")
                }
            } catch (e: Exception) {
                Log.e("WifiBootReceiver", "Failed to re-enable Wi-Fi", e)
            }
        }
    }
}
