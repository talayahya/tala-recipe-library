# NextClass

A no-root Android app that shows the current and next school subject for **SPT 11 - 1A**
and notifies the student a configurable number of minutes before each period begins —
but **only** while the "I'm in School" master toggle is enabled.

- **Language:** Kotlin · **UI:** Jetpack Compose + Material 3 (Material You)
- **Architecture:** MVVM (ViewModel + StateFlow), single-activity Compose
- **minSdk 26 (Android 8.0)** · targetSdk 35 · no root, no network, no privileged APIs

## The master rule

The **I'm in School** toggle is the single switch for all upcoming-subject notifications:

- **ON** → an exact `AlarmManager` alarm is armed for every remaining period today,
  firing `notify_minutes_before` minutes before each start time.
- **OFF** → every pending alarm is cancelled immediately and **no upcoming-subject
  notification is ever posted**. The in-app schedule still works; the phone stays silent.

The toggle state (and all settings) is stored in DataStore so it survives restarts, and
alarms are re-armed on reboot **only if the toggle is ON**. As defense-in-depth, the alarm
receiver re-reads the toggle before posting, so a stale alarm can never break the rule.

## Project layout

```
app/src/main/java/com/nextclass/app/
  NextClassApp.kt          Application — creates the notification channel
  MainActivity.kt          Single activity, Compose entry + navigation
  data/                    Models, bundled Schedule, ScheduleRepository, SettingsRepository (DataStore)
  alarm/                   AlarmScheduler, AlarmReceiver, BootReceiver
  notify/                  Notifications (channel, builders, permission helpers)
  ui/                      NowScreen, SettingsScreen, NowViewModel, theme/, components/
```

The full timetable is bundled as a static Kotlin object in `data/Schedule.kt` — each
weekday carries its own distinct start/end times exactly as provided (Monday's grid
differs from Tue–Fri; Wed–Fri use "Effective Communication"; Thu/Fri add Homeroom).

## Building

Open the `nextclass-android/` folder in Android Studio (Ladybug or newer) and run the
`app` configuration, or from the command line:

```bash
cd nextclass-android
./gradlew assembleDebug
```

> The Gradle wrapper and Android Gradle Plugin are fetched from the internet on the first
> build, so the initial build needs network access to `services.gradle.org` and Google's
> Maven repository.

## Permissions

- `POST_NOTIFICATIONS` — requested at runtime on Android 13+ when the toggle turns ON.
- `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` — on Android 12+ the app prompts to open the
  system exact-alarm settings if the capability isn't granted.
- `RECEIVE_BOOT_COMPLETED` — to re-arm alarms after reboot (only when the toggle is ON).

## Manual test matrix

1. **OFF = silent.** With the toggle OFF, set the device clock to just before a period.
   Confirm **no** notification appears.
2. **ON = timed alert.** Turn the toggle ON, grant notification + exact-alarm permission.
   Confirm a notification fires `notify_minutes_before` before the next period.
3. **Correct day.** The Now screen shows the right current/next subject and mode badge for
   the actual weekday. Swipe the day tabs and confirm Monday's times differ from Tuesday's.
4. **Persistence.** Change `notify_minutes_before`, toggle OFF/ON, kill and reopen the app —
   the toggle and settings are retained.
5. **Reboot.** With the toggle ON, reboot the device; alarms are re-armed. With it OFF,
   no alarms exist after reboot.
6. **Breaks.** With "Notify for breaks" OFF, Health Breaks produce no alert; enabling it
   adds break alerts.

## Notes / limitations

- The optional persistent "current class" notification is refreshed while the app is in the
  foreground; the timed pre-class alerts are the alarm-driven, always-on path.
- No home-screen widget or per-subject accent colors in this build (deferred stretch goals).
