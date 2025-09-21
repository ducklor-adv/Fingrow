import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Svg, { Rect, G } from 'react-native-svg';

// Simple QR Code pattern generator (for demo purposes)
const generateQRPattern = (data) => {
  // This is a simplified QR code pattern for demo
  // In a real app, you'd use a proper QR code library
  const size = 21;
  const pattern = [];

  for (let i = 0; i < size; i++) {
    pattern[i] = [];
    for (let j = 0; j < size; j++) {
      // Create a pseudo-random pattern based on the data
      const hash = data.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);

      const shouldFill = (i + j + hash) % 3 === 0 ||
                        (i < 7 && j < 7) ||
                        (i < 7 && j > 13) ||
                        (i > 13 && j < 7);

      pattern[i][j] = shouldFill;
    }
  }

  return pattern;
};

const QRCodeGenerator = ({ data, size = 200, onShare }) => {
  const pattern = generateQRPattern(data);
  const cellSize = size / 21;

  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(data);
      Alert.alert('สำเร็จ', 'คัดลอกลิงก์เรียบร้อยแล้ว');
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถคัดลอกได้');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.qrContainer, { width: size + 20, height: size + 20 }]}>
        <Svg width={size} height={size} style={styles.qrCode}>
          {pattern.map((row, i) =>
            row.map((cell, j) =>
              cell ? (
                <Rect
                  key={`${i}-${j}`}
                  x={j * cellSize}
                  y={i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#09090b"
                />
              ) : null
            )
          )}
        </Svg>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={copyToClipboard}>
          <Ionicons name="copy" size={20} color="#10b981" />
          <Text style={styles.controlText}>คัดลอกลิงก์</Text>
        </TouchableOpacity>

        {onShare && (
          <TouchableOpacity style={styles.controlButton} onPress={onShare}>
            <Ionicons name="share" size={20} color="#10b981" />
            <Text style={styles.controlText}>แชร์</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.linkText} numberOfLines={2}>
        {data}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  qrCode: {
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10b981',
    gap: 6,
  },
  controlText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  linkText: {
    color: '#a1a1aa',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default QRCodeGenerator;