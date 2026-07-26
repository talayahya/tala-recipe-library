package com.nextclass.app

import android.app.Application
import com.nextclass.app.notify.Notifications

class NextClassApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Notifications.createChannel(this)
    }
}
