const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = function withAndroidExpenseWidget(config) {
  const applicationId = config.android.package;
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    const name = `${applicationId}.ExpenseWidgetProvider`;
    application.receiver ??= [];
    if (!application.receiver.some((entry) => entry.$['android:name'] === name)) {
      application.receiver.push({
        $: { 'android:name': name, 'android:exported': 'false', 'android:label': 'Quick Add Expense' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/mossday_expense_widget' } }],
      });
    }
    return config;
  });
  return withDangerousMod(config, ['android', async (config) => {
    const main = path.join(config.modRequest.platformProjectRoot, 'app/src/main');
    const sources = path.dirname(require.resolve('./android-widget/layout.xml'));
    const files = {
      'ExpenseWidgetProvider.kt': path.join('java', ...applicationId.split('.'), 'ExpenseWidgetProvider.kt'),
      'layout.xml': 'res/layout/mossday_expense_widget.xml',
      'provider.xml': 'res/xml/mossday_expense_widget.xml',
      'background.xml': 'res/drawable/mossday_expense_background.xml',
      'background-night.xml': 'res/drawable-night/mossday_expense_background.xml',
    };
    await Promise.all(Object.entries(files).map(async ([file, destination]) => {
      const target = path.join(main, destination);
      const source = await fs.readFile(path.join(sources, file), 'utf8');
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, source.replaceAll('__APPLICATION_ID__', applicationId));
    }));
    return config;
  }]);
};
