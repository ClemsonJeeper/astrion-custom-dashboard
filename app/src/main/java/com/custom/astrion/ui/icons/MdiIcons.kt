package com.custom.astrion.ui.icons

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.dp

/**
 * A handful of MDI (Material Design Icons / Pictogrammers, Apache-2.0)
 * glyphs, built directly from their official SVG path data via
 * [PathParser] — no extra Gradle dependency (no `material-icons-extended`,
 * no MDI icon-font/library) needed, unlike the ~2000-icon "extended" set or
 * a full MDI compose library.
 *
 * This exists because Google's bundled Material Icons ("Icons.Filled.*",
 * what the rest of the app already uses) and MDI are two different icon
 * catalogs — MDI has no Compose equivalent at all. These are the specific
 * MDI icons [ClimateCard] needs for its icon-style hvac/fan/swing mode
 * chips, matching what Home Assistant's own climate tile-card feature
 * ("style: icons") shows.
 *
 * Path data source: https://pictogrammers.com/library/mdi/ (Apache-2.0).
 * To add another icon later: look it up there, copy the `d="..."` path,
 * and add one more entry below the same way.
 */
object MdiIcons {
    val Power: ImageVector by lazy {
        mdi(
            "mdi_power",
            "M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 " +
                "7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 " +
                "20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13",
        )
    }

    val Fire: ImageVector by lazy {
        mdi(
            "mdi_fire",
            "M17.66,11.2C17.43,10.9 17.15,10.64 16.89,10.38C16.22,9.78 15.46,9.35 14.82,8.72C13.33,7.26 " +
                "13,4.85 13.95,3C13,3.23 12.17,3.75 11.46,4.32C8.87,6.4 7.85,10.07 9.07,13.22C9.11,13.32 " +
                "9.15,13.42 9.15,13.55C9.15,13.77 9,13.97 8.8,14.05C8.57,14.15 8.33,14.09 8.14,13.93C" +
                "8.08,13.88 8.04,13.83 8,13.76C6.87,12.33 6.69,10.28 7.45,8.64C5.78,10 4.87,12.3 5,14.47C" +
                "5.06,14.97 5.12,15.47 5.29,15.97C5.43,16.57 5.7,17.17 6,17.7C7.08,19.43 8.95,20.67 " +
                "10.96,20.92C13.1,21.19 15.39,20.8 17.03,19.32C18.86,17.66 19.5,15 18.56,12.72L18.43," +
                "12.46C18.22,12 17.66,11.2 17.66,11.2M14.5,17.5C14.22,17.74 13.76,18 13.4,18.1C" +
                "12.28,18.5 11.16,17.94 10.5,17.28C11.69,17 12.4,16.12 12.61,15.23C12.78,14.43 " +
                "12.46,13.77 12.33,13C12.21,12.26 12.23,11.63 12.5,10.94C12.69,11.32 12.89,11.7 " +
                "13.13,12C13.9,13 15.11,13.44 15.37,14.8C15.41,14.94 15.43,15.08 15.43,15.23C15.46," +
                "16.05 15.1,16.95 14.5,17.5H14.5Z",
        )
    }

    val Snowflake: ImageVector by lazy {
        mdi(
            "mdi_snowflake",
            "M20.79,13.95L18.46,14.57L16.46,13.44V10.56L18.46,9.43L20.79,10.05L21.31,8.12L19.54,7.65L20," +
                "5.88L18.07,5.36L17.45,7.69L15.45,8.82L13,7.38V5.12L14.71,3.41L13.29,2L12,3.29L10.71," +
                "2L9.29,3.41L11,5.12V7.38L8.5,8.82L6.5,7.69L5.92,5.36L4,5.88L4.47,7.65L2.7,8.12L3.22," +
                "10.05L5.55,9.43L7.55,10.56V13.45L5.55,14.58L3.22,13.96L2.7,15.89L4.47,16.36L4,18.12L" +
                "5.93,18.64L6.55,16.31L8.55,15.18L11,16.62V18.88L9.29,20.59L10.71,22L12,20.71L13.29," +
                "22L14.7,20.59L13,18.88V16.62L15.5,15.17L17.5,16.3L18.12,18.63L20,18.12L19.53,16.35L" +
                "21.3,15.88L20.79,13.95M9.5,10.56L12,9.11L14.5,10.56V13.44L12,14.89L9.5,13.44V10.56Z",
        )
    }

