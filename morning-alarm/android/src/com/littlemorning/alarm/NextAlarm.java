package com.littlemorning.alarm;

import java.util.Calendar;
import java.util.TimeZone;

/** Calendar weekdays: Sunday=1; bit zero represents Sunday. */
public final class NextAlarm {
    public static long calculate(long now, int hour, int minute, int days, TimeZone zone) {
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || (days & 127) == 0)
            throw new IllegalArgumentException("Invalid time or empty weekdays");
        Calendar candidate = Calendar.getInstance(zone);
        candidate.setTimeInMillis(now);
        for (int offset = 0; offset < 8; offset++) {
            Calendar day = (Calendar) candidate.clone();
            day.add(Calendar.DATE, offset);
            day.set(Calendar.HOUR_OF_DAY, hour);
            day.set(Calendar.MINUTE, minute);
            day.set(Calendar.SECOND, 0);
            day.set(Calendar.MILLISECOND, 0);
            if ((days & (1 << (day.get(Calendar.DAY_OF_WEEK) - 1))) != 0 && day.getTimeInMillis() > now)
                return day.getTimeInMillis();
        }
        throw new IllegalStateException("No matching weekday");
    }
    private NextAlarm() {}
}
