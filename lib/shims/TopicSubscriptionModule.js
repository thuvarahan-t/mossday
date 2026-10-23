import { requireOptionalNativeModule } from 'expo';

const fallback = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

const nativeModule = typeof requireOptionalNativeModule === 'function'
  ? requireOptionalNativeModule('ExpoTopicSubscriptionModule')
  : null;

export default nativeModule ?? fallback;