    val Autorenew: ImageVector by lazy {
        mdi(
            "mdi_autorenew",
            "M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 " +
                "6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8," +
                "19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z",
        )
    }

    /**
     * "heat_cool"/"auto" hvac mode — a snowflake plus a diagonal slash with a
     * partial circular arrow, i.e. "heating and cooling, alternating".
     */
    val HeatCool: ImageVector by lazy {
        mdi(
            "mdi_heat_cool",
            "M12.92,1.58L11.18,2.58L12.39,4.67L11.8,6.85L9,7.6L7.38,6L7.42,3.59L5.43,3.59L5.43,5.42L3.59," +
                "5.42L3.6,7.42L6,7.42L7.65,9.03L6.9,11.82L4.68,12.4L2.59,11.2L1.59,12.93L3.17,13.84L2.26," +
                "15.42L4,16.42L5.19,14.33L7.42,13.75L7.92,14.26L9.32,12.86L8.78,12.32L9.53,9.54L12.32," +
                "8.78L12.85,9.32L14.26,7.91L13.73,7.37L14.32,5.19L16.41,4L15.41,2.25L13.83,3.16L12.92," +
                "1.58M20.72,4L4,20.72L5.27,22L10.16,17.11C10.63,17.43 11.15,17.68 11.71,17.83C14.38,18.55 " +
                "17.12,16.96 17.83,14.29C18.22,12.86 17.93,11.36 17.11,10.16L22,5.27L20.72,4M18.74," +
                "9C19.18,9.63 19.53,10.38 19.75,11.19C19.97,12 20.03,12.81 19.96,13.61L22.65,10.41L" +
                "18.74,9M19.32,15.95C19,16.67 18.5,17.35 17.93,17.94C17.34,18.53 16.66,19 15.96,19.34L" +
                "20.05,20.06L19.32,15.95M9,18.71L10.41,22.66L13.59,19.95C12.81,20 12,19.97 11.19," +
                "19.76C10.36,19.54 9.62,19.17 9,18.71Z",
        )
    }

    /** Generic fan glyph, reused as-is for every non-"auto" fan speed (MDI has no per-speed icon). */
    val Fan: ImageVector by lazy {
        mdi(
            "mdi_fan",
            "M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 " +
                "17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35," +
                "10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 " +
                "15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 " +
                "11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 " +
                "9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 " +
                "8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z",
        )
    }

    val FanAuto: ImageVector by lazy {
        mdi(
            "mdi_fan_auto",
            "M12.5,2C8.93,2 8.14,5.96 10.13,9.65C9.72,9.97 9.4,10.39 9.21,10.87C8.28,10.68 7.23,10.25 " +
                "6.73,9.26C5.56,6.89 2,7 2,11.5C2,15.07 5.95,15.85 9.64,13.87C9.96,14.27 10.39,14.59 " +
                "10.88,14.79C10.68,15.71 10.24,16.75 9.26,17.24C6.9,18.42 7,22 11.5,22C12.31,22 13," +
                "21.78 13.5,21.41C13.19,20.67 13,19.86 13,19C13,17.59 13.5,16.3 14.3,15.28C14.17," +
                "14.97 14.03,14.65 13.86,14.34C14.26,14 14.57,13.59 14.77,13.11C15.26,13.21 15.78," +
                "13.39 16.25,13.67C17.07,13.25 18,13 19,13C20.05,13 21.03,13.27 21.89,13.74C21.95," +
                "13.37 22,12.96 22,12.5C22,8.92 18.03,8.13 14.33,10.13C14,9.73 13.59,9.42 13.11," +
                "9.22C13.3,8.29 13.74,7.24 14.73,6.75C17.09,5.57 17,2 12.5,2M12,11C12.54,11 13,11.45 " +
                "13,12C13,12.55 12.54,13 12,13C11.43,13 11,12.55 11,12C11,11.45 11.43,11 12,11M18," +
                "15C16.89,15 16,15.9 16,17V23H18V21H20V23H22V17C22,15.9 21.1,15 20,15M18,17H20V19H18Z",
        )
    }

