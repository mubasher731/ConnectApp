/**
 * Jest setup: mock native modules that aren't available in the test env.
 */

// AsyncStorage v3 no longer ships a jest mock — provide an in-memory one.
const mockAsyncStorageStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key) => {
      const v = mockAsyncStorageStore.get(key);
      return v === undefined ? null : v;
    }),
    setItem: jest.fn(async (key, value) => {
      mockAsyncStorageStore.set(key, String(value));
    }),
    removeItem: jest.fn(async (key) => {
      mockAsyncStorageStore.delete(key);
    }),
    clear: jest.fn(async () => {
      mockAsyncStorageStore.clear();
    }),
    getAllKeys: jest.fn(async () => Array.from(mockAsyncStorageStore.keys())),
  },
}));

// react-native-vector-icons relies on native fonts — render as a plain Text.
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');

// react-native-worklets requires a native module — stub it out for tests.
jest.mock('react-native-worklets', () => {
  const noop = () => {};
  const identity = (v) => v;
  return {
    __esModule: true,
    init: noop,
    isBundleModeEnabled: () => false,
    toggleSlowAnimationsOnUIRuntime: noop,
    callMicrotasks: noop,
    isShareableRef: () => false,
    makeShareable: identity,
    makeShareableCloneOnUIRecursive: identity,
    makeShareableCloneRecursive: identity,
    shareableMappingCache: new Map(),
    getDynamicFeatureFlag: () => undefined,
    getStaticFeatureFlag: () => undefined,
    setDynamicFeatureFlag: noop,
    isShareable: () => false,
    isSynchronizable: () => false,
    createSerializable: identity,
    isSerializableRef: () => false,
    registerCustomSerializable: noop,
    serializableMappingCache: new Map(),
    createShareable: identity,
    createSynchronizable: identity,
    getRuntimeKind: () => 'react-native',
    isRNRuntime: () => true,
    isUIRuntime: () => false,
    isWorkerRuntime: () => false,
    isWorkletRuntime: () => false,
    scheduleOnUI: (fn) => {
      if (typeof fn === 'function') fn();
    },
    scheduleOnRN: (fn) => {
      if (typeof fn === 'function') fn();
    },
    runOnUISync: (fn) => {
      if (typeof fn === 'function') fn();
    },
  };
});

// react-native-reanimated ships a jest mock — use it.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
