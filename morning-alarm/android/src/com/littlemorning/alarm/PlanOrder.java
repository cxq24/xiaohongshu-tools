package com.littlemorning.alarm;
import java.util.*;
public final class PlanOrder {
    public static final List<String> KEYS=Collections.unmodifiableList(Arrays.asList("weather","music","agenda","reminders"));
    public static List<String> parse(String value){List<String> out=new ArrayList<>();if(value!=null)for(String key:value.split(","))if(KEYS.contains(key)&&!out.contains(key))out.add(key);for(String key:KEYS)if(!out.contains(key))out.add(key);return out;}
    public static String join(List<String> list){StringBuilder out=new StringBuilder();for(String s:list){if(out.length()>0)out.append(',');out.append(s);}return out.toString();}
    private PlanOrder(){}
}
