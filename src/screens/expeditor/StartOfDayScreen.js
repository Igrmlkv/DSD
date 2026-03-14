import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Animated, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import {
  updateTourCheckin, saveVehicleCheckItems, getVehicleByDriver,
  hasVerifiedLoadingTrip, getOrCreateTodayCheckin, getVehicleCheckItems,
} from '../../database';
import VehicleCheckStep from './VehicleCheckStep';
import OdometerStep from './OdometerStep';
import CheckOutCashStep from './CheckOutCashStep';
import SignaturePad from '../../components/SignaturePad';

const STEPS = ['vehicleCheck', 'materials', 'odometer', 'cash', 'signature', 'confirm'];

export default function StartOfDayScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [currentStep, setCurrentStep] = useState(0);
  const [checkinId, setCheckinId] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Step data
  const [vehicleCheckData, setVehicleCheckData] = useState(null);
  const [odometerData, setOdometerData] = useState(null);
  const [cashData, setCashData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [supervisorName, setSupervisorName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);

  const signatureRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const v = await getVehicleByDriver(user?.id);
        setVehicle(v);
        const checkin = await getOrCreateTodayCheckin(user?.id, v?.id);
        if (checkin) {
          setCheckinId(checkin.id);

          if (checkin.status === 'completed') {
            setReadOnly(true);
          }

          // Restore saved data from the checkin record
          if (checkin.vehicle_check) {
            try {
              const parsedChecks = JSON.parse(checkin.vehicle_check);
              setVehicleCheckData({ checks: parsedChecks, notes: checkin.notes || '' });
            } catch {
              // Try loading from vehicle_check_items table
              const items = await getVehicleCheckItems(checkin.id);
              if (items?.length) {
                const checks = items.map((it) => ({ key: it.question, checked: !!it.is_ok }));
                setVehicleCheckData({ checks, notes: checkin.notes || '' });
              }
            }
          } else {
            const items = await getVehicleCheckItems(checkin.id);
            if (items?.length) {
              const checks = items.map((it) => ({ key: it.question, checked: !!it.is_ok }));
              setVehicleCheckData({ checks, notes: checkin.notes || '' });
            }
          }

          if (checkin.odometer_reading != null) {
            const reading = String(checkin.odometer_reading);
            setOdometerData({ reading, value: checkin.odometer_reading });
          }

          if (checkin.cash_amount != null) {
            const amount = String(checkin.cash_amount);
            setCashData({ amount, value: checkin.cash_amount });
          }

          if (checkin.signature_data) {
            setSignatureData(checkin.signature_data);
            setHasSignature(true);
          }

          if (checkin.supervisor_name) {
            setSupervisorName(checkin.supervisor_name);
          }

          // Restore to saved step (only for in-progress)
          if (checkin.status !== 'completed' && checkin.current_step != null && checkin.current_step > 0) {
            setCurrentStep(checkin.current_step);
          }
        }
      } catch (e) {
        console.error('SOD init error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // Re-check materials status on focus (after returning from LoadingTripScreen)
  useFocusEffect(
    useCallback(() => {
      hasVerifiedLoadingTrip(user?.id).then(setMaterialsLoaded).catch(() => {});
    }, [user?.id])
  );

  const animateStep = (direction) => {
    slideAnim.setValue(direction > 0 ? 300 : -300);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  };

  // Save step data to DB after each transition
  const saveStepData = async (stepName) => {
    if (!checkinId || readOnly) return;
    try {
      switch (stepName) {
        case 'vehicleCheck':
          if (vehicleCheckData?.checks) {
            await updateTourCheckin(checkinId, {
              vehicle_check: JSON.stringify(vehicleCheckData.checks),
              notes: vehicleCheckData.notes || null,
            });
            await saveVehicleCheckItems(
              checkinId,
              vehicleCheckData.checks.map((c) => ({
                question: c.key,
                answer: c.checked ? 'yes' : 'no',
                is_ok: c.checked,
              }))
            );
          }
          break;
        case 'odometer':
          if (odometerData?.value != null) {
            await updateTourCheckin(checkinId, { odometer_reading: odometerData.value });
          }
          break;
        case 'cash':
          if (cashData?.value != null) {
            await updateTourCheckin(checkinId, { cash_amount: cashData.value });
          }
          break;
        case 'signature':
          if (signatureData) {
            await updateTourCheckin(checkinId, {
              signature_data: signatureData,
              supervisor_name: supervisorName || null,
            });
          }
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('SOD save step error:', e);
    }
  };

  const goNext = async () => {
    if (currentStep < STEPS.length - 1) {
      // Validate current step
      if (STEPS[currentStep] === 'odometer' && !odometerData?.value) {
        Alert.alert('', t('odometerScreen.invalid'));
        return;
      }

      // Save the current step's data before advancing
      await saveStepData(STEPS[currentStep]);

      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      animateStep(1);

      // Persist current_step
      if (checkinId && !readOnly) {
        updateTourCheckin(checkinId, { current_step: nextStep }).catch(() => {});
      }
    }
  };

  const goBack = async () => {
    if (currentStep > 0) {
      // Save current step data before going back (non-read-only)
      if (!readOnly) {
        await saveStepData(STEPS[currentStep]);
      }
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      animateStep(-1);

      if (checkinId && !readOnly) {
        updateTourCheckin(checkinId, { current_step: prevStep }).catch(() => {});
      }
    } else {
      navigation.goBack();
    }
  };

  const handleSignatureChange = useCallback((hasSig, data) => {
    setHasSignature(hasSig);
    if (data) setSignatureData(data);
  }, []);

  const handleFinish = async () => {
    if (readOnly) return;
    try {
      // Save signature step data first
      await saveStepData('signature');

      // Final update: mark as completed with all data
      await updateTourCheckin(checkinId, {
        status: 'completed',
        vehicle_check: vehicleCheckData ? JSON.stringify(vehicleCheckData.checks) : null,
        odometer_reading: odometerData?.value || null,
        cash_amount: cashData?.value || null,
        signature_data: signatureData || null,
        supervisor_name: supervisorName || null,
        notes: vehicleCheckData?.notes || null,
        current_step: STEPS.length - 1,
      });

      // Ensure vehicle check items are saved
      if (vehicleCheckData?.checks) {
        await saveVehicleCheckItems(
          checkinId,
          vehicleCheckData.checks.map((c) => ({
            question: c.key,
            answer: c.checked ? 'yes' : 'no',
            is_ok: c.checked,
          }))
        );
      }

      Alert.alert(t('startOfDay.tourStarted'), t('startOfDay.tourStartedMsg'));
      setReadOnly(true);
    } catch (e) {
      console.error('SOD finish error:', e);
      Alert.alert(t('common.error'), e.message);
    }
  };

  const renderStep = () => {
    switch (STEPS[currentStep]) {
      case 'vehicleCheck':
        return <VehicleCheckStep data={vehicleCheckData} onUpdate={setVehicleCheckData} readOnly={readOnly} />;
      case 'materials':
        return (
          <View style={styles.centeredStep}>
            <Ionicons
              name={materialsLoaded ? 'checkmark-circle' : 'cube-outline'}
              size={64}
              color={materialsLoaded ? '#34C759' : COLORS.accent}
            />
            <Text style={styles.stepTitle}>{t('tourConfirm.materialsLoaded')}</Text>
            <Text style={styles.stepSubtitle}>
              {materialsLoaded
                ? t('tourConfirm.passed')
                : t('tourConfirm.notDone')}
            </Text>
            {!materialsLoaded && !readOnly && (
              <TouchableOpacity
                style={styles.loadBtn}
                onPress={() => navigation.navigate('LoadingTrip')}
              >
                <Text style={styles.loadBtnText}>{t('nav.loadingTrip')}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      case 'odometer':
        return <OdometerStep data={odometerData} onUpdate={setOdometerData} readOnly={readOnly} />;
      case 'cash':
        return <CheckOutCashStep data={cashData} onUpdate={setCashData} readOnly={readOnly} />;
      case 'signature':
        if (readOnly && signatureData) {
          return (
            <View style={styles.signatureStep}>
              <View style={styles.header}>
                <Ionicons name="create-outline" size={32} color={COLORS.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.stepTitle}>{t('tourConfirm.signature')}</Text>
                  <Text style={styles.stepSubtitle}>{t('signatureScreen.shipmentConfirmation')}</Text>
                </View>
              </View>
              <View style={styles.signatureImageWrap}>
                <Image
                  source={{ uri: signatureData }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          );
        }
        return (
          <View style={styles.signatureStep}>
            <View style={styles.header}>
              <Ionicons name="create-outline" size={32} color={COLORS.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.stepTitle}>{t('tourConfirm.signature')}</Text>
                <Text style={styles.stepSubtitle}>{t('signatureScreen.shipmentConfirmation')}</Text>
              </View>
            </View>
            <SignaturePad
              ref={signatureRef}
              label={t('tourConfirm.signature')}
              height={200}
              onSignChange={handleSignatureChange}
            />
          </View>
        );
      case 'confirm':
        return (
          <View style={styles.confirmStep}>
            <Ionicons name="rocket-outline" size={48} color={COLORS.primary} />
            <Text style={[styles.stepTitle, { marginTop: 16 }]}>{t('tourConfirm.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('tourConfirm.subtitle')}</Text>

            <View style={styles.summaryCard}>
              <SummaryRow
                icon="car-sport-outline"
                label={t('tourConfirm.vehicleCheck')}
                value={vehicleCheckData?.checks?.every((c) => c.checked) ? t('tourConfirm.passed') : t('tourConfirm.notDone')}
                ok={vehicleCheckData?.checks?.every((c) => c.checked)}
              />
              <SummaryRow
                icon="cube-outline"
                label={t('tourConfirm.materialsLoaded')}
                value={materialsLoaded ? t('tourConfirm.passed') : t('tourConfirm.notDone')}
                ok={materialsLoaded}
              />
              <SummaryRow
                icon="speedometer-outline"
                label={t('tourConfirm.odometer')}
                value={odometerData?.value ? `${odometerData.value} ${t('tourConfirm.km')}` : t('tourConfirm.notDone')}
                ok={!!odometerData?.value}
              />
              <SummaryRow
                icon="cash-outline"
                label={t('tourConfirm.cashOnHand')}
                value={cashData?.value != null ? `${cashData.value} ₽` : t('tourConfirm.notDone')}
                ok={cashData?.value != null}
              />
              <SummaryRow
                icon="create-outline"
                label={t('tourConfirm.signature')}
                value={hasSignature ? t('tourConfirm.passed') : t('tourConfirm.notDone')}
                ok={hasSignature}
              />
            </View>

            <Text style={styles.readyText}>{t('tourConfirm.ready')}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  if (loading) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Read-only banner */}
      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
          <Text style={styles.readOnlyBannerText}>{t('startOfDay.readOnlyBanner')}</Text>
        </View>
      )}

      {/* Progress indicator */}
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= currentStep && styles.progressDotActive,
              i === currentStep && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepIndicator}>
        {t('startOfDay.step', { current: currentStep + 1, total: STEPS.length })}
      </Text>

      {/* Step content */}
      <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
        {renderStep()}
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backBtnText}>{t('startOfDay.back')}</Text>
        </TouchableOpacity>

        {isLastStep ? (
          readOnly ? (
            <View style={[styles.finishBtn, styles.finishBtnDisabled]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.finishBtnText}>{t('startOfDay.routeStarted')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
              <Ionicons name="rocket" size={20} color={COLORS.white} />
              <Text style={styles.finishBtnText}>{t('startOfDay.finish')}</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextBtnText}>{t('startOfDay.next')}</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ icon, label, value, ok }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={22} color={ok ? '#34C759' : COLORS.textSecondary} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, ok && styles.summaryValueOk]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  progressRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingTop: 12, paddingHorizontal: 16,
  },
  progressDot: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
  },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressDotCurrent: { backgroundColor: COLORS.primary, height: 5 },
  stepIndicator: {
    textAlign: 'center', fontSize: 12, color: COLORS.textSecondary,
    marginTop: 8, marginBottom: 4,
  },
  stepContent: { flex: 1 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 12,
    padding: 16, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  backBtnText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
  },
  nextBtnText: { fontSize: 15, color: COLORS.white, fontWeight: '700' },
  finishBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#34C759', borderRadius: 12, paddingVertical: 14,
  },
  finishBtnDisabled: {
    backgroundColor: COLORS.textSecondary, opacity: 0.8,
  },
  finishBtnText: { fontSize: 15, color: COLORS.white, fontWeight: '700' },
  // Step styles
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  centeredStep: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  stepSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  loadBtn: {
    marginTop: 20, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  loadBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  signatureStep: { flex: 1, padding: 16 },
  confirmStep: { flex: 1, padding: 16, alignItems: 'center' },
  summaryCard: {
    width: '100%', backgroundColor: COLORS.white, borderRadius: 16,
    padding: 16, marginTop: 20, gap: 14,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  summaryValue: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  summaryValueOk: { color: '#34C759' },
  readyText: {
    fontSize: 13, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: 20, paddingHorizontal: 20,
  },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 16,
  },
  readOnlyBannerText: {
    color: COLORS.white, fontSize: 13, fontWeight: '600',
  },
  signatureImageWrap: {
    borderWidth: 2, borderColor: COLORS.border, borderRadius: 12,
    overflow: 'hidden', backgroundColor: '#fff', height: 200,
  },
  signatureImage: {
    width: '100%', height: '100%',
  },
});
