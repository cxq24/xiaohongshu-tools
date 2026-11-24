package com.littlemorning.alarm;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
import android.speech.tts.*;
import java.util.*;

public final class AlarmService extends Service {
    static boolean active;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private TextToSpeech tts;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audio;
    private AudioFocusRequest focus;
    private String phase="idle",currentId="",skipNotes="";
    private int session,index=-1,sequence,speechOffset,baseOffset;
    private boolean ttsReady,ttsFailed,initializing;
    private List<Config.Part> parts=new ArrayList<>();
    private static final int ID=101;
    private static final String CHANNEL="morning-alarm-v1", QUIET="morning-player-v2";
    @Override public IBinder onBind(Intent i){return null;}
    @Override public void onCreate(){super.onCreate();active=true;audio=(AudioManager)getSystemService(AUDIO_SERVICE);NotificationChannel c=new NotificationChannel(CHANNEL,"起床闹钟与播报",NotificationManager.IMPORTANCE_HIGH);c.setDescription("闹钟、贪睡与晨间播放器");c.setSound(null,null);getSystemService(NotificationManager.class).createNotificationChannel(c);NotificationChannel quiet=new NotificationChannel(QUIET,"晨间播放控制",NotificationManager.IMPORTANCE_LOW);quiet.setSound(null,null);getSystemService(NotificationManager.class).createNotificationChannel(quiet);}
    private PendingIntent command(String action,int code){return PendingIntent.getForegroundService(this,code,new Intent(this,AlarmService.class).setAction(action),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    private Notification notification(boolean ringing){
        PendingIntent open=PendingIntent.getActivity(this,5,new Intent(this,AlarmActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        boolean alert=ringing&&!MainActivity.visible&&!AlarmActivity.visible;
        Notification.Builder n=new Notification.Builder(this,alert?CHANNEL:QUIET).setSmallIcon(R.drawable.ic_notification).setContentTitle(ringing?"起床时间到了":Config.prefs(this).getString("nowTitle","晨间播报")).setContentText(ringing?"长按起床，随后听今天的安排":phase.equals("paused")?"已暂停，随时继续":"按你安排的顺序播放").setCategory(Notification.CATEGORY_ALARM).setVisibility(Notification.VISIBILITY_PUBLIC).setOngoing(true).setOnlyAlertOnce(true).setContentIntent(open);
        if(Build.VERSION.SDK_INT>=31)n.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        if(ringing){if(alert)n.setFullScreenIntent(open,true);n.addAction(new Notification.Action.Builder(null,"我起床了",command(Config.SPEAK,11)).build());n.addAction(new Notification.Action.Builder(null,"再睡 5 分钟",command(Config.SNOOZE,12)).build());}
        else{n.addAction(new Notification.Action.Builder(null,phase.equals("paused")?"继续":"暂停",command(phase.equals("paused")?Config.RESUME:Config.PAUSE,14)).build());n.addAction(new Notification.Action.Builder(null,"下一条",command(Config.NEXT,15)).build());}
        n.addAction(new Notification.Action.Builder(null,"结束",command(Config.STOP,13)).build());return n.build();
    }
    private void foreground(boolean ring){if(Build.VERSION.SDK_INT>=29)startForeground(ID,notification(ring),ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(ID,notification(ring));}
    private void publish(String detail){Config.state(this,phase,detail);getSystemService(NotificationManager.class).notify(ID,notification(phase.equals("ringing")));}
    @Override public int onStartCommand(Intent intent,int flags,int startId){String action=intent==null?Config.STOP:intent.getAction();foreground(Config.RING.equals(action)||Config.REFRESH.equals(action)&&phase.equals("ringing"));
        if(Config.REFRESH.equals(action)){if(!phase.equals("ringing")&&!phase.equals("speaking")&&!phase.equals("paused")){stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();}return START_NOT_STICKY;}
        if(Config.STOP.equals(action)){Config.cancelTest(this);finish("idle","已结束，祝你今天顺利。");return START_NOT_STICKY;}
        if(Config.SNOOZE.equals(action)){try{Config.schedule(this,System.currentTimeMillis()+300000,false);Config.prefs(this).edit().putString("nextKind","snooze").apply();finish("idle","再睡 5 分钟，暂不播报。");}catch(Exception e){finish("error","贪睡未设置，请检查准时响铃权限。");}return START_NOT_STICKY;}
        if(Config.PAUSE.equals(action)){pause();return START_NOT_STICKY;}
        if(Config.RESUME.equals(action)){resume();return START_NOT_STICKY;}
        if(Config.NEXT.equals(action)){if(index>=0&&!parts.isEmpty()){phase="speaking";if(ensureAudio())advance();}else finish("idle","没有正在播放的内容。");return START_NOT_STICKY;}
        reset();final int token=++session;
        if(!ensureAudio())return START_NOT_STICKY;
        handler.postDelayed(()->{if(token==session)finish("idle","本次播放已超过 10 分钟，自动结束。");},600000);
        if(Config.RING.equals(action))ring();else{
            Config.cancelTest(this);phase="speaking";Config.prefs(this).edit().putString("nowTitle","准备你的早晨").putString("nowText","正在按你的安排准备播报。").putString("skipNotes","").putInt("part",0).putInt("count",0).putInt("progress",0).apply();publish("正在准备播报");
            new Thread(()->{List<Config.Part> loaded=Config.parts(this);handler.post(()->{if(token!=session)return;parts=loaded;index=-1;if(!phase.equals("paused"))advance();});},"morning-content").start();
        }
        return START_NOT_STICKY;
    }
    private AudioAttributes attributes(){return new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();}
    private boolean ensureAudio(){
        if(focus==null){focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes()).setOnAudioFocusChangeListener(change->{if((change==AudioManager.AUDIOFOCUS_LOSS||change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT)&&(phase.equals("speaking")||phase.equals("ringing")))finish("error","播放被其他音频打断，可以稍后重新试听。");}).build();if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){finish("error","声音被占用，请结束通话或其他播放后重试。");return false;}}
        if(wakeLock==null){wakeLock=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"littlemorning:playback");wakeLock.acquire(600000);}return true;
    }
    private float volume(){return Config.prefs(this).getInt("volume",60)/100f;}
    private void loadPlayer(int resource,boolean loop)throws Exception{player=new MediaPlayer();player.setAudioAttributes(attributes());try(android.content.res.AssetFileDescriptor fd=getResources().openRawResourceFd(resource)){player.setDataSource(fd.getFileDescriptor(),fd.getStartOffset(),fd.getLength());}player.setLooping(loop);player.setVolume(volume(),volume());player.prepare();}
    private void ring(){phase="ringing";Config.prefs(this).edit().putString("skipNotes","").apply();publish("新的一天，在等你。");try{loadPlayer(R.raw.chime,true);player.start();}catch(Exception e){finish("error","闹铃播放失败，请检查音频输出。");}}
    private void skipped(String reason){if(!skipNotes.isEmpty())skipNotes+="\n";skipNotes+=reason;Config.prefs(this).edit().putString("skipNotes",skipNotes).apply();}
    private void advance(){
        stopCurrent();speechOffset=0;phase="speaking";
        while(++index<parts.size()){
            Config.Part part=parts.get(index);
            if(!part.skip.isEmpty()){skipped(part.skip);continue;}
            if(ttsFailed&&!part.key.equals("music")){skipped(part.title+"缺少可用中文语音，已跳过");continue;}
            Config.prefs(this).edit().putString("nowTitle",part.title).putString("nowText",part.text).putInt("part",index+1).putInt("count",parts.size()).putInt("progress",0).apply();publish("正在播放 "+part.title);
            if(part.key.equals("music"))music();else speakPart();return;
        }
        finish("done",parts.isEmpty()?"你选择了一个安静的早晨。":skipNotes.isEmpty()?"今天的安排，听完了。":"已播完可用内容，跳过原因见下方。");
    }
    private void music(){final int token=session,item=index;try{loadPlayer(R.raw.morning_music,false);player.setOnCompletionListener(p->{if(token==session&&index==item)advance();});player.setOnErrorListener((p,a,b)->{if(token==session&&index==item){skipped("本地旋律播放失败，已跳过");advance();}return true;});player.start();musicProgress(token,item);}catch(Exception e){skipped("本地旋律暂不可用，已跳过");advance();}}
    private void musicProgress(int token,int item){handler.postDelayed(()->{if(token!=session||index!=item||player==null)return;try{Config.prefs(this).edit().putInt("progress",player.getCurrentPosition()*100/Math.max(1,player.getDuration())).apply();}catch(Exception ignored){}if(phase.equals("speaking")||phase.equals("paused"))musicProgress(token,item);},400);}
    private void speakPart(){
        if(ttsReady){speakFromOffset();return;}if(ttsFailed){advance();return;}if(initializing)return;
        initializing=true;final int token=session;
        tts=new TextToSpeech(this,status->handler.post(()->{
            if(token!=session||!initializing)return;initializing=false;
            if(status!=TextToSpeech.SUCCESS){voiceFailed();return;}
            int language=tts.setLanguage(Locale.SIMPLIFIED_CHINESE);
            if(language==TextToSpeech.LANG_MISSING_DATA||language==TextToSpeech.LANG_NOT_SUPPORTED){voiceFailed();return;}
            tts.setAudioAttributes(attributes());tts.setSpeechRate(Config.prefs(this).getInt("rate",100)/100f);ttsReady=true;
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){
                public void onStart(String id){}
                public void onDone(String id){handler.post(()->{if(id.equals(currentId)&&phase.equals("speaking"))advance();});}
                public void onError(String id){handler.post(()->{if(id.equals(currentId)&&phase.equals("speaking")){skipped(parts.get(index).title+"语音播放失败，已跳过");advance();}});}
                public void onRangeStart(String id,int start,int end,int frame){handler.post(()->{if(id.equals(currentId)&&index>=0){speechOffset=baseOffset+start;Config.prefs(AlarmService.this).edit().putInt("progress",speechOffset*100/Math.max(1,parts.get(index).text.length())).apply();}});}
            });if(phase.equals("speaking"))speakFromOffset();
        }));
        handler.postDelayed(()->{if(token==session&&initializing){initializing=false;voiceFailed();}},8000);
    }
    private void voiceFailed(){ttsFailed=true;ttsReady=false;if(tts!=null){tts.shutdown();tts=null;}if(index>=0&&index<parts.size())skipped(parts.get(index).title+"缺少可用中文语音，已跳过");if(!phase.equals("paused"))advance();}
    private void speakFromOffset(){if(index<0||index>=parts.size())return;String text=parts.get(index).text;int offset=Math.max(0,Math.min(speechOffset,text.length()));baseOffset=offset;currentId=session+"-"+index+"-"+(++sequence);Bundle args=new Bundle();args.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME,volume());if(tts.speak(text.substring(offset),TextToSpeech.QUEUE_FLUSH,args,currentId)==TextToSpeech.ERROR){skipped(parts.get(index).title+"语音请求失败，已跳过");advance();}}
    private void pause(){if(!phase.equals("speaking")){if(phase.equals("idle"))finish("idle","没有正在播放的内容。");return;}phase="paused";currentId="";if(player!=null)try{player.pause();}catch(Exception ignored){}if(tts!=null)tts.stop();releaseFocus();publish("已暂停，随时继续。");}
    private void resume(){if(!phase.equals("paused")){if(phase.equals("idle"))finish("idle","没有暂停的内容。");return;}if(!ensureAudio())return;phase="speaking";publish("继续播放");if(index<0){if(!parts.isEmpty())advance();return;}if(player!=null){try{player.start();}catch(Exception e){skipped("音乐恢复失败，已跳过");advance();}}else if(ttsFailed)advance();else speakPart();}
    private void stopCurrent(){currentId="";if(player!=null){try{player.stop();}catch(Exception ignored){}player.release();player=null;}if(tts!=null)tts.stop();}
    private void releaseFocus(){if(focus!=null){audio.abandonAudioFocusRequest(focus);focus=null;}if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();wakeLock=null;}
    private void reset(){handler.removeCallbacksAndMessages(null);stopCurrent();if(tts!=null){tts.shutdown();tts=null;}ttsReady=false;ttsFailed=false;initializing=false;releaseFocus();parts=new ArrayList<>();index=-1;skipNotes="";speechOffset=0;}
    private void finish(String state,String detail){session++;phase=state;reset();Config.state(this,state,detail);stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();}
    @Override public void onDestroy(){active=false;session++;reset();if(phase.equals("ringing")||phase.equals("speaking")||phase.equals("paused"))Config.state(this,"idle","播放已结束。");super.onDestroy();}
}
