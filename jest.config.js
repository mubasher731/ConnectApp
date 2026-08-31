module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-reanimated|react-native-worklets|react-native-screens|react-native-safe-area-context|react-native-vector-icons|react-native-gesture-handler|react-native-responsive-screen|react-native-keyboard-aware-scroll-view)/)',
  ],
};
