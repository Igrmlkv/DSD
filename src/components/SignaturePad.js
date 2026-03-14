import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const SignaturePad = forwardRef(({ label, height = 200, onSignChange }, ref) => {
  const signRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);

  useImperativeHandle(ref, () => ({
    getSignature: () =>
      new Promise((resolve) => {
        if (!hasSignature) {
          resolve(null);
          return;
        }
        signRef.current?.readSignature();
        // getData is called via onOK callback
        resolve('__pending__');
      }),
    readSignature: () => signRef.current?.readSignature(),
    clearSignature: () => {
      signRef.current?.clearSignature();
      setHasSignature(false);
      onSignChange?.(false);
    },
    hasSignature: () => hasSignature,
  }));

  const handleOK = (signature) => {
    // signature is a base64 data URI
    if (onSignChange) onSignChange(true, signature);
  };

  const handleBegin = () => {
    if (!hasSignature) {
      setHasSignature(true);
      onSignChange?.(true);
    }
  };

  const handleClear = () => {
    signRef.current?.clearSignature();
    setHasSignature(false);
    onSignChange?.(false);
  };

  const webStyle = `.m-signature-pad {
    box-shadow: none; border: none; margin: 0; padding: 0;
  }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; }
  body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
  canvas { width: 100% !important; height: 100% !important; }`;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.canvasWrap, { height }]}>
        <SignatureCanvas
          ref={signRef}
          onOK={handleOK}
          onBegin={handleBegin}
          webStyle={webStyle}
          backgroundColor="rgb(255,255,255)"
          penColor={COLORS.text}
          minWidth={1.5}
          maxWidth={3}
          dotSize={2}
          trimWhitespace
          imageType="image/png"
        />
        {!hasSignature && (
          <View style={styles.placeholder} pointerEvents="none">
            <Ionicons name="create-outline" size={28} color={COLORS.tabBarInactive} />
          </View>
        )}
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear} hitSlop={8}>
          <Ionicons name="close-circle" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 12 },
  label: {
    fontSize: 14, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: 6,
  },
  canvasWrap: {
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.4,
  },
  clearBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
  },
});
