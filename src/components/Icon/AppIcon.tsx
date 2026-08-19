import React from 'react';
import Ionicon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';

interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
}

/** Thin wrapper around Ionicons so icon usage stays consistent app-wide. */
const AppIcon: React.FC<AppIconProps> = ({ name, size = 22, color = Colors.text }) => (
  <Ionicon name={name} size={size} color={color} />
);

export default AppIcon;