    /** Fan "quiet"/"silent" mode — snowflake-ish chevrons + a down arrow. */
    val FanQuiet: ImageVector by lazy {
        mdi(
            "mdi_fan_quiet",
            "M13,19C13,17.59 13.5,16.3 14.3,15.28C14.17,14.97 14.03,14.65 13.86,14.34C14.26,14 " +
                "14.57,13.59 14.77,13.11C15.26,13.21 15.78,13.39 16.25,13.67C17.07,13.25 18,13 " +
                "19,13C20.05,13 21.03,13.27 21.89,13.74C21.95,13.37 22,12.96 22,12.5C22,8.92 " +
                "18.03,8.13 14.33,10.13C14,9.73 13.59,9.42 13.11,9.22C13.3,8.29 13.74,7.24 " +
                "14.73,6.75C17.09,5.57 17,2 12.5,2C8.93,2 8.14,5.96 10.13,9.65C9.72,9.97 9.4," +
                "10.39 9.21,10.87C8.28,10.68 7.23,10.25 6.73,9.26C5.56,6.89 2,7 2,11.5C2,15.07 " +
                "5.95,15.85 9.64,13.87C9.96,14.27 10.39,14.59 10.88,14.79C10.68,15.71 10.24," +
                "16.75 9.26,17.24C6.9,18.42 7,22 11.5,22C12.31,22 13,21.78 13.5,21.41C13.19," +
                "20.67 13,19.86 13,19M12,13C11.43,13 11,12.55 11,12S11.43,11 12,11C12.54,11 " +
                "13,11.45 13,12S12.54,13 12,13M19,19.17L22.17,16L23.59,17.41L19,22L14.41,17.41L" +
                "15.83,16L19,19.17",
        )
    }

    /** Numeric fan speeds — HA has no distinct fan-speed glyphs, just the digit itself. */
    val Fan1: ImageVector by lazy { mdi("mdi_fan_1", "M10,7V9H12V17H14V7H10Z") }
    val Fan2: ImageVector by lazy {
        mdi("mdi_fan_2", "M9,7V9H13V11H11A2,2 0 0,0 9,13V17H11L15,17V15H11V13H13A2,2 0 0,0 15,11V9A2,2 0 0,0 13,7H9Z")
    }
    val Fan3: ImageVector by lazy {
        mdi(
            "mdi_fan_3",
            "M15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9C15,7.89 14.1,7 13,7H9V9H13V11H11V13H13V" +
                "15H9V17H13A2,2 0 0,0 15,15",
        )
    }
    val Fan4: ImageVector by lazy { mdi("mdi_fan_4", "M9,7V13H13V17H15V7H13V11H11V7H9Z") }
    val Fan5: ImageVector by lazy {
        mdi("mdi_fan_5", "M9,7V13H13V15H9V17H13A2,2 0 0,0 15,15V13A2,2 0 0,0 13,11H11V9H15V7H9Z")
    }

    /** Swing "off"/"stop" — a slashed fan/oscillation glyph. */
    val SwingOff: ImageVector by lazy {
        mdi(
            "mdi_swing_off",
            "M13,8.1V6.1C18.3,6.6 20,11.4 20,14H23L20.1,16.9L17.2,14H18C18,11.9 16.4,8.6 13,8.1M7.8," +
                "7.1L2.4,1.7L1.1,3L6.3,8.2C4.7,10 4,12.4 4,14H1L5,18L9,14H6C6,12.7 6.6,11 7.9,9.7L" +
                "20.9,22.7L22.2,21.4L9.3,8.7L7.8,7.1M11,6.1L9.5,6.4L11,7.8V6.1Z",
        )
    }

