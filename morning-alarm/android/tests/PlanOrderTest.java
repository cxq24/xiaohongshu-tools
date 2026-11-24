package com.littlemorning.alarm;
import java.util.*;
public final class PlanOrderTest {
    public static void main(String[] args){
        expect(null,"weather,music,agenda,reminders");
        expect("music,weather,music,unknown,agenda","music,weather,agenda,reminders");
        expect("reminders,agenda,weather,music","reminders,agenda,weather,music");
        expect("","weather,music,agenda,reminders");
        List<String> old=PlanOrder.parse("weather,agenda,reminders");if(old.size()!=4||!old.get(3).equals("music"))throw new AssertionError("Migration changed old order");
        System.out.println("PASS 5 order cases: defaults, duplicate/unknown cleanup, custom order, empty storage, legacy migration");
    }
    private static void expect(String raw,String result){if(!PlanOrder.join(PlanOrder.parse(raw)).equals(result))throw new AssertionError(raw);}
}
