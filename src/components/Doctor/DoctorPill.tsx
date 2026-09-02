import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius, Spacing, ms, fs } from '../../theme';

interface DoctorPillProps {
  label: string;
  color: string;
  bg: string;
}

/** Small colored pill used for status / urgency / severity badges. */
const DoctorPill: React.FC<DoctorPillProps> = ({ label, color, bg }) => (
  <View style={[styles.pill, { backgroundColor: bg }]}>
    <Text style={[styles.text, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.sm,
    paddingVertical: ms(4),
  },
  text: {
    fontSize: fs(11),
    fontWeight: '700',
  },
});

export default DoctorPill;
