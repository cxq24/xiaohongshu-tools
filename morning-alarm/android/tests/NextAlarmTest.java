package com.littlemorning.alarm;
import java.time.*;
import java.util.TimeZone;

public final class NextAlarmTest {
    private static final TimeZone CHINA=TimeZone.getTimeZone("Asia/Shanghai");
    private static long at(String value){return LocalDateTime.parse(value).atZone(CHINA.toZoneId()).toInstant().toEpochMilli();}
    private static void expect(String now,int days,String expected){long actual=NextAlarm.calculate(at(now),7,30,days,CHINA);if(actual!=at(expected))throw new AssertionError(now+" => "+Instant.ofEpochMilli(actual));}
    public static void main(String[] args){
        expect("2026-11-23T07:29:59",62,"2026-11-23T07:30:00");
        expect("2026-11-23T07:30:00",62,"2026-11-24T07:30:00");
        expect("2026-11-27T08:00:00",62,"2026-11-30T07:30:00");
        expect("2026-11-23T08:00:00",2,"2026-11-30T07:30:00");
        expect("2026-12-31T08:00:00",127,"2027-01-01T07:30:00");
        try{NextAlarm.calculate(0,7,30,0,CHINA);throw new AssertionError("Empty days accepted");}catch(IllegalArgumentException expected){}
        try{NextAlarm.calculate(0,25,30,127,CHINA);throw new AssertionError("Invalid hour accepted");}catch(IllegalArgumentException expected){}
        System.out.println("PASS 7 cases: upcoming minute, exact boundary, weekdays/weekends, weekly repeat, year boundary, invalid inputs");
    }
}
