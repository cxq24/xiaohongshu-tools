package com.littlemorning.alarm;
import android.content.*;

public final class RestoreReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        try { Config.nextDaily(c); }
        catch(Exception e) { Config.state(c,"error","请打开 App 重新允许准时响铃权限"); }
    }
}
