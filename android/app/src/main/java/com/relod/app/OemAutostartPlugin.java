package com.relod.app;

import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Beyond stock Android's battery-optimization exemption (see
// BatteryOptimizationPlugin), several OEMs — Xiaomi, Vivo, Oppo/Realme,
// Huawei/Honor, Letv, Asus, OnePlus — layer their own proprietary
// "autostart" / background-permission toggle on top, which is what actually
// lets the live-tracking service survive being backgrounded for a full
// shift on those phones. There is no public Android API for this; these
// are undocumented OEM activities that shift between firmware versions, so
// every candidate is tried in order and failures are silently skipped,
// falling back to the app's own settings page if none resolve.
@CapacitorPlugin(name = "OemAutostart")
public class OemAutostartPlugin extends Plugin {

    @PluginMethod
    public void getManufacturer(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("manufacturer", Build.MANUFACTURER);
        ret.put("isKnownRestrictive", isKnownRestrictiveOem());
        call.resolve(ret);
    }

    @PluginMethod
    public void openAutostartSettings(PluginCall call) {
        boolean opened = tryKnownIntents();
        if (!opened) opened = openAppDetailsSettings();
        call.resolve(new JSObject().put("opened", opened));
    }

    private boolean isKnownRestrictiveOem() {
        String mfr = Build.MANUFACTURER.toLowerCase();
        return mfr.contains("xiaomi") || mfr.contains("vivo") || mfr.contains("oppo")
            || mfr.contains("realme") || mfr.contains("huawei") || mfr.contains("honor")
            || mfr.contains("letv") || mfr.contains("asus") || mfr.contains("oneplus");
    }

    private boolean tryKnownIntents() {
        String mfr = Build.MANUFACTURER.toLowerCase();
        String[][] candidates;

        if (mfr.contains("xiaomi")) {
            candidates = new String[][] {
                { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
            };
        } else if (mfr.contains("vivo")) {
            candidates = new String[][] {
                { "com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" },
                { "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity" },
                { "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager" },
                { "com.vivo.abe", "com.vivo.applicationbehaviorengine.ui.ExcessivePowerManagerActivity" },
            };
        } else if (mfr.contains("oppo") || mfr.contains("realme")) {
            candidates = new String[][] {
                { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
                { "com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity" },
                { "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity" },
            };
        } else if (mfr.contains("huawei") || mfr.contains("honor")) {
            candidates = new String[][] {
                { "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
                { "com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity" },
            };
        } else if (mfr.contains("letv")) {
            candidates = new String[][] {
                { "com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity" },
            };
        } else if (mfr.contains("asus")) {
            candidates = new String[][] {
                { "com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity" },
            };
        } else if (mfr.contains("oneplus")) {
            candidates = new String[][] {
                { "com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity" },
            };
        } else {
            candidates = new String[][] {};
        }

        for (String[] c : candidates) {
            try {
                Intent intent = new Intent();
                intent.setComponent(new ComponentName(c[0], c[1]));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                return true;
            } catch (Exception e) {
                // firmware doesn't have this activity — try the next candidate
            }
        }
        return false;
    }

    private boolean openAppDetailsSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
