import groovy.json.JsonSlurper
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jlleitschuh.gradle.ktlint")
    id("io.gitlab.arturbosch.detekt")
}

android {
    namespace = "com.custom.astrion"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.custom.astrion"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.9"
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-beta"
        }
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    lint {
        // Fails the build on lint errors (not just warnings) — matches
        // ktlint/detekt both being "check" tasks that fail the CI job.
        abortOnError = true
        warningsAsErrors = false
        // HTML report is the one worth opening locally; XML is what CI tools
        // parse if you ever wire up annotations on the PR.
        htmlReport = true
        xmlReport = true
        // Baseline: uncomment once you've triaged the current backlog of
        // warnings, to lock in "no new lint issues" without fixing everything
        // that already exists first.
        baseline = file("lint-baseline.xml")
    }
}

ktlint {
    // Matches Android's 4-space/no-wildcard-import conventions instead of
    // ktlint's plain-Kotlin defaults.
    android.set(true)
    verbose.set(true)
    outputToConsole.set(true)
    reporters {
        reporter(org.jlleitschuh.gradle.ktlint.reporter.ReporterType.PLAIN)
        reporter(org.jlleitschuh.gradle.ktlint.reporter.ReporterType.CHECKSTYLE)
    }
}

detekt {
    buildUponDefaultConfig = true
    config.setFrom("$rootDir/config/detekt/detekt.yml")
    // Same reasoning as lint{} above — start permissive, tighten later:
    baseline = file("detekt-baseline.xml")
}

tasks.withType<io.gitlab.arturbosch.detekt.Detekt>().configureEach {
    reports {
        html.required.set(true)
        xml.required.set(true)
        txt.required.set(false)
        sarif.required.set(true) // lets GitHub annotate the PR diff directly
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.02")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.1")
    implementation("org.nanohttpd:nanohttpd:2.3.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}

// ---- Shared i18n string tables ----------------------------------------------
//
// The single source of truth for every user-facing string is the JSON file per
// language at <root>/i18n/<lang>.json — shared with the web dashboard editor
// (docs/, mirrored to assets/docs/ via scripts/sync-i18n.sh). Android string
// resources are generated from those files at build time, so
// res/values*/strings.xml never needs to be hand-edited (and is not committed).
//
// Keys must be valid Android resource names ([a-z0-9_]+); "en" maps to the
// default res/values folder, every other filename to res/values-<lang>/.

abstract class GenerateI18nStringsTask : DefaultTask() {

    @get:InputFiles
    abstract val i18nDir: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun generate() {
        val keyPattern = Regex("[a-z0-9_]+")
        val outDir = outputDir.get().asFile.apply {
            deleteRecursively()
            mkdirs()
        }
        val jsonFiles = i18nDir.get().asFile
            .listFiles { file -> file.isFile && file.extension == "json" }
            ?.sortedBy { it.name }
            .orEmpty()
        for (jsonFile in jsonFiles) {
            @Suppress("UNCHECKED_CAST")
            val strings = JsonSlurper().parse(jsonFile) as Map<String, Any>
            val resDirName = if (jsonFile.nameWithoutExtension == "en") {
                "values"
            } else {
                "values-${jsonFile.nameWithoutExtension}"
            }
            val resDir = outDir.resolve(resDirName).apply { mkdirs() }
            val xml = buildString {
                append("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n")
                append("<resources>\n")
                for ((key, value) in strings) {
                    require(key.matches(keyPattern)) {
                        "Invalid i18n key \"$key\" in ${jsonFile.name}: must be [a-z0-9_]+"
                    }
                    append("    <string name=\"")
                    append(key)
                    append("\">")
                    append(escapeForAndroidXml(value.toString()))
                    append("</string>\n")
                }
                append("</resources>\n")
            }
            resDir.resolve("strings.xml").writeText(xml)
        }
    }

    /** Android string resources escape more than plain XML: apostrophes,
     *  double quotes and backslashes are backslash-escaped, and a leading
     *  '?' or '@' would be parsed as a resource reference. */
    private fun escapeForAndroidXml(value: String): String {
        val escaped = buildString {
            for (ch in value) {
                when (ch) {
                    '&' -> append("&amp;")
                    '<' -> append("&lt;")
                    '>' -> append("&gt;")
                    '\'' -> append("\\'")
                    '"' -> append("\\\"")
                    '\n' -> append("\\n")
                    '\t' -> append("\\t")
                    '\\' -> append("\\\\")
                    else -> append(ch)
                }
            }
        }
        return if (escaped.isNotEmpty() && (escaped[0] == '?' || escaped[0] == '@')) {
            "\\$escaped"
        } else {
            escaped
        }
    }
}

val generateI18nStrings = tasks.register<GenerateI18nStringsTask>("generateI18nStrings") {
    group = "i18n"
    description = "Generates res values/strings.xml (+ locale variants) from the shared i18n/*.json files."
    i18nDir.set(rootProject.layout.projectDirectory.dir("i18n"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.res?.addGeneratedSourceDirectory(
            generateI18nStrings,
            GenerateI18nStringsTask::outputDir
        )
    }
}
