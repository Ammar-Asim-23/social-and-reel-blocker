import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { ArrowRight, Smartphone } from 'lucide-react-native';
import { AppRule } from './model';
import { s, C } from './styles';
export const feedNames: Record<string, string> = {
  youtube: 'Shorts',
  instagram: 'Reels',
  tiktok: 'Short videos · experimental',
  snapchat: 'Spotlight',
};
const colors: Record<string, string> = {
  youtube: '#FCE5DD',
  instagram: '#EEE1EC',
  tiktok: '#E3E9E5',
  snapchat: '#F4EDBF',
};
export function Button({
  title,
  onPress,
  secondary,
  disabled,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondaryButton,
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: C.ink }]}>{title}</Text>
      {!secondary && <ArrowRight size={17} color="white" />}
    </Pressable>
  );
}
export function Toggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Switch
      accessibilityLabel={label}
      disabled={disabled}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: '#DDE1D7', true: '#729564' }}
      thumbColor="white"
      ios_backgroundColor="#DDE1D7"
    />
  );
}
export function Tag({ children, warm }: { children: React.ReactNode; warm?: boolean }) {
  return (
    <View style={[s.tag, warm && { backgroundColor: '#F8EBDE' }]}>
      <View style={[s.dot, warm && { backgroundColor: '#C38C55' }]} />
      <Text style={s.tagText}>{children}</Text>
    </View>
  );
}
export function AppIcon({ app }: { app: AppRule }) {
  return (
    <View style={[s.appIcon, { backgroundColor: colors[app.id] || C.green }]}>
      {app.id === 'youtube' ? (
        <View style={s.youtube}>
          <Text style={{ color: 'white', fontSize: 12 }}>▶</Text>
        </View>
      ) : app.id === 'instagram' ? (
        <View style={s.instagram}>
          <View style={s.instagramLens} />
        </View>
      ) : app.id === 'tiktok' ? (
        <Text style={{ fontSize: 29, fontWeight: '800', color: C.ink }}>♪</Text>
      ) : (
        <Smartphone size={23} color={C.ink} />
      )}
    </View>
  );
}
export function Section({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.sectionHeading}>
      <Text style={s.sectionTitle}>{title}</Text>
      {detail && (
        <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress}>
          <Text style={s.sectionDetail}>{detail}</Text>
        </Pressable>
      )}
    </View>
  );
}
