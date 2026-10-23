const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
// SQLite's web worker needs WASM assets and cross-origin isolation in local previews.
if (!config.resolver.assetExts.includes('wasm')) config.resolver.assetExts.push('wasm');
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const nextMiddleware = enhance ? enhance(middleware, server) : middleware;
  return (request, response, next) => {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    return nextMiddleware(request, response, next);
  };
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // SDK 58's topic module is absent in Expo Go. Keep the workaround Android-only
  // and scoped to expo-notifications; do not rewrite installed package files.
  if (platform === 'android' && context.originModulePath.includes('expo-notifications') &&
      /(?:^|\/)TopicSubscriptionModule(?:\.android)?$/.test(moduleName)) {
    return {
      filePath: path.resolve(__dirname, 'lib/shims/TopicSubscriptionModule.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
