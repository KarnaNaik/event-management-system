module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      const rules = webpackConfig.module && webpackConfig.module.rules;
      if (!Array.isArray(rules)) {
        return webpackConfig;
      }

      for (const rule of rules) {
        if (rule.enforce === 'pre' && Array.isArray(rule.use)) {
          for (const useEntry of rule.use) {
            const loaderName = typeof useEntry === 'string' ? useEntry : useEntry && useEntry.loader;
            if (loaderName && loaderName.includes('source-map-loader')) {
              rule.exclude = /node_modules[\\/]html5-qrcode/;
            }
          }
        }
      }

      return webpackConfig;
    }
  }
};
