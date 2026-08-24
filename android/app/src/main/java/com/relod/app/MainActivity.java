package com.relod.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocationStatusPlugin.class);
        registerPlugin(BatteryOptimizationPlugin.class);
        registerPlugin(OemAutostartPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
