package com.littlemorning.alarm;

import android.animation.*;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.view.accessibility.AccessibilityManager;
import android.widget.*;
import java.text.SimpleDateFormat;
import java.util.*;

public final class AlarmActivity extends StyledActivity {
    private final Handler handler=new Handler(Looper.getMainLooper());
    private TextView clock,step,title,copy,notes;
    private Button pause,next;
    private ProgressBar progress,holdProgress;
    private ValueAnimator hold;
    static boolean visible;
    private boolean pressed;
    private final Runnable holdTrigger=()->{if(pressed){pressed=false;getWindow().getDecorView().performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);wake();}};
    private String kind="";
    private final Runnable tick=new Runnable(){public void run(){update();handler.postDelayed(this,300);}};
    @Override public void onCreate(Bundle saved){super.onCreate(saved);if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);}else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);update();}
    private android.content.SharedPreferences p(){return Config.prefs(this);}
    private void update(){String phase=p().getString("phase","idle");if(phase.equals("idle")&&!kind.isEmpty()&&!kind.equals("done")){finish();return;}String wanted=phase.equals("ringing")?"ring":phase.equals("speaking")||phase.equals("paused")||phase.equals("preparing")?"player":"done";if(!kind.equals(wanted)){kind=wanted;build();}
        if(kind.equals("ring")){Ui.setText(clock,new SimpleDateFormat("HH:mm",Locale.getDefault()).format(new Date()));return;}
        if(kind.equals("player")){int part=p().getInt("part",0),count=p().getInt("count",0);Ui.setText(step,part==0?"为你准备中":(phase.equals("paused")?"已暂停":"正在播放")+" · "+part+" / "+count);Ui.setText(title,p().getString("nowTitle","准备你的早晨"));Ui.setText(copy,p().getString("nowText","正在准备你的内容。"));Ui.setText(pause,phase.equals("paused")?"继续":"暂停");pause.setEnabled(part>0);next.setEnabled(part>0);progress.setProgress(p().getInt("progress",0));String notice=p().getString("skipNotes","");Ui.setText(notes,notice);notes.setVisibility(notice.isEmpty()?View.GONE:View.VISIBLE);}
    }
    private void build(){cancelHold();LinearLayout root=Ui.mount(this);Ui.header(this,root,"早一点",null,null,null);LinearLayout body=Ui.scroll(root);Ui.space(body,24);
        if(kind.equals("ring")){
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);if(Build.VERSION.SDK_INT>=27)setTurnScreenOn(true);else getWindow().addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
            body.addView(Ui.text(this,"起床时间到了",16,R.color.muted));Ui.space(body,24);clock=Ui.text(this,"",104,R.color.ink);clock.setTypeface(android.graphics.Typeface.create("sans-serif-light",0));clock.setLetterSpacing(-.055f);clock.setSingleLine(true);clock.setAutoSizeTextTypeUniformWithConfiguration(64,104,2,android.util.TypedValue.COMPLEX_UNIT_SP);clock.setMinHeight(Ui.dp(this,140));body.addView(clock,new LinearLayout.LayoutParams(-1,-2));Ui.space(body,24);body.addView(Ui.text(this,"不着急。\n新的一天，在等你。",22,R.color.muted));
            Button wake=Ui.button(this,"长按，我起床了",true,()->{if(((AccessibilityManager)getSystemService(ACCESSIBILITY_SERVICE)).isTouchExplorationEnabled())wake();else Toast.makeText(this,"按住片刻，结束闹铃并开始播报",Toast.LENGTH_SHORT).show();});wake.setTextSize(19);wake.setMinHeight(Ui.dp(this,80));wake.setMinimumHeight(Ui.dp(this,80));wake.setContentDescription("长按起床并开始播报。屏幕阅读器可以双击激活。");
            wake.setOnTouchListener((v,event)->{if(event.getAction()==android.view.MotionEvent.ACTION_DOWN){pressed=true;holdProgress.setProgress(0);handler.postDelayed(holdTrigger,800);float scale=Settings.Global.getFloat(getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,1);if(scale>0){hold=ValueAnimator.ofInt(0,100);hold.setDuration(Math.max(1,(long)(800/scale)));hold.addUpdateListener(a->holdProgress.setProgress((Integer)a.getAnimatedValue()));hold.start();}return true;}if(event.getAction()==android.view.MotionEvent.ACTION_MOVE&&(event.getX()<0||event.getX()>v.getWidth()||event.getY()<0||event.getY()>v.getHeight())){cancelHold();return true;}if(event.getAction()==android.view.MotionEvent.ACTION_UP||event.getAction()==android.view.MotionEvent.ACTION_CANCEL){cancelHold();return true;}return true;});root.addView(wake);Ui.space(root,8);holdProgress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);holdProgress.setMax(100);root.addView(holdProgress,new LinearLayout.LayoutParams(-1,Ui.dp(this,3)));Ui.space(root,12);TextView hint=Ui.text(this,"停止闹铃，随后自动播报。",14,R.color.muted);hint.setGravity(Gravity.CENTER);root.addView(hint);Ui.space(root,8);root.addView(Ui.quiet(this,"再睡 5 分钟",()->{Config.start(this,Config.SNOOZE);finish();}));
        }else if(kind.equals("player")){
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);step=Ui.text(this,"",14,R.color.muted);body.addView(step);Ui.space(body,28);title=Ui.text(this,"",18,R.color.accent);body.addView(title);Ui.space(body,20);copy=Ui.text(this,"",28,R.color.ink);copy.setLineSpacing(Ui.dp(this,10),1);body.addView(copy);Ui.space(body,28);notes=Ui.text(this,"",14,R.color.muted);body.addView(notes);
            Ui.space(root,20);progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);root.addView(progress,new LinearLayout.LayoutParams(-1,Ui.dp(this,3)));Ui.space(root,16);LinearLayout actions=Ui.row(this);pause=Ui.button(this,"暂停",true,()->Config.start(this,p().getString("phase","").equals("paused")?Config.RESUME:Config.PAUSE));addControl(actions,pause,false);next=Ui.button(this,"下一条",false,()->Config.start(this,Config.NEXT));addControl(actions,next,true);addControl(actions,Ui.button(this,"结束",false,()->{Config.start(this,Config.STOP);finish();}),true);root.addView(actions);
        }else{
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);Ui.title(body,p().getString("phase","").equals("error")?"这次没能顺利播放。":"早安，出发吧。",p().getString("detail","今天也值得好好开始。"));String skipped=p().getString("skipNotes","");if(!skipped.isEmpty()){Ui.section(body,"这次跳过的内容");body.addView(Ui.text(this,skipped,16,R.color.muted));if(skipped.contains("语音")){Ui.space(body,20);body.addView(Ui.quiet(this,"前往中文语音设置",()->{try{startActivity(new android.content.Intent("com.android.settings.TTS_SETTINGS"));}catch(Exception e){Toast.makeText(this,"请在手机设置中启用中文朗读语音",Toast.LENGTH_LONG).show();}}));}}root.addView(Ui.button(this,"开始我的一天",true,()->finish()));
        }
        if(Settings.Global.getFloat(getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,1)>0){root.setAlpha(0);root.animate().alpha(1).setDuration(180).start();}
    }
    private void addControl(LinearLayout row,Button b,boolean gap){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);if(gap)lp.leftMargin=Ui.dp(this,8);row.addView(b,lp);}
    private void cancelHold(){pressed=false;handler.removeCallbacks(holdTrigger);if(hold!=null){hold.cancel();hold=null;}if(holdProgress!=null)holdProgress.setProgress(0);}
    private void wake(){cancelHold();Config.start(this,Config.SPEAK);}
    @Override protected void onResume(){super.onResume();visible=true;if(AlarmService.active)Config.start(this,Config.REFRESH);handler.post(tick);}
    @Override protected void onPause(){visible=false;cancelHold();handler.removeCallbacks(tick);super.onPause();}
    @Override public void onBackPressed(){Config.start(this,Config.STOP);super.onBackPressed();}
}
