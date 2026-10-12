import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppGroup, LIMITS, Policy } from '../model';
import { useTheme } from '../theme';
import { AppIcon, Button, Toggle } from '../components';
import { ios } from '../constants';
import type { AppController } from '../useAppController';

export function GroupDialog({ controller }: { controller: AppController }) {
  const { s } = useTheme();
  const { config, editingGroup, saving, update, closeAfter } = controller;
  const [name, setName] = useState(editingGroup?.name || 'My group');
  const [policy, setPolicy] = useState<Policy>(editingGroup?.policy || 'always');
  const [minutes, setMinutes] = useState(String(editingGroup?.dailyMinutes || 15));
  const [members, setMembers] = useState(() =>
    config.apps.filter((a) => editingGroup && a.groupId === editingGroup.id).map((a) => a.id),
  );
  const valid =
    name.trim().length > 0 &&
    /^\d+$/.test(minutes) &&
    Number(minutes) >= 1 &&
    Number(minutes) <= 180;
  const save = () => {
    const group: AppGroup = {
      id: editingGroup?.id || `group_${Date.now()}`,
      name: name.trim(),
      policy,
      dailyMinutes: Number(minutes),
    };
    void update((c) => ({
      ...c,
      groups: editingGroup
        ? (c.groups || []).map((g) => (g.id === group.id ? group : g))
        : [...(c.groups || []), group],
      apps: c.apps.map((a) =>
        members.includes(a.id)
          ? { ...a, groupId: group.id }
          : a.groupId === group.id
            ? { ...a, groupId: undefined }
            : a,
      ),
    })).then(closeAfter);
  };
  return (
    <>
      <Text style={s.modalTitle}>
        {editingGroup ? 'Your group, your rules.' : 'A boundary together.'}
      </Text>
      <Text style={s.body}>
        Each app belongs to one group. Focus sessions and routines apply to every group.
      </Text>
      <Text style={s.fieldLabel}>GROUP NAME</Text>
      <TextInput
        accessibilityLabel="Group name"
        style={s.input}
        value={name}
        onChangeText={setName}
        maxLength={LIMITS.labelLength}
        editable={!saving}
      />
      <Text style={s.fieldLabel}>WHEN TO BLOCK</Text>
      {(
        [
          ['always', 'Always'],
          ['scheduled', 'During focus time'],
          ['budget', 'After a daily allowance'],
        ] as const
      ).map(([value, label]) => (
        <Pressable
          key={value}
          accessibilityRole="radio"
          accessibilityState={{ checked: policy === value }}
          disabled={saving}
          onPress={() => setPolicy(value)}
          style={s.policyRow}
        >
          <View style={[s.radio, policy === value && s.radioSelected]}>
            {policy === value && <View style={s.radioInner} />}
          </View>
          <Text style={s.cardTitle}>{label}</Text>
        </Pressable>
      ))}
      {policy === 'budget' && (
        <>
          <Text style={s.fieldLabel}>MINUTES PER DAY (1–180)</Text>
          <TextInput
            accessibilityLabel="Group daily allowance"
            style={s.input}
            keyboardType="number-pad"
            value={minutes}
            onChangeText={setMinutes}
            maxLength={3}
            editable={!saving}
          />
          <Text style={s.hint}>
            Usage is shared within this group and resets at midnight. Moving an app also moves its
            recorded usage today.
          </Text>
        </>
      )}
      {!ios ? (
        <>
          <Text style={s.fieldLabel}>APPS</Text>
          <Text style={s.small}>
            Selecting an app moves it out of its previous group. Its Off / Short videos / Entire app
            setting stays the same.
          </Text>
          {config.apps.map((a) => (
            <View key={a.id} style={s.appRow}>
              <AppIcon app={a} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{a.name}</Text>
                <Text style={s.small}>
                  {config.groups?.find((g) => g.id === a.groupId)?.name || 'Default group'}
                  {a.mode === 'off' ? ' · Off' : ''}
                </Text>
              </View>
              <Toggle
                label={`Include ${a.name} in this group`}
                disabled={saving}
                value={members.includes(a.id)}
                onChange={(checked) =>
                  setMembers((current) =>
                    checked ? [...current, a.id] : current.filter((id) => id !== a.id),
                  )
                }
              />
            </View>
          ))}
        </>
      ) : (
        <Text style={s.hint}>
          Save this group, then choose its apps using Apple’s private Screen Time picker.
        </Text>
      )}
      <Button title="Save group" disabled={saving || !valid} onPress={save} />
      {editingGroup && (
        <View style={{ marginTop: 12 }}>
          <Button
            title="Delete group · move apps to default"
            secondary
            disabled={saving}
            onPress={() =>
              void update((c) => ({
                ...c,
                groups: c.groups?.filter((g) => g.id !== editingGroup.id),
                apps: c.apps.map((a) =>
                  a.groupId === editingGroup.id ? { ...a, groupId: undefined } : a,
                ),
              })).then(closeAfter)
            }
          />
        </View>
      )}
    </>
  );
}
