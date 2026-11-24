package com.littlemorning.alarm;
import android.content.*;

public final class AlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        if(intent.getBooleanExtra("daily",false)) {
            try {Config.nextDaily(c);} catch(Exception e) {Config.prefs(c).edit().putBoolean("enabled",false).apply();}
        } else Config.prefs(c).edit().remove("nextTest").apply();
        try { Config.start(c,Config.RING); }
        catch(Exception e) { Config.state(c,"error","启动响铃失败："+e.getMessage()); }
    }
}
