package com.relod.app;

import android.content.Context;
import android.location.LocationManager;
import androidx.core.location.LocationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Reports the actual system Location toggle state via
// LocationManagerCompat.isLocationEnabled — instant and definitive, unlike
// inferring it from whether a GPS fix arrives in time (a slow fix and a
// disabled provider are indistinguishable that way, which caused the
// carrier live-tracking status to flip incorrectly in both directions).
@CapacitorPlugin(name = "LocationStatus")
public class LocationStatusPlugin extends Plugin {
    @PluginMethod
    public void isEnabled(PluginCall call) {
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        JSObject ret = new JSObject();
        ret.put("enabled", LocationManagerCompat.isLocationEnabled(lm));
        call.resolve(ret);
    }
}
