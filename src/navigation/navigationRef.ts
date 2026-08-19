import { createNavigationContainerRef } from '@react-navigation/native';

/** Global navigation ref so non-UI services (notifications) can navigate. */
export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

/** Navigate from anywhere once the container is ready. */
export const navigate = (name: string, params?: object): void => {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as (n: string, p?: object) => void)(name, params);
  }
};
