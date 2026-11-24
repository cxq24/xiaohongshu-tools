package com.littlemorning.alarm;
import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;

public class StyledActivity extends Activity {
    @Override protected void attachBaseContext(Context base) {
        String theme=Config.prefs(base).getString("theme","system");
        Configuration config=new Configuration(base.getResources().getConfiguration());
        if(!theme.equals("system"))config.uiMode=(config.uiMode&~Configuration.UI_MODE_NIGHT_MASK)|(theme.equals("night")?Configuration.UI_MODE_NIGHT_YES:Configuration.UI_MODE_NIGHT_NO);
        super.attachBaseContext(base.createConfigurationContext(config));
    }
}
