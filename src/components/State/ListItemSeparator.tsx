import React from 'react';
import { View } from 'react-native';

interface ListItemSeparatorProps {
  height?: number;
}

/** Thin spacer used as a FlatList/ScrollView item separator. */
const ListItemSeparator: React.FC<ListItemSeparatorProps> = ({ height = 8 }) => (
  <View style={{ height }} />
);

export default ListItemSeparator;
