import { Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

function ExpenseWidget(_props: object, environment: WidgetEnvironment) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  return <VStack alignment="leading" spacing={5} modifiers={[
    frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
    containerBackground(dark ? '#192E23' : '#174A34', 'widget'),
    widgetURL('mossday:///expenses?compose=1'),
  ]}>
    <Image systemName="plus.circle.fill" modifiers={[font({ size: 31 }), foregroundStyle('#BFECCA')]} />
    <Spacer minLength={0} />
    <Text modifiers={[font({ size: 19, weight: 'bold' }), lineLimit(2), foregroundStyle('#F5FFF6')]}>Add expense</Text>
    <Text modifiers={[font({ size: 12, weight: 'medium' }), lineLimit(1), foregroundStyle('#BFECCA')]}>Quick entry</Text>
  </VStack>;
}

export default createWidget('MossdayExpense', ExpenseWidget, {});
