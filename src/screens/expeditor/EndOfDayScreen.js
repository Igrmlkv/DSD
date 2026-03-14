import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Animated, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import useAuthStore from '../../store/authStore';
import {
  updateTourCheckin, saveVehicleCheckItems, getVehicleByDriver,
  getOrCreateTodayEndCheckin, getVehicleCheckItems,
  getUnloadingData, getTodayPaymentsTotal, getTodayTourCheckin,
} from '../../database';
import MaterialCheckInStep from './MaterialCheckInStep';
import CashCheckInStep from './CashCheckInStep';
import OdometerStep from './OdometerStep';
import VehicleCheckStep from './VehicleCheckStep';
import SignaturePad from '../../components/SignaturePad';

const STEPS = ['materialCheckIn', 'cashCheckIn', 'odometer', 'vehicleCheck', 'signature', 'confirm'];

export default function EndOfDayScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [currentStep, setCurrentStep] = useState(0);
  const [checkinId, setCheckinId] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // External data
  const [unloadingData, setUnloadingData] = useState(null);
  const [expectedCashAmount, setExpectedCashAmount] = useState(0);
  const [startOdometer, setStartOdometer] = useState(null);

  // Step data
  const [materialData, setMaterialData] = useState(null);
  const [cashData, setCashData] = useState(null);
  const [vehicleCheckData, setVehicleCheckData] = useState(null);
  const [odometerData, setOdometerData] = useState(null);
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

        // Load unloading data for material check-in
        if (v?.id) {
          const uData = await getUnloadingData(v.id, user?.id);
          setUnloadingData(uData);
        }

        // Load expected cash total
        const cashTotal = await getTodayPaymentsTotal(user?.id);
        setExpectedCashAmount(cashTotal);

        // Load start-of-day odometer for validation
        const startCheckin = await getTodayTourCheckin(user?.id, 'start');
        if (startCheckin?.odometer_reading) {
          setStartOdometer(startCheckin.odometer_reading);
        }

        const checkin = await getOrCreateTodayEndCheckin(user?.id, v?.id);
        if (checkin) {
          setCheckinId(checkin.id);

          if (checkin.status === 'completed') {
            setReadOnly(true);
          }

          // Restore material check-in data
          if (checkin.material_check_data) {
            try {
              setMaterialData(JSON.parse(checkin.material_check_data));
            } catch { /* ignore */ }
          }

          // Restore cash data
          if (checkin.cash_amount != null) {
            setCashData({
              expectedAmount: cashTotal,
              actualAmount: String(checkin.cash_amount),
              value: checkin.cash_amount,
              discrepancy: checkin.cash_amount - cashTotal,
              notes: checkin.notes || '',
            });
          }

          // Restore vehicle check data
          if (checkin.vehicle_check) {
            try {
              const parsedChecks = JSON.parse(checkin.vehicle_check);
              setVehicleCheckData({ checks: parsedChecks, notes: checkin.notes || '' });
            } catch {
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

          // Restore odometer
          if (checkin.odometer_reading != null) {
            const reading = String(checkin.odometer_reading);
            setOdometerData({ reading, value: checkin.odometer_reading });
          }

          // Restore signature
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
        console.error('EOD init error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const animateStep = (direction) => {
    slideAnim.setValue(direction > 0 ? 300 : -300);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  };

  const saveStepData = async (stepName) => {
    if (!checkinId || readOnly) return;
    try {
      switch (stepName) {
        case 'materialCheckIn':
          if (materialData) {
            await updateTourCheckin(checkinId, {
              material_check_data: JSON.stringify(materialData),
            });
          }
          break;
        case 'cashCheckIn':
          if (cashData?.value != null) {
            await updateTourCheckin(checkinId, { cash_amount: cashData.value });
          }
          break;
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
      console.error('EOD save step error:', e);
    }
  };

  const goNext = async () => {
    if (currentStep < STEPS.length - 1) {
      if (STEPS[currentStep] === 'odometer' && !odometerData?.value) {
        Alert.alert('', t('odometerScreen.invalid'));
        return;
      }
      if (STEPS[currentStep] === 'odometer' && startOdometer != null && odometerData?.value < startOdometer) {
        Alert.alert('', t('odometerScreen.lessThanStart', { value: startOdometer }));
        return;
      }

      await saveStepData(STEPS[currentStep]);

      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      animateStep(1);

      if (checkinId && !readOnly) {
        updateTourCheckin(checkinId, { current_step: nextStep }).catch(() => {});
      }
    }
  };

  const goBack = async () => {
    if (currentStep > 0) {
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
      await saveStepData('signature');

      await updateTourCheckin(checkinId, {
        status: 'completed',
        material_check_data: materialData ? JSON.stringify(materialData) : null,
        vehicle_check: vehicleCheckData ? JSON.stringify(vehicleCheckData.checks) : null,
        odometer_reading: odometerData?.value || null,
        cash_amount: cashData?.value || null,
        signature_data: signatureData || null,
        supervisor_name: supervisorName || null,
        notes: vehicleCheckData?.notes || null,
        current_step: STEPS.length - 1,
      });

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

      Alert.alert(t('endOfDay.routeCompleted'), t('endOfDay.routeCompletedMsg'), [
        { text: 'OK', onPress: () => navigation.navigate(SCREEN_NAMES.EXPEDITOR_HOME) },
      ]);
      setReadOnly(true);
    } catch (e) {
      console.error('EOD finish error:', e);
      Alert.alert(t('common.error'), e.message);
    }
  };

  const renderStep = () => {
    switch (STEPS[currentStep]) {
      case 'materialCheckIn':
        return (
          <MaterialCheckInStep
            data={materialData}
            onUpdate={setMaterialData}
            readOnly={readOnly}
            unloadingData={unloadingData}
          />
        );
      case 'cashCheckIn':
        return (
          <CashCheckInStep
            data={cashData}
            onUpdate={setCashData}
            readOnly={readOnly}
            expectedAmount={expectedCashAmount}
          />
        );
      case 'odometer':
        return <OdometerStep data={odometerData} onUpdate={setOdometerData} readOnly={readOnly} minReading={startOdometer} />;
      case 'vehicleCheck':
        return <VehicleCheckStep data={vehicleCheckData} onUpdate={setVehicleCheckData} readOnly={readOnly} />;
      case 'signature':
        if (readOnly && signatureData) {
          return (
            <View style={styles.signatureStep}>
              <View style={styles.header}>
                <Ionicons name="create-outline" size={32} color={COLORS.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.stepTitle}>{t('endOfDayConfirm.signature')}</Text>
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
                <Text style={styles.stepTitle}>{t('endOfDayConfirm.signature')}</Text>
                <Text style={styles.stepSubtitle}>{t('signatureScreen.shipmentConfirmation')}</Text>
              </View>
            </View>
            <SignaturePad
              ref={signatureRef}
              label={t('endOfDayConfirm.signature')}
              height={200}
              onSignChange={handleSignatureChange}
            />
          </View>
        );
      case 'confirm':
        return (
          <View style={styles.confirmStep}>
            <Ionicons name="moon-outline" size={48} color={COLORS.primary} />
            <Text style={[styles.stepTitle, { marginTop: 16 }]}>{t('endOfDayConfirm.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('endOfDayConfirm.subtitle')}</Text>

            <View style={styles.summaryCard}>
              <SummaryRow
                icon="cube-outline"
                label={t('endOfDayConfirm.materialCheckIn')}
                value={materialData?.items?.length > 0 ? t('endOfDayConfirm.passed') : t('endOfDayConfirm.notDone')}
                ok={materialData?.items?.length > 0}
              />
              <SummaryRow
                icon="cash-outline"
                label={t('endOfDayConfirm.cashCheckIn')}
                value={cashData?.value != null ? `${cashData.value} ₽` : t('endOfDayConfirm.notDone')}
                ok={cashData?.value != null}
              />
              <SummaryRow
                icon="speedometer-outline"
                label={t('endOfDayConfirm.odometer')}
                value={odometerData?.value ? `${odometerData.value} ${t('endOfDayConfirm.km')}` : t('endOfDayConfirm.notDone')}
                ok={!!odometerData?.value}
              />
              <SummaryRow
                icon="car-sport-outline"
                label={t('endOfDayConfirm.vehicleCheck')}
                value={vehicleCheckData?.checks?.every((c) => c.checked) ? t('endOfDayConfirm.passed') : t('endOfDayConfirm.notDone')}
                ok={vehicleCheckData?.checks?.every((c) => c.checked)}
              />
              <SummaryRow
                icon="create-outline"
                label={t('endOfDayConfirm.signature')}
                value={hasSignature ? t('endOfDayConfirm.passed') : t('endOfDayConfirm.notDone')}
                ok={hasSignature}
              />
            </View>

            <Text style={styles.readyText}>{t('endOfDayConfirm.ready')}</Text>
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
          <Text style={styles.readOnlyBannerText}>{t('endOfDay.readOnlyBanner')}</Text>
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
        {t('endOfDay.step', { current: currentStep + 1, total: STEPS.length })}
      </Text>

      {/* Step content */}
      <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
        {renderStep()}
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backBtnText}>{t('endOfDay.back')}</Text>
        </TouchableOpacity>

        {isLastStep ? (
          readOnly ? (
            <View style={[styles.finishBtn, styles.finishBtnDisabled]}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.finishBtnText}>{t('endOfDay.routeFinished')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
              <Ionicons name="moon" size={20} color={COLORS.white} />
              <Text style={styles.finishBtnText}>{t('endOfDay.finish')}</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextBtnText}>{t('endOfDay.next')}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  stepSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
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