    /** Swing "on"/"swing" — vertical double arrow (the blades oscillating up/down). */
    val SwingOn: ImageVector by lazy {
        mdi(
            "mdi_swing_on",
            "M17.45,17.55L12,23L6.55,17.55L7.96,16.14L11,19.17V4.83L7.96,7.86L6.55,6.45L12,1L17.45," +
                "6.45L16.04,7.86L13,4.83V19.17L16.04,16.14L17.45,17.55Z",
        )
    }

    /** "Dry"/dehumidify hvac mode. */
    val WaterPercent: ImageVector by lazy {
        mdi(
            "mdi_water_percent",
            "M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M" +
                "14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25," +
                "1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25," +
                "14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13," +
                "15.75A1.25,1.25 0 0,1 14.25,14.5Z",
        )
    }

    /** Swing "on"/"swing"/"both" — use [androidx.compose.material.icons.filled.Stop] for "off"/"stop". */
    val ArrowOscillating: ImageVector by lazy {
        mdi(
            "mdi_arrow_oscillating",
            "M6,14H9L5,18L1,14H4C4,11.3 5.7,6.6 11,6.1V8.1C7.6,8.6 6,11.9 6,14M20,14C20,11.3 18.3,6.6 " +
                "13,6.1V8.1C16.4,8.7 18,11.9 18,14H15L19,18L23,14H20Z",
        )
    }

    /** Mushroom-style window shutter, closed — used by [CoverCard] when the cover is closed/partway. */
    val WindowShutterClosed: ImageVector by lazy {
        mdi(
            "mdi_window_shutter",
            "M3,4H21V8H19V20H17V8H7V20H5V8H3V4M8,9H16V11H8V9M8,12H16V14H8V12M8,15H16V17H8V15M8,18H16V20H8V18Z",
        )
    }

    /** Mushroom-style window shutter, fully open — used by [CoverCard] when the cover is 100% open. */
    val WindowShutterOpen: ImageVector by lazy {
        mdi(
            "mdi_window_shutter_open",
            "M3,4H21V8H19V20H17V8H7V20H5V8H3V4M8,9H16V11H8V9Z",
        )
    }

    /** Cover "raise" control — used by [CoverCard] for the open/up button. */
    val CoverUp: ImageVector by lazy {
        mdi(
            "mdi_arrow_up_bold_box",
            "M21,19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H19C20.11,3 21,3.9 21,5V19M13,18V9.5L16.5," +
                "13L17.92,11.58L12,5.66L6.08,11.58L7.5,13L11,9.5V18H13Z",
        )
    }

    /** Cover "lower" control — used by [CoverCard] for the close/down button. */
    val CoverDown: ImageVector by lazy {
        mdi(
            "mdi_arrow_down_bold_box",
            "M3,5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5M11,6V14.5L7.5," +
                "11L6.08,12.42L12,18.34L17.92,12.42L16.5,11L13,14.5V6H11Z",
        )
    }

    /** Mushroom-style lit bulb — used by [LightCard] when the light is on. */
    val LightbulbOn: ImageVector by lazy {
        mdi(
            "mdi_lightbulb",
            "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81," +
                "13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
        )
    }

    /** Mushroom-style unlit (slashed) bulb — used by [LightCard] when the light is off. */
    val LightbulbOff: ImageVector by lazy {
        mdi(
            "mdi_lightbulb_off_outline",
            "M12,2C9.76,2 7.78,3.05 6.5,4.68L16.31,14.5C17.94,13.21 19,11.24 19,9A7,7 0 0,0 12,2M3.28,4L2," +
                "5.27L5.04,8.3C5,8.53 5,8.76 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H14.73L18.73," +
                "22L20,20.72L3.28,4M9,20V21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9Z",
        )
    }

    private fun mdi(
        name: String,
        pathData: String,
    ): ImageVector {
        val nodes = PathParser().parsePathString(pathData).toNodes()
        return ImageVector.Builder(
            name = name,
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
        ).addPath(pathData = nodes, fill = SolidColor(Color.Black)).build()
        // fill color above is irrelevant in practice: Icon(imageVector, tint = ...) always
        // recolors the vector via a tint ColorFilter.
    }
}
