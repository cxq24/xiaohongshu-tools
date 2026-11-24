package com.littlemorning.alarm;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CalendarContract;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.TimeZone;

final class Config {
    static final String RING="ring", SPEAK="speak", STOP="stop", SNOOZE="snooze", PAUSE="pause", RESUME="resume", NEXT="next", REFRESH="refresh";
    static android.content.SharedPreferences prefs(Context c) { return c.getSharedPreferences("morning-v1", Context.MODE_PRIVATE); }
    static AlarmManager manager(Context c) { return (AlarmManager)c.getSystemService(Context.ALARM_SERVICE); }
    static boolean exact(Context c) { return Build.VERSION.SDK_INT < 31 || manager(c).canScheduleExactAlarms(); }
    static PendingIntent alarmIntent(Context c, int id, boolean daily) {
        return PendingIntent.getBroadcast(c, id, new Intent(c, AlarmReceiver.class).setAction(RING).putExtra("daily", daily), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context c, long when, boolean daily) {
        if (!exact(c)) throw new SecurityException("请先允许准时响铃权限");
        PendingIntent show=PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        manager(c).setAlarmClock(new AlarmManager.AlarmClockInfo(when, show), alarmIntent(c, daily?1:2, daily));
        android.content.SharedPreferences.Editor edit=prefs(c).edit().putLong(daily?"nextDaily":"nextTest",when);if(!daily)edit.putString("nextKind","test");edit.apply();
    }
    static void nextDaily(Context c) {
        manager(c).cancel(alarmIntent(c,1,true));
        prefs(c).edit().remove("nextDaily").apply();
        if (prefs(c).getBoolean("enabled",false)) {
            long next=NextAlarm.calculate(System.currentTimeMillis(), prefs(c).getInt("hour",7), prefs(c).getInt("minute",30), prefs(c).getInt("days",62), TimeZone.getDefault());
            schedule(c,next,true);
        }
    }
    static void cancelTest(Context c) { manager(c).cancel(alarmIntent(c,2,false));prefs(c).edit().remove("nextTest").remove("nextKind").apply(); }
    static void state(Context c, String phase, String detail) { prefs(c).edit().putString("phase",phase).putString("detail",detail).apply(); }
    static String title(String key){switch(key){case "weather":return "天气示例";case "music":return "晨间旋律";case "agenda":return "今日日程";default:return "给自己的提醒";}}
    static boolean enabled(Context c,String key){return prefs(c).getBoolean(key,!key.equals("music"));}
    static List<String> order(Context c){return PlanOrder.parse(prefs(c).getString("order","weather,music,agenda,reminders"));}
    static String summary(Context c){List<String> active=new ArrayList<>();for(String key:order(c))if(enabled(c,key))active.add(key.equals("weather")?"天气示例":key.equals("music")?"音乐":key.equals("agenda")?"日程":"提醒");return active.isEmpty()?"今天留一个安静的早晨":String.join(" → ",active);}
    static void preset(Context c,String key){boolean soft=key.equals("soft");prefs(c).edit().putString("preset",key).putBoolean("weather",true).putBoolean("music",soft).putBoolean("agenda",!soft).putBoolean("reminders",soft).putString("order",soft?"music,weather,reminders,agenda":"weather,agenda,reminders,music").apply();}
    static final class Part {final String key,title,text,skip;Part(String k,String t,String s){key=k;title=Config.title(k);text=t;skip=s;}}
    static List<Part> parts(Context c){
        android.content.SharedPreferences p=prefs(c);List<Part> parts=new ArrayList<>();
        for(String key:order(c))if(enabled(c,key)){
            String text="",skip="";
            switch(key){
            case "weather":text=p.getString("city","上海")+"的天气示例。12 到 19 度，下午有雨，出门记得带伞。这是演示天气。";break;
            case "music":text="给自己 20 秒，\n慢慢醒来。";break;
            case "reminders":text=p.getString("reminderText","出门前记得带钥匙，给自己留一点吃早餐的时间。").trim();if(text.isEmpty())skip="提醒为空，已跳过";break;
            case "agenda":
                if(p.getString("agendaSource","manual").equals("calendar")){
                    if(c.checkSelfPermission("android.permission.READ_CALENDAR")!=PackageManager.PERMISSION_GRANTED){skip="日历未授权，已跳过";break;}
                    try{
                        Calendar start=Calendar.getInstance();start.set(Calendar.HOUR_OF_DAY,0);start.set(Calendar.MINUTE,0);start.set(Calendar.SECOND,0);start.set(Calendar.MILLISECOND,0);Calendar end=(Calendar)start.clone();end.add(Calendar.DATE,1);
                        android.net.Uri.Builder uri=CalendarContract.Instances.CONTENT_URI.buildUpon();ContentUris.appendId(uri,start.getTimeInMillis());ContentUris.appendId(uri,end.getTimeInMillis());StringBuilder result=new StringBuilder();int count=0;
                        try(Cursor rows=c.getContentResolver().query(uri.build(),new String[]{CalendarContract.Instances.TITLE,CalendarContract.Instances.BEGIN,CalendarContract.Instances.ALL_DAY},null,null,CalendarContract.Instances.BEGIN+" ASC")){
                            if(rows!=null)while(rows.moveToNext()&&count++<5){if(result.length()>0)result.append("。\n");result.append(rows.getInt(2)==1?"全天":new SimpleDateFormat("HH:mm",Locale.CHINA).format(new Date(rows.getLong(1)))).append("，").append(rows.getString(0)==null?"未命名日程":rows.getString(0));}
                        }
                        text=result.toString();if(text.isEmpty())skip="今天没有日历日程，已跳过";
                    }catch(Exception e){skip="日历暂时无法读取，已跳过";}
                }else{text=p.getString("agendaText","10 点项目会议").trim();if(text.isEmpty())skip="手动日程为空，已跳过";}
                break;
            }
            parts.add(new Part(key,text,skip));
        }
        return parts;
    }
    static String script(Context c){StringBuilder s=new StringBuilder();for(Part p:parts(c))if(p.skip.isEmpty()&&!p.key.equals("music"))s.append(p.text).append("。\n");return s.toString();}
    static void start(Context c,String action) {
        if(SPEAK.equals(action))prefs(c).edit().putString("phase","preparing").putString("nowTitle","准备你的早晨").putString("nowText","正在按你的安排准备播报。").putString("skipNotes","").putInt("part",0).putInt("count",0).putInt("progress",0).apply();
        if(STOP.equals(action)||SNOOZE.equals(action))state(c,"idle",STOP.equals(action)?"正在结束播放…":"正在安排 5 分钟后提醒…");
        Intent intent=new Intent(c,AlarmService.class).setAction(action);
        try{c.startForegroundService(intent);}catch(RuntimeException e){state(c,"error","未能启动播放，请检查手机的后台运行设置。");}
    }
}
