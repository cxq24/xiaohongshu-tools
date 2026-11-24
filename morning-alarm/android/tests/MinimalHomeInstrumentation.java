package com.littlemorning.alarm;

import android.app.*;
import android.content.*;
import android.os.*;
import android.graphics.*;
import android.view.*;
import android.widget.*;
import java.io.*;
import java.util.concurrent.*;

/** Disposable emulator only. Exercises moved controls and seeds preferences before upgrading. */
public final class MinimalHomeInstrumentation extends Instrumentation {
    private String mode;
    private Context target;
    private MainActivity home;
    private File shots;
    @Override public void onCreate(Bundle args){super.onCreate(args);mode=args==null?"verify":args.getString("mode","verify");start();}
    private void main(Runnable action){final Throwable[] error={null};runOnMainSync(()->{try{action.run();}catch(Throwable t){error[0]=t;}});if(error[0]!=null)throw new AssertionError(error[0]);}
    private View find(View root,String text){if(root instanceof TextView&&text.equals(((TextView)root).getText().toString()))return root;if(root instanceof ViewGroup)for(int i=0;i<((ViewGroup)root).getChildCount();i++){View child=find(((ViewGroup)root).getChildAt(i),text);if(child!=null)return child;}return null;}
    private View desc(View root,String prefix){if(root.getContentDescription()!=null&&root.getContentDescription().toString().startsWith(prefix))return root;if(root instanceof ViewGroup)for(int i=0;i<((ViewGroup)root).getChildCount();i++){View child=desc(((ViewGroup)root).getChildAt(i),prefix);if(child!=null)return child;}return null;}
    private <T> T type(View root,Class<T> kind){if(kind.isInstance(root))return kind.cast(root);if(root instanceof ViewGroup)for(int i=0;i<((ViewGroup)root).getChildCount();i++){T child=type(((ViewGroup)root).getChildAt(i),kind);if(child!=null)return child;}return null;}
    private View view(Activity activity,String text){final View[] out={null};main(()->out[0]=find(activity.getWindow().getDecorView(),text));if(out[0]==null)throw new AssertionError("Missing UI: "+text);return out[0];}
    private void click(Activity a,String text){View v=view(a,text);main(()->{View owner=v;while(!owner.isClickable()&&owner.getParent() instanceof View)owner=(View)owner.getParent();if(!owner.performClick())throw new AssertionError("Not clickable: "+text);});waitForIdleSync();}
    private void clickDesc(String prefix){main(()->{View v=desc(home.getWindow().getDecorView(),prefix);if(v==null)throw new AssertionError("Missing action: "+prefix);v.performClick();});waitForIdleSync();}
    private void minimal(){main(()->{View root=home.getWindow().getDecorView();for(String removed:new String[]{"试听我的早晨","体验","关掉闹钟，就按这个顺序开始。","编辑  ›"})if(find(root,removed)!=null)throw new AssertionError("Home still contains "+removed);View summary=desc(root,"晨间播报，");if(summary==null||summary.getHeight()<Ui.dp(target,48))throw new AssertionError("Broadcast summary missing or too small");TextView copy=type(summary,TextView.class);if(copy.getMaxLines()!=1)throw new AssertionError("Summary must remain one line");});}
    private void shot(String name)throws Exception{waitForIdleSync();SystemClock.sleep(600);for(int attempt=0;attempt<4;attempt++){final int[] size={0,0};main(()->{size[0]=home.getWindow().getDecorView().getWidth();size[1]=home.getWindow().getDecorView().getHeight();});Bitmap b=Bitmap.createBitmap(size[0],size[1],Bitmap.Config.ARGB_8888);CountDownLatch latch=new CountDownLatch(1);final int[] result={-1};main(()->PixelCopy.request(home.getWindow(),b,r->{result[0]=r;latch.countDown();},new Handler(Looper.getMainLooper())));if(!latch.await(10,TimeUnit.SECONDS))throw new AssertionError("Screenshot timeout");if(result[0]==PixelCopy.SUCCESS){try(FileOutputStream out=new FileOutputStream(new File(shots,name+".png"))){b.compress(Bitmap.CompressFormat.PNG,100,out);}b.recycle();return;}b.recycle();SystemClock.sleep(400);}throw new AssertionError("No rendered screenshot");}
    private void waitForMusic(){long until=SystemClock.elapsedRealtime()+15000;while(SystemClock.elapsedRealtime()<until){if("晨间旋律".equals(Config.prefs(target).getString("nowTitle","")))return;SystemClock.sleep(100);}throw new AssertionError("Preview did not reach local music");}
    private void recreateHome(){ActivityMonitor monitor=addMonitor(MainActivity.class.getName(),null,false);main(()->home.recreate());Activity next=waitForMonitorWithTimeout(monitor,20000);removeMonitor(monitor);if(!(next instanceof MainActivity))throw new AssertionError("Activity did not recreate");home=(MainActivity)next;waitForIdleSync();}
    @Override public void onStart(){Bundle report=new Bundle();try{
        target=getTargetContext();android.content.SharedPreferences p=Config.prefs(target);
        if(mode.equals("seed")){p.edit().putBoolean("onboarded_v2",true).putBoolean("enabled",false).putInt("hour",6).putInt("minute",45).putString("reminderText","保留设置测试").commit();Config.nextDaily(target);Config.cancelTest(target);report.putString("stream","PASS: upgrade fixture seeded\n");finish(Activity.RESULT_OK,report);return;}
        if(p.getInt("hour",-1)!=6||p.getInt("minute",-1)!=45||!p.getString("reminderText","").equals("保留设置测试"))throw new AssertionError("Upgrade lost saved preferences");
        if(!target.getPackageManager().getPackageInfo(target.getPackageName(),0).versionName.equals("0.2.1"))throw new AssertionError("Wrong APK under test");
        p.edit().putInt("hour",7).putInt("minute",30).putInt("days",62).putBoolean("enabled",false).putString("theme","day").putString("order","weather,agenda,reminders,music").putBoolean("weather",true).putBoolean("agenda",true).putBoolean("reminders",false).putBoolean("music",false).apply();
        shots=new File(target.getExternalFilesDir(null),"minimal-home-previews");shots.mkdirs();for(File f:shots.listFiles())if(f.getName().endsWith(".png"))f.delete();
        home=(MainActivity)startActivitySync(new Intent(target,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));waitForIdleSync();view(home,"07:30");minimal();shot("home-day");
        click(home,"07:30");main(()->{TimePicker picker=type(home.getWindow().getDecorView(),TimePicker.class);picker.setHour(8);picker.setMinute(15);});click(home,"保存时间");view(home,"08:15");if(p.getInt("hour",-1)!=8||p.getInt("minute",-1)!=15)throw new AssertionError("Editing time failed");
        clickDesc("启用起床闹钟");if(!p.getBoolean("enabled",false)||p.getLong("nextDaily",0)<=System.currentTimeMillis())throw new AssertionError("Switch did not schedule alarm");clickDesc("启用起床闹钟");if(p.getBoolean("enabled",true)||p.getLong("nextDaily",0)!=0)throw new AssertionError("Switch did not cancel alarm");
        clickDesc("晨间播报，");view(home,"试听我的早晨");shot("broadcast-editor");
        p.edit().putBoolean("weather",false).putBoolean("agenda",false).putBoolean("reminders",false).putBoolean("music",true).apply();ActivityMonitor playerMonitor=addMonitor(AlarmActivity.class.getName(),null,false);click(home,"试听我的早晨");Activity player=waitForMonitorWithTimeout(playerMonitor,20000);removeMonitor(playerMonitor);if(!(player instanceof AlarmActivity))throw new AssertionError("Moved preview did not open player");waitForMusic();click(player,"结束");SystemClock.sleep(400);view(home,"试听我的早晨");main(()->home.onBackPressed());waitForIdleSync();minimal();
        click(home,"设置");click(home,"体验响铃");view(home,"10 秒后体验起床");shot("alarm-test-settings");main(()->Config.schedule(target,System.currentTimeMillis()+60000,false));click(home,"取消体验 / 贪睡");if(p.getLong("nextTest",0)!=0)throw new AssertionError("Moved cancel control failed");
        click(home,"10 秒后体验起床");minimal();long delta=p.getLong("nextTest",0)-System.currentTimeMillis();if(delta<=0||delta>11000)throw new AssertionError("Moved test control failed");main(()->Config.cancelTest(target));
        Config.preset(target,"fast");p.edit().putInt("hour",7).putInt("minute",30).putString("theme","night").apply();recreateHome();minimal();if(home.getColor(R.color.bg)!=Color.rgb(18,24,21))throw new AssertionError("Night mode failed");shot("home-night");
        ActivityMonitor font=addMonitor(MainActivity.class.getName(),null,false);try(ParcelFileDescriptor fd=getUiAutomation().executeShellCommand("settings put system font_scale 1.3");FileInputStream in=new FileInputStream(fd.getFileDescriptor())){while(in.read()!=-1){}}Activity scaled=waitForMonitorWithTimeout(font,20000);removeMonitor(font);if(!(scaled instanceof MainActivity))throw new AssertionError("Font recreation failed");home=(MainActivity)scaled;waitForIdleSync();if(Math.abs(home.getResources().getConfiguration().fontScale-1.3)>.05)throw new AssertionError("Font scale failed");minimal();shot("home-large-font");
        report.putString("stream","PASS: 0.2-to-0.2.1 preferences retained, minimal home, single-line summary, clock editing, real alarm switch scheduling/cancellation, preview moved to editor and playable, test/cancel moved to settings, day/night and 130% font layout\n");finish(Activity.RESULT_OK,report);
    }catch(Throwable t){StringWriter trace=new StringWriter();t.printStackTrace(new PrintWriter(trace));report.putString("stream","FAIL: "+trace+"\n");finish(Activity.RESULT_CANCELED,report);}}
}
