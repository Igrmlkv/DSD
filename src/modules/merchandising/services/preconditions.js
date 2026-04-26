import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera } from 'expo-camera';
import useSettingsStore from '../../../store/settingsStore';
import useAuthStore from '../../../store/authStore';
import { getActiveAuditTemplate, getCustomerById } from '../../../database';
import { logWarning } from '../../../services/loggerService';
import { haversineMeters } from '../../../services/locationService';

const TAG = 'merch.preconditions';
const MIN_FREE_BYTES = 50 * 1024 * 1024; // 50 MB (spec §4.6)

// Checks all preconditions for starting an audit (spec §4.6).
// Returns { ok: true } or { ok: false, reasons: [{ code, label }] }.
// Caller (UI) should render reasons as a blocking screen with instructions.
//
// When settingsStore.merchTestBypass is true, location/geofence/camera checks are skipped
// so the flow can be exercised on iOS Simulator / Android emulator. Auth, outlet type
// resolution, and template availability are still enforced.
export async function checkAuditPreconditions({ routePoint, customerId } = {}) {
  const reasons = [];
  const settings = useSettingsStore.getState();
  const bypass = !!settings.merchTestBypass;

  // 1. SFA session valid
  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated || !auth.user) {
    reasons.push({ code: 'auth', label: 'merchAudit.precond.auth' });
    return { ok: false, reasons };
  }

  // 2. Visit/route point exists and is in_progress
  if (!bypass && (!routePoint || routePoint.status !== 'in_progress')) {
    reasons.push({ code: 'visit', label: 'merchAudit.precond.visit' });
  }

  // 3. Geofence — distance to outlet ≤ geofenceRadiusM
  if (!bypass) {
    const radius = settings.geofenceRadiusM;
    try {
      const { status: locStatus } = await Location.getForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        reasons.push({ code: 'location_permission', label: 'merchAudit.precond.locationPerm' });
      } else if (routePoint && (routePoint.latitude != null) && (routePoint.longitude != null)) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const dist = haversineMeters(
          pos.coords.latitude, pos.coords.longitude,
          routePoint.latitude, routePoint.longitude,
        );
        if (dist > radius) {
          reasons.push({
            code: 'geofence',
            label: 'merchAudit.precond.geofence',
            extra: { distance: Math.round(dist), radius },
          });
        }
      }
    } catch (e) {
      logWarning(TAG, `Geofence check failed: ${e.message}`);
      reasons.push({ code: 'location_unavailable', label: 'merchAudit.precond.locationUnavailable' });
    }
  }

  // 4. Master data — outlet type known + active template exists.
  // In bypass mode we fall back to 'retail' when the customer card has no type.
  const customer = customerId ? await getCustomerById(customerId) : null;
  let outletType = mapCustomerTypeToOutletType(customer?.customer_type);
  if (!outletType && bypass) outletType = 'retail';
  if (!outletType) {
    reasons.push({ code: 'outlet_type', label: 'merchAudit.precond.outletType' });
  } else {
    const tpl = await getActiveAuditTemplate(outletType);
    if (!tpl) {
      reasons.push({ code: 'template', label: 'merchAudit.precond.template', extra: { outletType } });
    }
  }

  // 5. Camera permission
  if (!bypass) {
    try {
      const { status: camStatus } = await Camera.getCameraPermissionsAsync();
      if (camStatus !== 'granted') {
        reasons.push({ code: 'camera_permission', label: 'merchAudit.precond.cameraPerm' });
      }
    } catch (e) {
      reasons.push({ code: 'camera_permission', label: 'merchAudit.precond.cameraPerm' });
    }
  }

  // 6. Free disk space ≥ 50 MB
  try {
    const free = await FileSystem.getFreeDiskStorageAsync();
    if (free != null && free < MIN_FREE_BYTES) {
      reasons.push({ code: 'storage', label: 'merchAudit.precond.storage' });
    }
  } catch { /* best-effort */ }

  return { ok: reasons.length === 0, reasons, outletType, customer, bypass };
}

// Maps existing customer_type ('retail'|'wholesale'|'horeca') to outlet_type
// used by audit_templates. Wholesale customers are treated as retail; HoReCa
// is split into bar/cafe based on a heuristic — final mapping should come
// from a backoffice-managed Outlet Types catalogue (spec §8.4).
export function mapCustomerTypeToOutletType(customerType) {
  switch (customerType) {
    case 'retail':
    case 'wholesale':
      return 'retail';
    case 'horeca':
      return 'horeca_cafe';
    default:
      return null;
  }
}

