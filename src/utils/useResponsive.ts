import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

/**
 * Bottom spacing for scrollable tab content.
 *
 * Uses the rendered tab bar rather than assuming a device-specific height, so
 * the last item remains reachable above gesture/navigation areas and notches.
 */
export function useTabBarClearance(extra = hp('2%')): number {
  const tabBarHeight = useBottomTabBarHeight();
  const { bottom } = useSafeAreaInsets();

  return Math.max(tabBarHeight + extra, bottom + hp('3%'));
}
